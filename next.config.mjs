/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Allows CI/preview builds to use a separate directory while a dev server is running.
  distDir: process.env.NEXT_DIST_DIR || ".next",
};

export default nextConfig;
