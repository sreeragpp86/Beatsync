import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === "development", // keep dev fast
  workboxOptions: {
    disableDevLogs: true,
  },
});

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "i.ytimg.com",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "**.pipedapi.**",
      },
      {
        protocol: "https",
        hostname: "**.ggpht.com",
      },
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
      {
        protocol: "https",
        hostname: "archive.org",
      },
      {
        protocol: "https",
        hostname: "*.archive.org",
      },
      {
        protocol: "https",
        hostname: "*.ytimg.com",
      },
      {
        protocol: "https",
        hostname: "*.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "*.ducks.party",
      },
      {
        protocol: "https",
        hostname: "*.private.coffee",
      },
      {
        protocol: "https",
        hostname: "*.kavin.rocks",
      },
    ],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default withPWA(nextConfig);
