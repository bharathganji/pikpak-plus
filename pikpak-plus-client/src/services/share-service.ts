import apiClient from "./api-client";
import { BulkDeleteResponse, ShareData } from "@/types/api";

export type { BulkDeleteResponse };

export interface SupabaseShareRecord {
  id: number;
  action: "share";
  user_email?: string;
  created_at: string;
  data: {
    file_id?: string;
    file_name?: string;
    share_id?: string;
    share_url?: string;
    pass_code?: string;
    expiration_days?: number;
    title?: string;
    is_existing?: boolean;
    [key: string]: any;
  };
}

export interface ShareListResponse {
  data: SupabaseShareRecord[];
  shares?: any[];
  count: number;
}

export interface RemoteShareItem extends ShareData {
  id?: string;
  created_at?: string;
  file_name?: string;
  is_existing?: boolean;
}

export const shareService = {
  /**
   * Create a share link with custom password and expiration options
   */
  async createShare(
    fileId: string,
    fileName?: string,
    needPassword: boolean = false,
    expirationDays: number = -1,
  ): Promise<ShareData> {
    const res = await apiClient.post<ShareData>("/share", {
      id: fileId,
      file_name: fileName,
      need_password: needPassword,
      expiration_days: expirationDays,
    });
    return res.data;
  },

  /**
   * List user's active shares from Supabase
   */
  async getShares(
    page: number = 1,
    limit: number = 100,
  ): Promise<ShareListResponse> {
    try {
      const res = await apiClient.get<ShareListResponse>("/shares", {
        params: { page, limit },
      });
      return {
        data: res.data?.data || [],
        shares: res.data?.shares || [],
        count: res.data?.count ?? (res.data?.data?.length || 0),
      };
    } catch (err) {
      console.error("Failed to fetch shares:", err);
      return { data: [], shares: [], count: 0 };
    }
  },

  /**
   * Delete or remove a user's share link from activity
   */
  async deleteShare(
    shareId: string | number,
  ): Promise<{ success: boolean; message?: string }> {
    const res = await apiClient.delete<{ success: boolean; message?: string }>(
      `/shares/${shareId}`,
    );
    return res.data;
  },

  /**
   * Alias for deleteShare for backward compatibility
   */
  async revokeShare(
    shareId: string | number,
  ): Promise<{ success: boolean; message?: string }> {
    return this.deleteShare(shareId);
  },

  /**
   * Delete multiple share links in a single bulk request
   */
  async deleteShares(ids: (number | string)[]): Promise<BulkDeleteResponse> {
    const res = await apiClient.delete<BulkDeleteResponse>("/shares/bulk", {
      data: { ids },
    });
    return res.data;
  },

  /**
   * Alias for deleteShares for backward compatibility
   */
  async revokeShares(ids: (number | string)[]): Promise<BulkDeleteResponse> {
    return this.deleteShares(ids);
  },
};

export default shareService;
