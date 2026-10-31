import apiClient from "./api-client";
import { FileItem, DownloadResponse } from "@/types/api";

export const fileService = {
  /**
   * Get file metadata by file ID
   */
  async getFile(id: string): Promise<FileItem | DownloadResponse> {
    const res = await apiClient.get<FileItem | DownloadResponse>(`/file/${id}`);
    return res.data;
  },
};

export default fileService;
