import axios from "axios";
import { getApiUrl, getAuthHeaders } from "./api-utils";
import { AuthUser, AuthResponse } from "@/types/api";

// Create an axio instance for auth requests
const createAuthClient = () => {
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

const authClient = createAuthClient();

export const login = async (
  email: string,
  password: string
): Promise<AuthResponse> => {
  const res = await axios.post(`${getApiUrl()}/login`, {
    email,
    password,
  });
  return res.data;
};

export const register = async (
  email: string,
  password: string
): Promise<AuthResponse> => {
  const res = await axios.post(`${getApiUrl()}/register`, {
    email,
    password,
  });
  return res.data;
};

export const logout = async (): Promise<void> => {
  const headers = getAuthHeaders();
  // We can just call API, client side cleanup is done in context
  if (headers.Authorization) {
    try {
      await authClient.post("logout");
    } catch (e) {
      // Ignore logout errors
    }
  }
};

export const getMe = async (): Promise<AuthResponse> => {
  const res = await authClient.get("me");
  return res.data;
};

export const forgotPassword = async (email: string): Promise<AuthResponse> => {
  const res = await axios.post(`${getApiUrl()}/forgot-password`, {
    email,
  });
  return res.data;
};

export const resetPassword = async (
  token: string,
  newPassword: string
): Promise<AuthResponse> => {
  const res = await axios.post(`${getApiUrl()}/reset-password`, {
    token,
    new_password: newPassword,
  });
  return res.data;
};
