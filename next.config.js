/** @type {import('next').NextConfig} */
import path from 'path';

const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  webpack: (config) => {
    return config;
  },
};

export default nextConfig;
