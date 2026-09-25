import type { NextConfig } from "next";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

function resolveDistDir(): string {
  if (process.env.NEXT_DIST_DIR) {
    return process.env.NEXT_DIST_DIR;
  }
  // Vercel/CI keep the default in-repo cache.
  if (process.env.VERCEL || process.env.CI) {
    return ".next";
  }
  // iCloud Desktop/Documents file-provider stalls Next's compile cache writes,
  // so the server prints Ready then never answers HTTP.
  if (
    process.platform === "darwin" &&
    /\/(Desktop|Documents|Library\/Mobile Documents)\//.test(projectRoot)
  ) {
    return path.join(os.homedir(), "Library/Caches/learning-tracker-next");
  }
  return ".next";
}

const distDir = resolveDistDir();
const nextConfig: NextConfig = {
  distDir,
  // Skip iCloud-backed lock + turbopack FS cache when the compile dir is local.
  ...(distDir !== ".next"
    ? {
        experimental: {
          lockDistDir: false,
          turbopackFileSystemCacheForDev: false,
        },
      }
    : {}),
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "i.ytimg.com",
        pathname: "/vi/**",
      },
      {
        protocol: "https",
        hostname: "**.ytimg.com",
        pathname: "/**",
      },
    ],
  },
  turbopack: {
    root: projectRoot,
  },
};

export default nextConfig;
