/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client'],
    // Enable optimized package imports
    optimizePackageImports: [
      '@radix-ui/react-icons',
      'lucide-react',
      '@mantine/core',
      'recharts'
    ],
    // Enable turbo mode for faster builds
    turbo: {
      rules: {
        '*.svg': {
          loaders: ['@svgr/webpack'],
          as: '*.js',
        },
      },
    },
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // Enhanced build optimization
  generateBuildId: async () => {
    return 'build-' + Date.now();
  },
  // Optimized image configuration
  images: {
    domains: ['localhost', 'lh3.googleusercontent.com', 'avatars.githubusercontent.com', 'ui-avatars.com', 'storage.googleapis.com'],
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  // Compression and performance
  compress: true,
  poweredByHeader: false,
  // Enhanced webpack configuration
  webpack: (config, { isServer, dev, webpack }) => {
    // Simplified polyfills - only what's absolutely necessary
    config.plugins.push(
      new webpack.ProvidePlugin({
        // Only provide global, let Next.js handle process
      })
    );

    // Server-side optimizations
    if (isServer) {
      config.externals.push('_http_common');
    }
    
    // Client-side optimizations
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

      // Let Next.js handle polyfills automatically
    }

    // Development optimizations
    if (dev) {
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
        ignored: /node_modules/,
      };
    } else {
      // Production optimizations - simplified to avoid server-side chunk loading issues
      config.optimization = {
        ...config.optimization,
        // Explicitly disable usedExports to prevent cacheUnaffected conflict
        usedExports: false,
        splitChunks: isServer ? false : {
          chunks: 'all',
          cacheGroups: {
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              chunks: 'all',
              priority: 10,
            },
            common: {
              name: 'common',
              minChunks: 2,
              chunks: 'all',
              priority: 5,
              reuseExistingChunk: true,
            },
            // Separate heavy libraries
            charts: {
              test: /[\\/]node_modules[\\/](recharts|chart\.js|d3)[\\/]/,
              name: 'charts',
              chunks: 'all',
              priority: 20,
            },
            ui: {
              test: /[\\/]node_modules[\\/](@radix-ui|@mantine|lucide-react)[\\/]/,
              name: 'ui',
              chunks: 'all',
              priority: 15,
            },
          },
        },
      };

      // Bundle analyzer in production
      if (process.env.ANALYZE === 'true') {
        try {
          // Use require in a try-catch since this is conditional
          const BundleAnalyzerPlugin = eval('require')('webpack-bundle-analyzer').BundleAnalyzerPlugin;
          config.plugins.push(
            new BundleAnalyzerPlugin({
              analyzerMode: 'static',
              openAnalyzer: false,
              reportFilename: 'bundle-analyzer-report.html',
            })
          );
        } catch (error) {
          console.warn('webpack-bundle-analyzer not available, skipping bundle analysis');
        }
      }
    }

    // Fix pg-native issue
    config.externals = config.externals || [];
    config.externals.push('pg-native');

    // Additional server-side externals for problematic modules
    if (isServer) {
      config.externals.push('archiver', 'exceljs', 'pusher-js');
      
      // Server-side environment definitions (non-conflicting)
      config.plugins.push(
        new webpack.DefinePlugin({
          'typeof window': '"undefined"',
          'typeof document': '"undefined"',
        })
      );

      // Override webpack's chunk loading for server-side
      config.plugins.push(
        new webpack.BannerPlugin({
          banner: `
// Server-side webpack chunk loading fix - safe global access
(function() {
  'use strict';
  
  // Safely get global object
  var globalObj;
  try {
    globalObj = (function() {
      if (typeof globalThis !== 'undefined') return globalThis;
      if (typeof global !== 'undefined') return global;
      if (typeof window !== 'undefined') return window;
      if (typeof self !== 'undefined') return self;
      return {};
    })();
  } catch (e) {
    globalObj = {};
  }
  
  // Only run in server environment (Node.js)
  if (typeof window === 'undefined' && typeof globalObj === 'object' && globalObj) {
    if (typeof globalObj.self === 'undefined') {
      globalObj.self = globalObj;
    }
    
    // Initialize webpack chunk arrays
    globalObj.webpackChunk_N_E = globalObj.webpackChunk_N_E || [];
    if (globalObj.self) {
      globalObj.self.webpackChunk_N_E = globalObj.webpackChunk_N_E;
    }
  }
})();
          `.trim(),
          raw: true,
          entryOnly: true,
        })
      );

      // Additional server-side webpack runtime fix
      config.optimization.runtimeChunk = false;
    }

    // Optimize imports
    config.plugins.push(
      new webpack.IgnorePlugin({
        resourceRegExp: /^\.\/locale$/,
        contextRegExp: /moment$/,
      })
    );

    // Tree shaking optimization - Let Next.js handle usedExports automatically
    // Explicitly disable usedExports to prevent conflict with cacheUnaffected
    config.optimization.usedExports = false;
    config.optimization.sideEffects = false;

    return config;
  },
  // Headers for better caching and security
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
      {
        source: '/api/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, max-age=0',
          },
        ],
      },
      {
        source: '/_next/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
  // Redirects for better SEO
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