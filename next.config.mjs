/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    // Add polyfills for node-fetch dependencies
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      canvas: false,
      encoding: false,
      "utf-8-validate": false,
      bufferutil: false,
    };

    // Handle node-specific modules
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        'canvas': false,
        'jsdom': false,
      };
    }

    return config;
  },
  // Add headers to allow loading of model files
  async headers() {
    return [
      {
        source: '/models/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
};

export default nextConfig; 