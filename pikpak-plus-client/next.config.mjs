/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    // Use server hostname for Docker internal communication
    // Falls back to localhost for local development
    const apiUrl = process.env.API_URL_INTERNAL || "http://localhost:5000";
    console.log("API rewrite destination:", apiUrl);

    return [
      {
        source: "/api/:path*",
        destination: `${apiUrl}/:path*`,
      },
    ];
  },
};

export default nextConfig;
