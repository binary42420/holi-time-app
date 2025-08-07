/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  trailingSlash: false,
  
  experimental: {
    optimizePackageImports: [
      '@radix-ui/react-icons',
      'lucide-react',
      '@mantine/core',
      'recharts'
    ],
  },
  
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  typescript: {
    ignoreBuildErrors: true,
  },
  
  images: {
    domains: [
      'localhost', 
      'lh3.googleusercontent.com', 
      'avatars.githubusercontent.com', 
      'ui-avatars.com', 
      'storage.googleapis.com'
    ],
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "script-src 'none'; sandbox;",
  },
  
  compress: true,
  poweredByHeader: false,
  
  // Minimal webpack configuration to avoid module loading conflicts
  webpack: (config, { isServer }) => {
    // Only essential configurations
    config.externals = config.externals || [];
    config.externals.push('pg-native');
    
    if (isServer) {
      config.externals.push('_http_common', 'archiver', 'exceljs', 'pusher-js');
      // Handle Prisma client for server-side rendering
      config.externals.push('@prisma/client');
    }
    
    // Minimal client-side fallbacks
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        dns: false,
        child_process: false,
        worker_threads: false,
      };
    }
    
    return config;
  },
  
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
      {
        source: '/api/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'no-store, max-age=0' },
        ],
      },
      {
        source: '/_next/static/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ];
  },
  
  async redirects() {
    return [
      {
        source: '/home',
        destination: '/',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;