import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  // Exclut pusher-js du bundle SSR — trop lourd (6.7MB) et inutile côté serveur
  // Sans ça, Next.js parse pusher-js à chaque recompilation → ~34s de Fast Refresh
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
