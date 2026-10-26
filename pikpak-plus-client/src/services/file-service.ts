import apiClient from "./api-client";
import {
  FileItem,
  FileListResponse,
  DownloadResponse,
  CreateFolderResponse,
} from "@/types/api";

export interface DownloadUrlResult {
  url: string;
  file?: FileItem | DownloadResponse;
}

export const fileService = {
  /**
   * List files and folders with optional parent directory ID and pagination token
   */
  async listFiles(
    parentId?: string,
    pageToken?: string,
  ): Promise<FileListResponse> {
    const params = new URLSearchParams();
    if (parentId) params.append("parent_id", parentId);
    if (pageToken) params.append("page_token", pageToken);

    const queryString = params.toString();
    const endpoint = queryString ? `/files?${queryString}` : "/files";
    const res = await apiClient.get<FileListResponse>(endpoint);
    return res.data;
  },

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

  /**
   * Create a new folder inside parent directory
   */
  async createFolder(
    name: string,
    parentId?: string,
  ): Promise<CreateFolderResponse> {
    const res = await apiClient.post<CreateFolderResponse>("/files/folder", {
      name,
      parent_id: parentId || "",
    });
    return res.data;
  },

  /**
   * Delete or move a file to trash
   */
  async deleteFile(
    id: string,
  ): Promise<{ success: boolean; message?: string }> {
    const res = await apiClient.delete<{ success: boolean; message?: string }>(
      `/file/${id}`,
    );
    return res.data;
  },
};

export default fileService;
