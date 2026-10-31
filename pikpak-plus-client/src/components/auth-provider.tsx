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

export const AuthContext = createContext<AuthContextType | undefined>(
  undefined,
);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  // Load user session from secure HttpOnly cookie on mount
  const checkAuth = useCallback(async () => {
    try {
      const res = await getMe();
      if (res.user) {
        setUser(res.user);
      } else {
        setUser(null);
      }
    } catch {
      // Not authenticated or session expired
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    Promise.resolve().then(() => {
      if (!ignore) {
        checkAuth();
      }
    });
    return () => {
      ignore = true;
    };
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
        pathname === "/" ||
        pathname?.startsWith("/faq") ||
        pathname?.startsWith("/maintenance") ||
        pathname?.startsWith("/statistics");

      if (!user && !isAuthPage && !isPublicPage) {
        // Not logged in and trying to access protected page
        router.push("/login");
      } else if (
        user &&
        isAuthPage &&
        !pathname?.startsWith("/reset-password")
      ) {
        // Logged in and trying to access auth page
        router.push("/dashboard");
      } else if (user && pathname === "/") {
        // Logged in and visiting root landing page -> take to dashboard
        router.push("/dashboard");
      } else if (user && isAdminPage && !user.is_admin) {
        // Non-admin trying to access admin page
        router.push("/dashboard");
      }
    }
  }, [user, loading, pathname, router]);

  const login = async (email: string, pass: string) => {
    try {
      const res = await apiLogin(email, pass);
      if (res.user) {
        setUser(res.user);
        router.push("/dashboard");
      }
    } catch (error) {
      throw error;
    }
  };

  const register = async (email: string, pass: string) => {
    try {
      const res = await apiRegister(email, pass);
      if (res.user) {
        setUser(res.user);
        router.push("/dashboard");
      }
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    try {
      await apiLogout();
    } finally {
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
    pathname === "/" ||
    pathname?.startsWith("/faq") ||
    pathname?.startsWith("/maintenance") ||
    pathname?.startsWith("/statistics");
  const isUnprotected = isAuthPage || isPublicPage;

  // Prevent flash of screen during initial auth check and client-side route transitions
  const shouldRenderContent = () => {
    // 1. Initial auth check in progress:
    if (loading) {
      // Allow documentation/public informational pages to display immediately
      return (
        pathname?.startsWith("/faq") ||
        pathname?.startsWith("/maintenance") ||
        pathname?.startsWith("/statistics")
      );
    }

    // 2. If authenticated user is on an auth page or root, hide content while redirecting to dashboard
    if (
      user &&
      (isAuthPage || pathname === "/") &&
      !pathname?.startsWith("/reset-password")
    ) {
      return false;
    }

    // 3. If unauthenticated user is on a protected page, hide content while redirecting to login
    if (!user && !isUnprotected) {
      return false;
    }

    // 4. Non-admin attempting to access admin route
    if (user && pathname?.startsWith("/admin") && !user.is_admin) {
      return false;
    }

    return true;
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
      {!shouldRenderContent() ? (
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
