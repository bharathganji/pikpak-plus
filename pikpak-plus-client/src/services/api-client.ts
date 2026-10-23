import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from "axios";
import { getApiUrl } from "@/lib/api-utils";

export interface ApiErrorResponse {
  error?: string;
  message?: string;
  status?: number;
}

export class ApiError extends Error {
  status: number;
  data: any;

  constructor(message: string, status: number = 500, data?: any) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

/**
 * Unified Axios instance with automatic JWT header attachment and 401 response handling.
 */
export const apiClient: AxiosInstance = axios.create({
  baseURL: getApiUrl(),
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to attach Bearer token
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("token");
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle common error codes and normalize error responses
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorResponse>) => {
    const status = error.response?.status || 500;
    const message =
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message ||
      "An unexpected error occurred";

    if (status === 401 && typeof window !== "undefined") {
      // Clear expired token on unauthorized response
      localStorage.removeItem("token");
      // Redirect to login if on protected route
      const currentPath = window.location.pathname;
      const isPublicRoute =
        currentPath.startsWith("/login") ||
        currentPath.startsWith("/register") ||
        currentPath.startsWith("/forgot-password") ||
        currentPath.startsWith("/reset-password") ||
        currentPath.startsWith("/faq") ||
        currentPath.startsWith("/maintenance");

      if (!isPublicRoute) {
        window.location.href = "/login";
      }
    }

    return Promise.reject(new ApiError(message, status, error.response?.data));
  }
);

export default apiClient;
