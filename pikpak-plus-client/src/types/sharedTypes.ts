// the response data type
export interface ApiResponse {
  result: {
    upload_type: string
    url?: {
      kind: string
    }
    task: {
      kind: string
      id: string
      name: string
      type: string
      user_id: string
      statuses: string[]
      status_size: number
      params: {
        predict_speed: string
        predict_type: string
      }
      file_id: string
      file_name: string
      file_size: string
      message: string
      created_time: string
      updated_time: string
      third_task_id: string
      phase: string
      progress: number
      icon_link: string
      callback: string
      reference_resource: any
      space: string
    }
  }
}
type ReferenceResource = {
  '@type': string
  kind: string
  id: string
  parent_id: string
  name: string
  size: string
  mime_type: string
  icon_link: string
  hash: string
  phase: string
  audit: null | any // Update the type accordingly if you have more specific information
  thumbnail_link: string
  params: {
    platform_icon: string
    url: string
  }
  space: string
  medias: any[] // Update the type accordingly if you have more specific information
  starred: boolean
  tags: any[] // Update the type accordingly if you have more specific information
}
export type Task = {
  kind: string
  id: string
  name: string
  type: string
  user_id: string
  statuses: any[]
  status_size: number
  params: {
    age: string
    mime_type: string
    predict_type: string
    url: string
  }
  file_id: string
  file_name: string
  file_size: string
  message: string
  created_time: string
  updated_time: string
  third_task_id: string
  phase: string
  progress: number
  icon_link: string
  callback: string
  reference_resource: ReferenceResource | null
  space: string
}

export type DownloadListResponse = {
  tasks: Task[]
  next_page_token: string
  expires_in: number
}

export type FileListResponse = {
  kind: string
  next_page_token: string
  files: FileItem[]
  version: string
  version_outdated: boolean
  sync_time: string
}

export type FileItem = {
  kind: string
  id: string
  parent_id: string
  name: string
  user_id: string
  size: string
  revision: string
  file_extension: string
  mime_type: string
  starred: boolean
  web_content_link: string
  created_time: string
  modified_time: string
  icon_link: string
  thumbnail_link: string
  md5_checksum: string
  hash: string
  links: Record<string, any>
  phase: string
  audit: {
    status: string
    message: string
    title: string
  }
  medias: any[] // You might want to create a specific type for this
  trashed: boolean
  delete_time: string
  original_url: string
  params: {
    platform_icon: string
    url: string
  }
  original_file_index: number
  space: string
  apps: any[] // You might want to create a specific type for this
  writable: boolean
  folder_type: string
  collection: any // You might want to create a specific type for this
  sort_name: string
  user_modified_time: string
  spell_name: string[] // You might want to create a specific type for this
  file_category: string
  tags: string[] // You might want to create a specific type for this
  reference_events: any[] // You might want to create a specific type for this
  reference_resource: any // You might want to create a specific type for this
}

export interface DownloadResponse {
  kind: string
  id: string
  parent_id: string
  name: string
  user_id: string
  size: string
  revision: string
  file_extension: string
  mime_type: string
  starred: boolean
  web_content_link: string
  created_time: string
  modified_time: string
  icon_link: string
  thumbnail_link: string
  md5_checksum: string
  hash: string
  links: {
    'application/octet-stream': {
      url: string
      token: string
      expire: string
      type: string
    }
  }
  phase: string
  audit: {
    status: string
    message: string
    title: string
  }
  medias: any[] // You may need to define the actual type for this array
  trashed: boolean
  delete_time: string
  original_url: string
  params: {
    duration: string
    height: string
    platform_icon: string
    url: string
    width: string
  }
  original_file_index: number
  space: string
  apps: any[] // You may need to define the actual type for this array
  writable: boolean
  folder_type: string
  collection: any // You may need to define the actual type for this property
  sort_name: string
  user_modified_time: string
  spell_name: any[] // You may need to define the actual type for this array
  file_category: string
  tags: any[] // You may need to define the actual type for this array
  reference_events: any[] // You may need to define the actual type for this array
  reference_resource: any // You may need to define the actual type for this property
}

export interface CreateFolderResponse {
  result: {
    upload_type: string
    file: {
      kind: string
      id: string
      parent_id: string
      name: string
      user_id: string
      size: string
      created_time: string
      modified_time: string
      icon_link: string
      writable: boolean
      folder_type: string
      user_modified_time: string
      file_category: string
      // Add more properties as needed
    }
    task: null | any // You might want to replace 'any' with a more specific type if you have information about the 'task' structure.
  }
}

export type TorrentInfo = {
  CategoryDesc: string
  Details: string
  Files: any
  Link: string
  Peers: number
  PublishDate: string
  Publisher: any
  Seeders: number
  Size: any
  Title: string
  Tracker: string
  Year: number
}

export type Category = {
  code: string
  value: string
}

export type Indexer = {
  code: string
  value: string
}

export type SearchFieldsResponse = {
  categories: Category[]
  indexer: Indexer
}

export type ShareData = {
  pass_code: string
  share_error_files: string[]
  share_id: string
  share_list: any[] // You may want to replace 'any' with a more specific type if you know the structure
  share_text: string
  share_url: string
}

interface BaseObjectType {
  user_id: string
  info: string
  sub_status: boolean
  vip_status: string
  expire_time: string
  assets: string
  size: number
  offline: {
    total_assets: number
    assets: number
    size: number
  }
  download: {
    total_assets: number
    assets: number
    size: number
  }
  upload: {
    total_assets: number
    assets: number
    size: number
  }
}

export type BaseResponseObjectType = BaseObjectType

export interface DriveAbout {
  expires_at: string;
  kind: string;
  quota: {
    is_unlimited: boolean;
    kind: string;
    limit: string;
    play_times_limit: string;
    play_times_usage: string;
    usage: string;
    usage_in_trash: string;
  };
  quotas: Record<string, any>; // You can define specific types for the "quotas" object if needed
}
