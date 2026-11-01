// Get API URL from environment or use default
export const getApiUrl = (): string => {
  return process.env.NEXT_PUBLIC_API_URL || "/api";
};

// Get API URL for Server-Side (fetching from container/server)
export const getServerApiUrl = (): string => {
  // 1. Prefer internal Docker network URL if available
  // 2. Fallback to localhost default for server-side context
  return process.env.API_URL_INTERNAL || "http://127.0.0.1:5000";
};

// Get auth headers (credentials are automatically transmitted via secure HttpOnly cookies)
export const getAuthHeaders = (): Record<string, string> => {
  return {};
};
