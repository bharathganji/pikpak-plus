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

  // 2. Check explicit maintenance configuration
  const isExplicitMaintenance =
    process.env.NEXT_PUBLIC_MAINTENANCE_MODE === "true" ||
    process.env.MAINTENANCE_MODE === "true";

  // 3. Determine Health Status if not explicitly in maintenance mode
  let isHealthy = !isExplicitMaintenance;
  if (!isExplicitMaintenance) {
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
  }

  const isUnderMaintenance = isExplicitMaintenance || !isHealthy;

  // 4. Handle Redirection & Googlebot Indexing Safety
  // CRITICAL SEO PRESERVATION (Google Search Central Guidelines):
  // When site maintenance is performed for extended periods (such as 10 days),
  // Google Search Central officially recommends serving an indexable home page (/)
  // with HTTP 200 OK, full metadata, and a maintenance alert banner, rather than
  // redirecting to a maintenance URL (302/307) which causes Google to overwrite
  // the home page title/snippet with maintenance copy or de-index the page.
  // Public informational routes (/, /faq, /robots.txt, /sitemap.xml) remain accessible.
  if (isUnderMaintenance) {
    const isPublicMaintenanceSafe =
      pathname === "/" ||
      pathname === "/faq" ||
      pathname === "/maintenance" ||
      pathname === "/robots.txt" ||
      pathname === "/sitemap.xml";

    if (!isPublicMaintenanceSafe) {
      const url = new URL("/maintenance", request.nextUrl);
      return NextResponse.redirect(url);
    }

    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-maintenance-mode", "active");
    requestHeaders.set(
      "x-maintenance-reason",
      isExplicitMaintenance ? "scheduled" : "server_offline",
    );

    const response = NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
    response.headers.set("x-maintenance-mode", "active");
    return response;
  } else if (pathname === "/maintenance") {
    // Scenario B: Server is UP and not in maintenance, recover from Maintenance Page
    const url = new URL("/", request.nextUrl);
    return NextResponse.redirect(url);
  }

  // 5. Server-Side Authentication Guarding (Eliminates login/dashboard screen flash)
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
  // (Only redirect to dashboard when NOT in maintenance mode, preserving homepage access)
  if (!isUnderMaintenance && (isAuthPage || pathname === "/") && token) {
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
