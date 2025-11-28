export interface WebDAVClient {
  planetName: string;
  planetEmoji: string;
  username: string;
  password: string;
  serverUrl: string;
  createdAt: string;
  expiresAt: string;
  ttlHours: number;
}

export interface WebDAVResponse {
  available: boolean;
  message: string;
  clients: WebDAVClient[];
  refresh_info?: RefreshInfo;
}

export interface RefreshInfo {
  quota_refresh_interval_seconds: number;
  quota_next_refresh: string;
  webdav_generation_interval_hours: number;
  webdav_next_refresh: string | null;
}
