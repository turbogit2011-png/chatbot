import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";
const repo = "chatbot";
const basePath = isProd ? `/${repo}` : "";

const nextConfig: NextConfig = {
  output: "export",
  basePath,
  assetPrefix: isProd ? `/${repo}/` : "",
  images: { unoptimized: true },
  trailingSlash: true,
  // Exposed to the client so the PWA can register its service worker and
  // resolve icons/manifest under the GitHub Pages base path.
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
};

export default nextConfig;
