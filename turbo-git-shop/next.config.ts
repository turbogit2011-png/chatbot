import type { NextConfig } from "next";

// Headless storefront. Products render from the local catalog now; set
// NEXT_PUBLIC_WC_STORE_URL to point products/cart/checkout at a live
// WooCommerce Store API when going live. basePath is now the domain root.
const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  trailingSlash: true,
  env: {
    NEXT_PUBLIC_WC_STORE_URL: process.env.NEXT_PUBLIC_WC_STORE_URL ?? "",
  },
};

export default nextConfig;
