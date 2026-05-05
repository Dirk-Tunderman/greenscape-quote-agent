/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Standalone build is what Chat C's systemd unit launches via `node server.js`.
  output: "standalone",
};

module.exports = nextConfig;
