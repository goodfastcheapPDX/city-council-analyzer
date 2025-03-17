/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    swcMinify: true,
    images: {
        domains: ['vercel-blob.com'],
        formats: ['image/avif', 'image/webp'],
    },
    experimental: {
        serverActions: true,
        serverComponentsExternalPackages: ['@vercel/postgres'],
    },
    async headers() {
        return [
            {
                // Apply these headers to all routes
                source: '/(.*)',
                headers: [
                    {
                        key: 'X-Content-Type-Options',
                        value: 'nosniff',
                    },
                    {
                        key: 'X-Frame-Options',
                        value: 'DENY',
                    },
                    {
                        key: 'X-XSS-Protection',
                        value: '1; mode=block',
                    },
                ],
            },
        ];
    },
    env: {
        ENABLE_PROCESSING: process.env.ENABLE_PROCESSING,
        ENABLE_CACHING: process.env.ENABLE_CACHING,
        DEBUG_MODE: process.env.DEBUG_MODE,
    },
};

module.exports = nextConfig;