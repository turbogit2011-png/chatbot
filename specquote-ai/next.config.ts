import path from "node:path";
import type { NextConfig } from "next";

// SpecQuote AI is a server-rendered multi-tenant SaaS (auth, database, file
// storage, background jobs) and therefore cannot use `output: "export"` like
// the sibling static sites in this monorepo. It runs as a standalone Node.js
// server (see README for deployment).
const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname),
  serverExternalPackages: ["@prisma/client", "bcryptjs"],
};

export default nextConfig;
