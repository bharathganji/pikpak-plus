// Central export point for all type definitions
export * from "./api";

// Add interface for configuration response
export interface ConfigResponse {
  max_file_size_gb: number;
  task_status_update_interval_minutes: number;
  next_task_status_update: string | null;
}
