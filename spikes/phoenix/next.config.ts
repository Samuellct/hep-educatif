import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    resolveAlias: {
      "@angular/core": "./shims/angular-core.ts",
    },
  },
};

export default nextConfig;
