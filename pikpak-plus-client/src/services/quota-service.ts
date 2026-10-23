import apiClient from "./api-client";
import { QuotaResponse } from "@/types/api";

export interface CleanupStatus {
  last_cleanup?: string;
  next_cleanup?: string;
  interval_hours?: number;
  status?: string;
}

export interface WebDAVClient {
  client_id?: string;
  ip?: string;
  user_agent?: string;
  last_seen?: string;
  [key: string]: any;
}

export const quotaService = {
  /**
   * Get storage and transfer quota information
   */
  async getQuota(): Promise<QuotaResponse> {
    const res = await apiClient.get<QuotaResponse>("/quota");
    return res.data;
  },

  /**
   * Get server automated cleanup status and next trigger time
   */
  async getCleanupStatus(): Promise<CleanupStatus> {
    const res = await apiClient.get<CleanupStatus>("/cleanup/status");
    return res.data;
  },

  /**
   * Get currently active WebDAV client sessions
   */
  async getWebDAVClients(): Promise<WebDAVClient[]> {
    const res = await apiClient.get<WebDAVClient[] | { clients: WebDAVClient[] }>(
      "/webdav/active-clients"
    );
    if (Array.isArray(res.data)) {
      return res.data;
    }
    if (res.data && Array.isArray((res.data as any).clients)) {
      return (res.data as any).clients;
    }
    return [];
  },

  /**
   * Get registered WebDAV application credentials
   */
  async getWebDAVApplications(): Promise<any> {
    const res = await apiClient.get("/webdav/applications");
    return res.data;
  },
};

export default quotaService;
