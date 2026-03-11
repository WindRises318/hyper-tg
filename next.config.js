/** @type {import('next').NextConfig} */
import path from 'path';

const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      'hyperliquid': path.resolve(process.cwd(), 'node_modules/hyperliquid/dist/index.mjs'),
    };
    return config;
  },
};

export default nextConfig;
