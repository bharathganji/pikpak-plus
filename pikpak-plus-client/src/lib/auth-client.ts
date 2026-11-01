import axios from "axios";
import { getApiUrl } from "./api-utils";
import { AuthResponse } from "@/types/api";

// Create an axios instance for auth requests with secure cookie credentials
const authClient = axios.create({
  baseURL: getApiUrl(),
  withCredentials: true,
});

export const login = async (
  email: string,
  password: string,
): Promise<AuthResponse> => {
  const res = await axios.post(
    `${getApiUrl()}/login`,
    {
      email,
      password,
    },
    {
      withCredentials: true,
    },
  );
  return res.data;
};

export const register = async (
  email: string,
  password: string,
): Promise<AuthResponse> => {
  const res = await axios.post(
    `${getApiUrl()}/register`,
    {
      email,
      password,
    },
    {
      withCredentials: true,
    },
  );
  return res.data;
};

export const logout = async (): Promise<void> => {
  try {
    await authClient.post("logout");
  } catch {
    // Ignore logout errors
  }
};

export const getMe = async (): Promise<AuthResponse> => {
  const res = await authClient.get("me");
  return res.data;
};

export const forgotPassword = async (email: string): Promise<AuthResponse> => {
  const res = await axios.post(
    `${getApiUrl()}/forgot-password`,
    {
      email,
    },
    {
      withCredentials: true,
    },
  );
  return res.data;
};

export const resetPassword = async (
  token: string,
  newPassword: string,
): Promise<AuthResponse> => {
  const res = await axios.post(
    `${getApiUrl()}/reset-password`,
    {
      token,
      new_password: newPassword,
    },
    {
      withCredentials: true,
    },
  );
  return res.data;
};
