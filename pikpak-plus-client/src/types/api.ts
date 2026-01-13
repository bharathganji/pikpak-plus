// PikPak API Response Types
// These types define the structure of responses from the PikPak API

// ============================================================================
// Core API Response Types
// ============================================================================

export interface ApiResponse {
  result: {
    upload_type: string;
    url?: {
      kind: string;
    };
    task: {
      kind: string;
      id: string;
      name: string;
      type: string;
      user_id: string;
      statuses: string[];
      status_size: number;
      params: {
        predict_speed: string;
        predict_type: string;
      };
      file_id: string;
      file_name: string;
      file_size: string;
      message: string;
      created_time: string;
      updated_time: string;
      third_task_id: string;
      phase: string;
      progress: number;
      icon_link: string;
      callback: string;
      reference_resource: any;
      space: string;
    };
  };
}

// ============================================================================
// Task & Download Types
// ============================================================================

export type ReferenceResource = {
  "@type": string;
  kind: string;
  id: string;
  parent_id: string;
  name: string;
  size: string;
  mime_type: string;
  icon_link: string;
  hash: string;
  phase: string;
  audit: null | any;
  thumbnail_link: string;
  params: {
    platform_icon: string;
    url: string;
  };
  space: string;
  medias: any[];
  starred: boolean;
  tags: any[];
};

export type Task = {
  kind: string;
  id: string;
  name: string;
  type: string;
  user_id: string;
  statuses: any[];
  status_size: number;
  params: {
    age: string;
    mime_type: string;
    predict_type: string;
    url: string;
  };
  file_id: string;
  file_name: string;
  file_size: string;
  message: string;
  created_time: string;
  updated_time: string;
  third_task_id: string;
  phase: string;
  progress: number;
  icon_link: string;
  callback: string;
  reference_resource: ReferenceResource | null;
  space: string;
};

export type DownloadListResponse = {
  tasks: Task[];
  next_page_token: string;
  expires_in: number;
};

// ============================================================================
// File Types
// ============================================================================

export type FileItem = {
  kind: string;
  id: string;
  parent_id: string;
  name: string;
  user_id: string;
  size: string;
  revision: string;
  file_extension: string;
  mime_type: string;
  starred: boolean;
  web_content_link: string;
  created_time: string;
  modified_time: string;
  icon_link: string;
  thumbnail_link: string;
  md5_checksum: string;
  hash: string;
  links: Record<string, any>;
  phase: string;
  audit: {
    status: string;
    message: string;
    title: string;
  };
  medias: any[];
  trashed: boolean;
  delete_time: string;
  original_url: string;
  params: {
    platform_icon: string;
    url: string;
  };
  original_file_index: number;
  space: string;
  apps: any[];
  writable: boolean;
  folder_type: string;
  collection: any;
  sort_name: string;
  user_modified_time: string;
  spell_name: string[];
  file_category: string;
  tags: string[];
  reference_events: any[];
  reference_resource: any;
};

export type FileListResponse = {
  kind: string;
  next_page_token: string;
  files: FileItem[];
  version: string;
  version_outdated: boolean;
  sync_time: string;
};

// ============================================================================
// Download Response Type
// ============================================================================

export interface DownloadResponse {
  kind: string;
  id: string;
  parent_id: string;
  name: string;
  user_id: string;
  size: string;
  revision: string;
  file_extension: string;
  mime_type: string;
  starred: boolean;
  web_content_link: string;
  created_time: string;
  modified_time: string;
  icon_link: string;
  thumbnail_link: string;
  md5_checksum: string;
  hash: string;
  links: {
    "application/octet-stream": {
      url: string;
      token: string;
      expire: string;
      type: string;
    };
  };
  phase: string;
  audit: {
    status: string;
    message: string;
    title: string;
  };
  medias: any[];
  trashed: boolean;
  delete_time: string;
  original_url: string;
  params: {
    duration: string;
    height: string;
    platform_icon: string;
    url: string;
    width: string;
  };
  original_file_index: number;
  space: string;
  apps: any[];
  writable: boolean;
  folder_type: string;
  collection: any;
  sort_name: string;
  user_modified_time: string;
  spell_name: any[];
  file_category: string;
  tags: any[];
  reference_events: any[];
  reference_resource: any;
}

// ============================================================================
// Folder Types
// ============================================================================

export interface CreateFolderResponse {
  result: {
    upload_type: string;
    file: {
      kind: string;
      id: string;
      parent_id: string;
      name: string;
      user_id: string;
      size: string;
      created_time: string;
      modified_time: string;
      icon_link: string;
      writable: boolean;
      folder_type: string;
      user_modified_time: string;
      file_category: string;
    };
    task: null | any;
  };
}

// ============================================================================
// Torrent Search Types
// ============================================================================

