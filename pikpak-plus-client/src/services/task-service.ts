import apiClient from "./api-client";
import { PaginatedResponse, SupabaseTaskRecord } from "@/types/api";

export interface AddTaskResponse {
  message: string;
  task: any;
  file_info?: any;
}

export const taskService = {
  /**
   * Fetch paginated tasks synced with server
   */
  async getTasks(
    page: number = 1,
    limit: number = 25
  ): Promise<PaginatedResponse<SupabaseTaskRecord>> {
    const res = await apiClient.get<PaginatedResponse<SupabaseTaskRecord>>(
      `/tasks?page=${page}&limit=${limit}`
    );
    return res.data;
  },

  /**
   * Dispatch a new magnet/torrent download task
   */
  async addTask(url: string): Promise<AddTaskResponse> {
    const res = await apiClient.post<AddTaskResponse>("/add", { url });
    return res.data;
  },

  /**
   * Fetch single task details by ID
   */
  async getTask(id: number | string): Promise<SupabaseTaskRecord> {
    const res = await apiClient.get<SupabaseTaskRecord>(`/task/${id}`);
    return res.data;
  },

  /**
   * Delete a task by ID
   */
  async deleteTask(id: number | string): Promise<{ success: boolean; message?: string }> {
    const res = await apiClient.delete<{ success: boolean; message?: string }>(
      `/tasks/${id}`
    );
    return res.data;
  },
};

export default taskService;
