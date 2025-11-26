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
}
