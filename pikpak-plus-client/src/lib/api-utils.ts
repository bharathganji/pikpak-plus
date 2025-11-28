// Get API URL from environment or use default
export const getApiUrl = (): string => {
  return process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
};
