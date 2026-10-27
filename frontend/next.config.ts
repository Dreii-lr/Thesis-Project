import type { NextConfig } from "next";

const BACKEND_URL = (process.env.BACKEND_URL || 'http://127.0.0.1:8989').replace(/\/$/, '');
const DOCUMENT_PROCESSING_URL = (process.env.DOCUMENT_PROCESSING_URL || 'http://127.0.0.1:9090').replace(/\/$/, '');

const nextConfig: NextConfig = {
  // Preserve FastAPI collection URLs, avoiding redirects out of the cookie proxy.
  skipTrailingSlashRedirect: true,
  // Keep API rewrites scoped to /api/v1 so App Router pages resolve normally.
  async rewrites() {
    return [
      {
        source: '/api/v1/document-processor/parser',
        destination: `${DOCUMENT_PROCESSING_URL}/api/v1/document-processor/parser`,
      },
      {
        source: '/api/v1/document-processor/documents/:documentId/process',
        destination: `${DOCUMENT_PROCESSING_URL}/api/v1/document-processor/documents/:documentId/process`,
      },
      {
        source: '/api/v1/assessments',
        destination: `${BACKEND_URL}/api/v1/assessments/`,
      },
      {
        source: '/api/v1/assessments/',
        destination: `${BACKEND_URL}/api/v1/assessments/`,
      },
      {
        source: '/api/v1/users',
        destination: `${BACKEND_URL}/api/v1/users/`,
      },
      {
        source: '/api/v1/users/',
        destination: `${BACKEND_URL}/api/v1/users/`,
      },
      {
        source: '/api/v1/subjects',
        destination: `${BACKEND_URL}/api/v1/subjects/`,
      },
      {
        source: '/api/v1/subjects/',
        destination: `${BACKEND_URL}/api/v1/subjects/`,
      },
      {
        source: '/api/v1/user-categories',
        destination: `${BACKEND_URL}/api/v1/user-categories/`,
      },
      {
        source: '/api/v1/user-categories/',
        destination: `${BACKEND_URL}/api/v1/user-categories/`,
      },
      {
        source: '/api/v1/:path*',
        destination: `${BACKEND_URL}/api/v1/:path*`,
      },
    ];
  },

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'i.pravatar.cc',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
    ],
  },
};

export default nextConfig;
