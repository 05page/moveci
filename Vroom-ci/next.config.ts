import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Exclut pusher-js et react-pdf du bundle SSR — évite ~34s de Fast Refresh
  serverExternalPackages: ["pusher-js", "@react-pdf/renderer"],
  images: {
    unoptimized: true,
    remotePatterns: [
      // Développement local
      { protocol: 'http', hostname: 'localhost', port: '8000', pathname: '/storage/**' },
      // Production Render (*.onrender.com)
      { protocol: 'https', hostname: '*.onrender.com', pathname: '/storage/**' },
      // Production Railway (*.railway.app)
      { protocol: 'https', hostname: '*.railway.app', pathname: '/storage/**' },
      // Supabase Storage
      { protocol: 'https', hostname: '*.supabase.co', pathname: '/storage/**' },
    ]
  }
};

export default nextConfig;
