/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Pin the workspace root to this folder — without it Next.js gets
  // confused when it finds the sibling root-level package-lock.json
  // (from the convenience `npm run dev` at the repo root).
  outputFileTracingRoot: __dirname,
  images: {
    remotePatterns: [{ protocol: "http", hostname: "localhost" }],
  },
};

module.exports = nextConfig;
