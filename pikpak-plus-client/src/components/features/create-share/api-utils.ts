import axios from "axios";
import { getApiUrl } from "@/lib/api-utils";
import type { ConfigResponse } from "@/types";

export const fetchConfig = async (): Promise<ConfigResponse> => {
  try {
    const apiUrl = getApiUrl();
    const res = await axios.get(`${apiUrl}/config`);
    return res.data;
  } catch (error: any) {
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
  } catch (error: any) {
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
    });
    return {
      data: res.data.data || [],
      count: res.data.count || 0,
    };
  } catch (error: any) {
    console.error("Failed to fetch global tasks", error);

    let msg = "Failed to load tasks";

    // Check if it's a network error (backend not running)
    if (error.code === "ERR_NETWORK" || error.message === "Network Error") {
      msg = "Cannot connect to server. Please ensure the backend is running.";
    } else if (error.response?.data?.error) {
      msg = error.response.data.error;
    } else if (error.message) {
      msg = error.message;
    }

    throw new Error(msg);
  }
};

export const addMagnetLink = async (url: string) => {
  try {
    const apiUrl = getApiUrl();
    const res = await axios.post(`${apiUrl}/add`, { url: url.trim() });
    return res.data;
  } catch (error: any) {
    let errMsg = "Failed to add magnet link";

    // Check if it's a network error (backend not running)
    if (error.code === "ERR_NETWORK" || error.message === "Network Error") {
      errMsg =
        "Cannot connect to server. Please ensure the backend is running.";
    } else if (error.response?.data?.error) {
      // API returned an error message
      errMsg = error.response.data.error;
    } else if (error.message) {
      // Other error with message
      errMsg = error.message;
    }

    // Add the response data to the error for file info
    (error as any).response = error.response;
    throw error;
  }
};
