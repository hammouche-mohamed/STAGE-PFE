import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
  experimental: {
    optimizePackageImports: ["lucide-react", "recharts", "date-fns"],
  },
  serverExternalPackages: ["@prisma/client", "prisma"],
  /* config options here */
};

export default nextConfig;
