/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client'],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // Skip static generation for API routes during build
  generateBuildId: async () => {
    return 'build-' + Date.now();
  },
  images: {
    domains: ['localhost', 'lh3.googleusercontent.com', 'avatars.githubusercontent.com', 'ui-avatars.com', 'storage.googleapis.com'],
  },
  webpack: (config, { isServer, dev }) => {
    if (isServer) {
      config.externals.push('_http_common');
    }
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        dns: false,
      };
    }

    // Fix WebSocket HMR connection issues in development
    if (dev) {
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
      };
    }

    // Fix pg-native issue
    config.externals = config.externals || [];
    config.externals.push('pg-native');

    return config;
  },
};

export default nextConfig;