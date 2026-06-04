import type { NextConfig } from "next";

import { isCapacitorStaticExportBuild } from "./lib/capacitor/build-mode";

const capacitorStaticExport = isCapacitorStaticExportBuild();

const nextConfig: NextConfig = {
  ...(capacitorStaticExport
    ? {
        output: "export",
        trailingSlash: true,
        images: {
          unoptimized: true,
          formats: ["image/avif", "image/webp"],
          deviceSizes: [640, 750, 828, 1080, 1200],
          imageSizes: [16, 32, 48, 64, 96, 128, 256],
          minimumCacheTTL: 60,
        },
      }
    : {
        output: "standalone",
        images: {
          formats: ["image/avif", "image/webp"],
          deviceSizes: [640, 750, 828, 1080, 1200],
          imageSizes: [16, 32, 48, 64, 96, 128, 256],
          minimumCacheTTL: 60,
        },
      }),
  experimental: {
    optimizePackageImports: ["lucide-react", "sonner"],
  },
  compiler: {
    removeConsole:
      process.env.NODE_ENV === "production"
        ? { exclude: ["error", "warn"] }
        : false,
  },
};

export default nextConfig;
