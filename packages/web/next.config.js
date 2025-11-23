/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    // Add fallbacks for Node.js modules that aren't available in the browser
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        crypto: require.resolve('crypto-browserify'),
        stream: require.resolve('stream-browserify'),
        buffer: require.resolve('buffer/'),
        process: require.resolve('process/browser'),
        vm: false,
        fs: false,
        net: false,
        tls: false,
      };
    }

    // Handle Aztec SDK modules
    config.externals = config.externals || [];
    
    return config;
  },
  // Enable experimental features if needed
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
};

module.exports = nextConfig;

