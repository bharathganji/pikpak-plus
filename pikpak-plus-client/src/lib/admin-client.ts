import axios from "axios";
import { getApiUrl, getAuthHeaders } from "./api-utils";
import {
  AuthUser,
  PaginatedResponse,
  UserStats,
  SupabaseTaskRecord,
  AdminStats,
  DailyStats,
} from "@/types/api";

// Create an axio instance for admin requests
const createAdminClient = () => {
  const apiUrl = getApiUrl();
  const client = axios.create({
    baseURL: apiUrl,
  });

  // Add interceptor to inject token
  client.interceptors.request.use((config) => {
    const headers = getAuthHeaders();
    if (headers.Authorization) {
      config.headers.Authorization = headers.Authorization;
    }
    return config;
  });

  return client;
};

const adminClient = createAdminClient();

// User Management
export const createUser = async (
  email: string,
  password: string,
  isAdmin: boolean = false,
): Promise<void> => {
  await adminClient.post("admin/users", {
    email,
    password,
    is_admin: isAdmin,
  });
};

export const deleteUser = async (email: string): Promise<void> => {
  await adminClient.delete(`admin/users/${email}`);
};

export const updateUserRole = async (
  email: string,
  isAdmin: boolean,
): Promise<void> => {
  await adminClient.patch(`admin/users/${email}/role`, {
    is_admin: isAdmin,
  });
};

export const getUsers = async (
  page: number = 1,
  limit: number = 25,
  blocked?: boolean,
  search?: string,
): Promise<PaginatedResponse<AuthUser>> => {
  const params: any = { page, limit };
  if (blocked !== undefined) params.blocked = blocked;
  if (search) params.search = search;

  const res = await adminClient.get("admin/users", { params });
  return res.data;
};

export const getUserDetails = async (
  email: string,
): Promise<{ user: AuthUser; stats: UserStats }> => {
  const res = await adminClient.get(`admin/users/${email}`);
  return res.data;
};

export const blockUser = async (email: string): Promise<void> => {
  await adminClient.post(`admin/users/${email}/block`);
};

export const unblockUser = async (email: string): Promise<void> => {
  await adminClient.post(`admin/users/${email}/unblock`);
};

// Content Moderation
export const getLogs = async (
  page: number = 1,
  limit: number = 25,
  action?: string,
  user_email?: string,
): Promise<PaginatedResponse<SupabaseTaskRecord>> => {
  const params: any = { page, limit };
  if (action) params.action = action;
  if (user_email) params.user_email = user_email;

  const res = await adminClient.get("admin/logs", { params });
  return res.data;
};

export const getUserLogs = async (
  email: string,
  page: number = 1,
  limit: number = 25,
): Promise<PaginatedResponse<SupabaseTaskRecord>> => {
  const params = { page, limit };
  const res = await adminClient.get(`admin/users/${email}/logs`, { params });
  return res.data;
};

export const deleteTask = async (taskId: number): Promise<void> => {
  await adminClient.delete(`admin/tasks/${taskId}`);
};

export const updateUserPassword = async (
  email: string,
  newPassword: string,
): Promise<void> => {
  await adminClient.patch(`admin/users/${email}/password`, {
    new_password: newPassword,
  });
};

export const bulkUserAction = async (
  emails: string[],
  action: "block" | "unblock" | "delete",
): Promise<void> => {
  await Promise.all(
    emails.map((email) => {
      if (action === "block") return blockUser(email);
      if (action === "unblock") return unblockUser(email);
      return adminClient.delete(`admin/users/${email}`);
    }),
  );
};

// Statistics
export const getOverviewStats = async (): Promise<AdminStats> => {
  const res = await adminClient.get("admin/stats/overview");
  return res.data;
};

export const getDailyStats = async (
  limit: number = 30,
): Promise<{ data: DailyStats[] }> => {
  const res = await adminClient.get("admin/stats/daily", {
    params: { limit },
  });
  return res.data;
};
