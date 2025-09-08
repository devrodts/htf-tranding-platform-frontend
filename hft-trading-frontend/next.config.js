/** @type {import('next').NextConfig} */

const nextConfig = {
  // Next.js 15 features
  experimental: {
    turbo: {
      rules: {
        '*.svg': {
          loaders: ['@svgr/webpack'],
          as: '*.js',
        },
      },
    },
  },
  
  serverExternalPackages: ['lightweight-charts'],

  // Build optimization
  poweredByHeader: false,
  generateEtags: false,
  compress: true,

  // Security headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()'
          }
        ]
      }
    ]
  },

  // Image optimization
  images: {
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  // Environment variables
  env: {
    TRADING_API_URL: process.env.TRADING_API_URL || 'http://localhost:8080/api',
    WEBSOCKET_URL: process.env.WEBSOCKET_URL || 'ws://localhost:8080/ws',
    VIEW_TRADING_API_KEY: process.env.VIEW_TRADING_API_KEY,
    ENVIRONMENT: process.env.NODE_ENV || 'development',
  },

  // Webpack optimization
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Optimize bundle size
    config.optimization = {
      ...config.optimization,
      splitChunks: {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            priority: 10,
            reuseExistingChunk: true,
          },
          common: {
            name: 'common',
            minChunks: 2,
            priority: 5,
            reuseExistingChunk: true,
          },
          trading: {
            test: /[\\/]src[\\/](trading|market-data|orders)[\\/]/,
            name: 'trading',
            priority: 20,
          },
          charts: {
            test: /[\\/]node_modules[\\/](lightweight-charts|recharts)[\\/]/,
            name: 'charts',
            priority: 15,
          },
        },
      },
    }

    // Add SVG support
    config.module.rules.push({
      test: /\.svg$/i,
      issuer: /\.[jt]sx?$/,
      use: ['@svgr/webpack'],
    })

    // Performance optimizations disabled for compatibility
    // if (!dev && !isServer) {
    //   config.resolve.alias = {
    //     ...config.resolve.alias,
    //     'react/jsx-runtime.js': 'preact/compat/jsx-runtime',
    //     react: 'preact/compat',
    //     'react-dom/test-utils': 'preact/test-utils',
    //     'react-dom': 'preact/compat',
    //   }
    // }

    return config
  },

  // Output configuration
  output: 'standalone',
  
  // ESLint configuration
  eslint: {
    dirs: ['src', 'pages', 'components', 'lib', 'utils'],
    ignoreDuringBuilds: false,
  },

  // TypeScript configuration
  typescript: {
    ignoreBuildErrors: false,
  },

  // Redirects and rewrites
  async rewrites() {
    return [
      {
        source: '/api/trading/:path*',
        destination: `${process.env.TRADING_API_URL || 'http://localhost:8080/api'}/:path*`,
      },
    ]
  },

  // Static file handling
  trailingSlash: false,
  
  // Development optimizations
  ...(process.env.NODE_ENV === 'development' && {
    reactStrictMode: true,
  }),
}

module.exports = nextConfig