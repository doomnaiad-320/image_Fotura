const isCap = process.env.BUILD_TARGET === "cap";

/** @type {import("next").NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: {
    appDir: true,
    serverActions: {
      bodySizeLimit: "4mb"
    }
  },
  output: isCap ? "export" : undefined,
  trailingSlash: isCap,
  eslint: {
    dirs: ["app", "components", "lib", "prisma", "tests"]
  },
  typescript: {
    ignoreBuildErrors: false
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**"
      },
      {
        protocol: "http",
        hostname: "**"
      }
    ],
    unoptimized: isCap
  },
  headers: async () => {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY"
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff"
          }
        ]
      }
    ];
  }
};

export default nextConfig;
