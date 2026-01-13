// Get API URL from environment or use default
export const getApiUrl = (): string => {
  return process.env.NEXT_PUBLIC_API_URL || "/api";
};

// Get API URL for Server-Side (fetching from container/server)
export const getServerApiUrl = (): string => {
  // 1. Prefer internal Docker network URL if available
  // 2. Fallback to localhost default for server-side context
  return process.env.API_URL_INTERNAL || "http://localhost:5000";
};

// Get auth headers with JWT token
export const getAuthHeaders = () => {
  if (typeof window === "undefined") {
    return {};
  }

  const token = localStorage.getItem("token");
  if (token) {
    return {
      Authorization: `Bearer ${token}`,
    };
  }

  return {};
};
