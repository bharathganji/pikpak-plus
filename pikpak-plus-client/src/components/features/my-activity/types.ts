export interface LocalTask {
  id: string;
  url: string;
  status: string;
  timestamp: number;
  name?: string;
  file_size?: string;
  file_type?: string;
}

export interface LocalShare {
  id: string;
  file_name: string;
  share_url: string;
  pass_code?: string;
  timestamp: number;
  file_id: string;
}

export const STORAGE_KEY = "pikpak_user_tasks";
export const SHARES_STORAGE_KEY = "pikpak_user_shares";
