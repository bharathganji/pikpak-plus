import apiClient from "./api-client";
import { FileItem, DownloadResponse } from "@/types/api";

export interface DownloadUrlResult {
  url: string;
  file?: FileItem | DownloadResponse;
}

export const fileService = {

  /**
   * Get file metadata and download links by file ID
   */
  async getFile(id: string): Promise<FileItem | DownloadResponse> {
    const res = await apiClient.get<FileItem | DownloadResponse>(`/file/${id}`);
    return res.data;
  },

  /**
   * Resolve direct download URL for a file (prioritizing octet-stream signed URL)
   */
  async getDownloadUrl(id: string): Promise<DownloadUrlResult> {
    try {
      // 1. Try dedicated download-url endpoint
      const res = await apiClient.post<{ url?: string; download_url?: string }>(
        "/file/download-url",
        { id },
      );
      if (res.data?.url || res.data?.download_url) {
        return { url: res.data.url || res.data.download_url || "" };
      }
    } catch (err) {
      console.error(err);
      // Fallback to resolving via getFile
    }

    // 2. Fallback to getFile metadata
    const file = await fileService.getFile(id);
    const octetStream = (file as DownloadResponse).links?.[
      "application/octet-stream"
    ]?.url;
    const webLink = file.web_content_link;
    const directUrl = octetStream || webLink || "";

    if (!directUrl) {
      throw new Error("Unable to resolve direct download URL for this file");
    }

    return { url: directUrl, file };
  },

  /**
   * Trigger direct browser download using resolved download URL
   */
  async downloadFile(id: string, fileName?: string): Promise<string> {
    const { url } = await fileService.getDownloadUrl(id);
    if (!url) {
      throw new Error("Download URL could not be resolved");
    }

    if (typeof window !== "undefined") {
      const link = document.createElement("a");
      link.href = url;
      if (fileName) {
        link.download = fileName;
      }
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }

    return url;
  },
};

export default fileService;
