import axios from "axios";
import { getApiUrl, getAuthHeaders } from "@/lib/api-utils";
import type { ConfigResponse } from "@/types";

export const fetchConfig = async (): Promise<ConfigResponse> => {
  try {
    const apiUrl = getApiUrl();
    const res = await axios.get(`${apiUrl}/config`);
    return res.data;
  } catch (error: unknown) {
    console.error("Failed to fetch config", error);
    // Return default values if config fetch fails
    return {
      max_file_size_gb: 25,
      task_status_update_interval_minutes: 15,
      next_task_status_update: null,
    };
  }
};

export const fetchCleanupStatus = async () => {
  try {
    const apiUrl = getApiUrl();
    const res = await axios.get(`${apiUrl}/cleanup/status`);
    return res.data;
  } catch (error: unknown) {
    console.error("Failed to fetch cleanup status", error);
    // Return null if cleanup status fetch fails
    return null;
  }
};

export const fetchGlobalTasks = async (page: number, pageSize: number) => {
  try {
    const apiUrl = getApiUrl();
    const res = await axios.get(`${apiUrl}/tasks`, {
      params: { page: page, limit: pageSize },
      withCredentials: true,
    });
    return {
      data: res.data.data || [],
      count: res.data.count || 0,
    };
  } catch (error: unknown) {
    console.error("Failed to fetch global tasks", error);

    let msg = "Failed to load tasks";

    if (axios.isAxiosError(error)) {
      if (error.code === "ERR_NETWORK" || error.message === "Network Error") {
        msg = "Cannot connect to server. Please ensure the backend is running.";
      } else if (error.response?.data?.error) {
        msg = String(error.response.data.error);
      } else if (error.message) {
        msg = error.message;
      }
    } else if (error instanceof Error) {
      msg = error.message;
    }

    throw new Error(msg);
  }
};

export const addMagnetLink = async (url: string) => {
  try {
    const apiUrl = getApiUrl();
    const headers = getAuthHeaders();
    const res = await axios.post(
      `${apiUrl}/add`,
      { url: url.trim() },
      {
        headers: headers.Authorization
          ? { Authorization: headers.Authorization }
          : {},
      },
    );
    return res.data;
  } catch (error: unknown) {
    let errMsg = "Failed to add magnet link";

    if (axios.isAxiosError(error)) {
      if (error.code === "ERR_NETWORK" || error.message === "Network Error") {
        errMsg =
          "Cannot connect to server. Please ensure the backend is running.";
      } else if (error.response?.data?.error) {
        errMsg = String(error.response.data.error);
      } else if (error.message) {
        errMsg = error.message;
      }

      error.message = errMsg;
      throw error;
    } else if (error instanceof Error) {
      errMsg = error.message;
      throw error;
    }

    throw new Error(errMsg);
  }
};
