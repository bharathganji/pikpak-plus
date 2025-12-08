import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getApiUrl } from "./lib/api-utils";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Skip static files and API routes (if strict frontend-only checks)
  // Also skip /_next internal routes
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/static") ||
    pathname.includes(".") // Optimization: skip files with extensions (likely assets)
  ) {
    return NextResponse.next();
  }

  // 2. Determine Health Status
  let isHealthy = false;
  try {
    // Use env var or default. NOTE: Middleware runs in Edge/Node.
    // Ensure this URL is reachable from the container/host running Next.js.
    const apiUrl = getApiUrl();
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
    console.error("Health Check Error:", error);
    isHealthy = false;
  }

  // 3. Handle Redirection

  // Scenario A: Server is DOWN, logic to force Maintenance Page
  if (!isHealthy) {
    // If not already on maintenance page, redirect to it
    if (pathname !== "/maintenance") {
      const url = request.nextUrl.clone();
      url.pathname = "/maintenance";
      // Use 307 Temporary Redirect
      return NextResponse.redirect(url);
    }
  }

  // Scenario B: Server is UP, logic to recover from Maintenance Page
  else if (pathname === "/maintenance") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

// Configure paths to match
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
