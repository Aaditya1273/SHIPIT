/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  images: {
    unoptimized: true,
  },
  // Next.js 16 defaults to Turbopack — declare empty config to silence
  // the "webpack config present but no turbopack config" WorkerError.
  turbopack: {},
  webpack: (config) => {
    return config;
  },
};

export default nextConfig;
