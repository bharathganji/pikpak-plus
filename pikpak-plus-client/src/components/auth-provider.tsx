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
        pathname?.startsWith("/forgot-password") ||
        pathname?.startsWith("/reset-password");
      const isAdminPage = pathname?.startsWith("/admin");
      const isPublicPage =
        pathname?.startsWith("/faq") || pathname?.startsWith("/maintenance");

      if (!user && !isAuthPage && !isPublicPage) {
        // Not logged in and trying to access protected page
        router.push("/login");
      } else if (
        user &&
        isAuthPage &&
        !pathname?.startsWith("/reset-password")
      ) {
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

  const isAuthPage =
    pathname?.startsWith("/login") ||
    pathname?.startsWith("/register") ||
    pathname?.startsWith("/forgot-password") ||
    pathname?.startsWith("/reset-password");
  const isPublicPage =
    pathname?.startsWith("/faq") || pathname?.startsWith("/maintenance");
  const isUnprotected = isAuthPage || isPublicPage;

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
      {loading && !isUnprotected ? (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="flex flex-col items-center gap-4">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="text-sm text-muted-foreground animate-pulse">
              Loading application...
            </p>
          </div>
        </div>
      ) : (
        children
      )}
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
