import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    ppr: true,
  },
  // Exclude react-template from the build process
  transpilePackages: [],
  webpack: (config, { isServer }) => {
    // Simplify the configuration - just set the ignored pattern directly
    config.watchOptions = {
      ...config.watchOptions,
      ignored: /node_modules|react-template/,
    };
    return config;
  },
  images: {
    remotePatterns: [
      {
        hostname: "avatar.vercel.sh",
      },
    ],
  },
  // Add headers configuration for WebContainers
  async headers() {
    return [
      {
        // Apply these headers to all routes
        source: "/:path*",
        headers: [
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin",
          },
          {
            key: "Cross-Origin-Embedder-Policy",
            value: "require-corp",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