export type TorrentInfo = {
  CategoryDesc: string;
  Details: string;
  Files: any;
  Link: string;
  Peers: number;
  PublishDate: string;
  Publisher: any;
  Seeders: number;
  Size: any;
  Title: string;
  Tracker: string;
  Year: number;
};

export type Category = {
  code: string;
  value: string;
};

export type Indexer = {
  code: string;
  value: string;
};

export type SearchFieldsResponse = {
  categories: Category[];
  indexer: Indexer;
};

// ============================================================================
// Share Types
// ============================================================================

export type ShareData = {
  pass_code: string;
  share_error_files: string[];
  share_id: string;
  share_list: any[];
  share_text: string;
  share_url: string;
};

// ============================================================================
// User & Quota Types
// ============================================================================

interface BaseObjectType {
  user_id: string;
  info: string;
  sub_status: boolean;
  vip_status: string;
  expire_time: string;
  assets: string;
  size: number;
  offline: {
    total_assets: number;
    assets: number;
    size: number;
  };
  download: {
    total_assets: number;
    assets: number;
    size: number;
  };
  upload: {
    total_assets: number;
    assets: number;
    size: number;
  };
}

export type BaseResponseObjectType = BaseObjectType;

export interface QuotaInfo {
  quota: {
    kind: string;
    limit: string;
    usage: string;
    usage_in_trash: string;
    play_times_limit: string;
    play_times_usage: string;
    is_unlimited: boolean;
  };
}

export interface TransferQuotaItem {
  info: string;
  total_assets: number;
  assets: number;
  size?: number;
}

export interface PremiumProduct {
  user_id: string;
  product: string;
  product_name: string;
  type: string;
  activate_time: string;
  expire_time: string;
  assets: string;
  size: number;
  status: "active" | "expired";
}

/**
 * Transfer quota response from PikPak API.
 *
 * API Structure (Dec 2024):
 * - `base`: Common monthly quota everyone gets (40TB cloud, 4TB downstream, 1TB upload)
 *   - size/assets = actual usage consumed
 *   - total_assets = monthly limit
 * - `transfer`: EXTRA quota from purchased premium plans (e.g. dt_100_year)
 *   - assets = usage from this extra quota
 *   - total_assets = extra limit from premium purchase
 * - `data`: Array of premium products (extra transfer packages)
 *
 * Total available = base.total_assets + transfer.total_assets
 * Total used = base.size + transfer.assets
 */
export interface TransferQuota {
  /** Common monthly quota everyone gets */
  base?: BaseResponseObjectType;
  /** EXTRA quota from purchased premium plans */
  transfer?: {
    offline: TransferQuotaItem;
    download: TransferQuotaItem;
    upload: TransferQuotaItem;
  };
  /** Premium products that provide extra transfer packages */
  data?: PremiumProduct[] | null;
  has_more?: boolean;
}

export interface RefreshInfo {
  quota_refresh_interval_seconds: number;
  quota_next_refresh: string;
  webdav_generation_interval_hours: number;
  webdav_next_refresh: string | null;
}

export interface QuotaResponse {
  storage: QuotaInfo;
  transfer: TransferQuota;
  refresh_info?: RefreshInfo;
}

// ============================================================================
// Supabase Types
// ============================================================================

/**
 * WhatsLink metadata for torrent/magnet content
 */
export interface WhatsLinkMetadata {
  /** Content name (often cleaner than magnet hash) */
  name?: string;
  /** Content type: video, audio, archive, image, document, folder, text, font, unknown */
  file_type?: string;
  /** Total size in bytes */
  size?: number;
  /** Number of files in the torrent */
  count?: number;
  /** Preview screenshot URLs (for video content) */
  screenshots?: string[];
}

export interface SupabaseTaskRecord {
  id: number;
  created_at: string;
  action: string;
  data: {
    url: string;
    meta?: {
      title?: string;
    };
    task?: {
      upload_type?: string;
      url?: {
        kind: string;
      };
      task?: Task;
    };
    /** WhatsLink metadata from torrent analysis */
    whatslink?: WhatsLinkMetadata;
  };
}

// ============================================================================
// Auth & User Types
// ============================================================================

export interface AuthUser {
  email: string;
  is_admin: boolean;
  blocked: boolean;
  created_at?: string;
}

export interface AuthResponse {
  message: string;
  user?: AuthUser;
  token?: string;
  error?: string;
}

export interface UserStats {
  email: string;
  total_tasks: number;
}

export interface AdminStats {
  total_users: number;
  active_users: number;
  blocked_users: number;
  total_tasks: number;
  total_logs: number;
}

export interface DailyStats {
  date: string;
  tasks: number;
  users: number;
  logs: number;
  active_users: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  page: number;
  limit: number;
  user_email?: string;
}
