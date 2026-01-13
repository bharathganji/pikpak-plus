"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useCallback,
} from "react";
import { useRouter, usePathname } from "next/navigation";
import { AuthUser } from "@/types/api";
import {
  login as apiLogin,
  register as apiRegister,
  logout as apiLogout,
  getMe,
} from "@/lib/auth-client";

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  isAdmin: boolean;
  login: (email: string, pass: string) => Promise<void>;
  register: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  // Load user from token on mount
  const checkAuth = useCallback(async () => {
    const token = localStorage.getItem("token");

    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const res = await getMe();
      if (res.user) {
        setUser(res.user);
      } else {
        // Token invalid
        localStorage.removeItem("token");
        setUser(null);
      }
    } catch (error) {
      // Token invalid or expired
      localStorage.removeItem("token");
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Protected route check
  useEffect(() => {
    if (!loading) {
      const isAuthPage =
        pathname?.startsWith("/login") ||
        pathname?.startsWith("/register") ||
        pathname?.startsWith("/forgot-password");
      const isAdminPage = pathname?.startsWith("/admin");

      if (!user && !isAuthPage) {
        // Not logged in and trying to access protected page
        router.push("/login");
      } else if (user && isAuthPage) {
        // Logged in and trying to access auth page
        router.push("/");
      } else if (user && isAdminPage && !user.is_admin) {
        // Non-admin trying to access admin page
        router.push("/");
      }
    }
  }, [user, loading, pathname, router]);

  const login = async (email: string, pass: string) => {
    try {
      const res = await apiLogin(email, pass);
      if (res.token && res.user) {
        localStorage.setItem("token", res.token);
        setUser(res.user);
        router.push("/");
      }
    } catch (error) {
      throw error;
    }
  };

  const register = async (email: string, pass: string) => {
    try {
      const res = await apiRegister(email, pass);
      if (res.token && res.user) {
        localStorage.setItem("token", res.token);
        setUser(res.user);
        router.push("/");
      }
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    try {
      await apiLogout();
    } finally {
      localStorage.removeItem("token");
      setUser(null);
      router.push("/login");
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAdmin: !!user?.is_admin,
        login,
        register,
        logout,
        checkAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
