export interface LocalTask {
  id: string;
  url: string;
  status: string;
  timestamp: number;
  name?: string;
  file_size?: string;
  file_type?: string;
  file_id?: string;
}

export interface LocalShare {
  id: string;
  file_name: string;
  share_url: string;
  pass_code?: string;
  timestamp: number;
  file_id: string;
}

/** @deprecated Local storage persistence is superseded by TanStack Query and server activity. Kept for backwards compatibility. */
export const LOCAL_TASKS_STORAGE_KEY = "pikpak_user_tasks";
/** @deprecated Local storage persistence is superseded by TanStack Query and server activity. Kept for backwards compatibility. */
export const LOCAL_SHARES_STORAGE_KEY = "pikpak_user_shares";
