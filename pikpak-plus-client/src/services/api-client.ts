import axios, {
  AxiosError,
  AxiosInstance,
  InternalAxiosRequestConfig,
} from "axios";
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
 * Unified Axios instance with automatic HttpOnly cookie credentials and 401 response handling.
 */
export const apiClient: AxiosInstance = axios.create({
  baseURL: getApiUrl(),
  timeout: 30000,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to attach credentials
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    config.withCredentials = true;
    return config;
  },
  (error) => Promise.reject(error),
);

// Token refresh state
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token as string);
    }
  });
  failedQueue = [];
};

// Response interceptor to handle common error codes and normalize error responses
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiErrorResponse>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };
    const status = error.response?.status || 500;
    const message =
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message ||
      "An unexpected error occurred";

    if (
      status === 401 &&
      typeof window !== "undefined" &&
      originalRequest &&
      !originalRequest._retry
    ) {
      const currentPath = window.location.pathname;
      const isPublicRoute =
        currentPath.startsWith("/login") ||
        currentPath.startsWith("/register") ||
        currentPath.startsWith("/forgot-password") ||
        currentPath.startsWith("/reset-password") ||
        currentPath.startsWith("/faq") ||
        currentPath.startsWith("/maintenance");

      if (isRefreshing) {
        return new Promise(function (resolve, reject) {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = "Bearer " + token;
            }
            return apiClient(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        await axios.post(
          `${getApiUrl()}/refresh-token`,
          {},
          {
            withCredentials: true,
          },
        );
        processQueue(null);
        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        if (!isPublicRoute && typeof window !== "undefined") {
          window.location.replace(`${window.location.origin}/login`);
        }
        return Promise.reject(
          new ApiError(message, status, error.response?.data),
        );
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(new ApiError(message, status, error.response?.data));
  },
);

export default apiClient;
