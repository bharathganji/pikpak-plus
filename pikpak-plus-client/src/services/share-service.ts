import apiClient from "./api-client";
import { ShareData } from "@/types/api";

export interface RemoteShareItem extends ShareData {
  id?: string;
  created_at?: string;
  file_name?: string;
  is_existing?: boolean;
}

export const shareService = {
  /**
   * Create a remote share link with custom password and expiration options
   */
  async createShare(
    fileId: string,
    needPassword: boolean = false,
    expirationDays: number = -1
  ): Promise<ShareData> {
    const res = await apiClient.post<ShareData>("/share", {
      id: fileId,
      need_password: needPassword,
      expiration_days: expirationDays,
    });
    return res.data;
  },

  /**
   * List remote share links
   */
  async getShares(): Promise<RemoteShareItem[]> {
    try {
      const res = await apiClient.get<RemoteShareItem[] | { shares: RemoteShareItem[] }>("/shares");
      if (Array.isArray(res.data)) {
        return res.data;
      }
      if (res.data && Array.isArray((res.data as any).shares)) {
        return (res.data as any).shares;
      }
      return [];
    } catch {
      return [];
    }
  },

  /**
   * Revoke or delete a remote share link
   */
  async revokeShare(shareId: string): Promise<{ success: boolean; message?: string }> {
    const res = await apiClient.delete<{ success: boolean; message?: string }>(
      `/shares/${shareId}`
    );
    return res.data;
  },
};

export default shareService;
