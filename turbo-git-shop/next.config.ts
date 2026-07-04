import type { NextConfig } from "next";

// Headless storefront. Products render from the local catalog now; set
// NEXT_PUBLIC_WC_STORE_URL to point products/cart/checkout at a live
// WooCommerce Store API when going live.
//
// SHOP_BASE_PATH lets us host a preview under a subpath (e.g. the GitHub
// Pages preview at /chatbot/shop). Empty = served from the domain root
// (production on turbo-git.com).
const basePath = process.env.SHOP_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  output: "export",
  basePath: basePath || undefined,
  assetPrefix: basePath ? `${basePath}/` : undefined,
  images: { unoptimized: true },
  trailingSlash: true,
  env: {
    NEXT_PUBLIC_WC_STORE_URL: process.env.NEXT_PUBLIC_WC_STORE_URL ?? "",
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
};

export default nextConfig;
