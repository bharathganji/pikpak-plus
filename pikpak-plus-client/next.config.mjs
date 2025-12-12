/* eslint-disable no-undef */
import withPWA from "@ducanh2912/next-pwa";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Set the correct workspace root to avoid lockfile conflicts
  outputFileTracingRoot: resolve(__dirname),

  // Configure remote image patterns for next/image optimization
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "whatslink.info",
        pathname: "/image/**",
      },
    ],
    // Cache optimized images for 1 year (in seconds)
    minimumCacheTTL: 31536000,
  },

  async rewrites() {
    // Use server hostname for Docker internal communication
    // Falls back to localhost for local development
    const apiUrl = process.env.API_URL_INTERNAL || "http://localhost:5000";

    return [
      {
        source: "/api/:path*",
        destination: `${apiUrl}/:path*`,
      },
    ];
  },
  // Add turbopack config to resolve compatibility issues
  turbopack: {},
};

export default withPWA({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
})(nextConfig);
