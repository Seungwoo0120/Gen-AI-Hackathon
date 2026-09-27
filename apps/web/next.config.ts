import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Stop `next dev` from generating apps/web/AGENTS.md and CLAUDE.md;
  // the Next.js docs rule lives in the root CLAUDE.md instead.
  agentRules: false,
};

export default nextConfig;
