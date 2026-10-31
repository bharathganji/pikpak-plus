import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getServerApiUrl } from "./lib/api-utils";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Skip static files, API routes, and assets
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/static") ||
    pathname.startsWith("/api") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // 2. Determine Health Status
  let isHealthy = false;
  try {
    const apiUrl = getServerApiUrl();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000); // 2s timeout

    const res = await fetch(`${apiUrl}/health/live`, {
      method: "GET",
      signal: controller.signal,
      cache: "no-store",
    });

    clearTimeout(timeoutId);
    isHealthy = res.ok;
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Health Check Error:", error);
    }
    isHealthy = false;
  }

  // 3. Handle Redirection
  // Scenario A: Server is DOWN, force Maintenance Page
  if (!isHealthy) {
    if (pathname !== "/maintenance" && pathname !== "/faq") {
      const url = new URL("/maintenance", request.nextUrl);
      return NextResponse.redirect(url);
    }
  } else if (pathname === "/maintenance") {
    // Scenario B: Server is UP, recover from Maintenance Page
    const url = new URL("/", request.nextUrl);
    return NextResponse.redirect(url);
  }

  // 4. Server-Side Authentication Guarding (Eliminates login/dashboard screen flash)
  const token = request.cookies.get("access_token")?.value;
  const isProtectedRoute =
    pathname.startsWith("/dashboard") || pathname.startsWith("/admin");
  const isAuthPage =
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/forgot-password");

  // Case A: Unauthenticated user accesses protected route -> immediate server redirect to /login
  if (isProtectedRoute && !token) {
    const url = new URL("/login", request.nextUrl);
    const fullPath = request.nextUrl.search
      ? `${pathname}${request.nextUrl.search}`
      : pathname;
    url.searchParams.set("from", fullPath);
    return NextResponse.redirect(url);
  }

  // Case B: Authenticated user accesses auth page or landing page -> immediate server redirect
  if ((isAuthPage || pathname === "/") && token) {
    const fromParam = request.nextUrl.searchParams.get("from");
    const target =
      fromParam &&
      fromParam.startsWith("/") &&
      !fromParam.startsWith("//") &&
      !fromParam.startsWith("/login") &&
      !fromParam.startsWith("/register") &&
      !fromParam.startsWith("/forgot-password")
        ? fromParam
        : "/dashboard";
    const url = new URL(target, request.nextUrl);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

// Configure paths to match
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icons|manifest.json).*)",
  ],
};
