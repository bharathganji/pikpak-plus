import apiClient from "./api-client";
import { AuthResponse } from "@/types/api";

export const authService = {
  async login(email: string, password: string): Promise<AuthResponse> {
    const res = await apiClient.post<AuthResponse>("/login", {
      email,
      password,
    });
    return res.data;
  },

  async register(email: string, password: string): Promise<AuthResponse> {
    const res = await apiClient.post<AuthResponse>("/register", {
      email,
      password,
    });
    return res.data;
  },

  async logout(): Promise<void> {
    try {
      await apiClient.post("/logout");
    } catch (err) {
      console.error(err);
      // Ignore network errors on logout
    } finally {
      if (typeof window !== "undefined") {
        localStorage.removeItem("token");
      }
    }
  },

  async getMe(): Promise<AuthResponse> {
    const res = await apiClient.get<AuthResponse>("/me");
    return res.data;
  },

  async forgotPassword(email: string): Promise<AuthResponse> {
    const res = await apiClient.post<AuthResponse>("/forgot-password", {
      email,
    });
    return res.data;
  },

  async resetPassword(
    token: string,
    newPassword: string,
  ): Promise<AuthResponse> {
    const res = await apiClient.post<AuthResponse>("/reset-password", {
      token,
      new_password: newPassword,
    });
    return res.data;
  },
};

export default authService;
