import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Next 16 bloque par défaut l'optimisation d'images sur IP locale/loopback
    // (protection anti-SSRF) — nécessaire ici puisque le backend Laravel tourne
    // sur localhost en dev. Ne jamais activer ça en prod sur une IP fournie par
    // un utilisateur, uniquement pour un backend qu'on contrôle soi-même.
    dangerouslyAllowLocalIP: true,
    // Domaines externes autorisés pour <Image />. Sans cette liste, next/image
    // refuse toute URL distante (protection anti-hotlink et anti-abus du cache).
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "http",
        hostname: "localhost",
        port: "8000",
        pathname: "/storage/**",
      },
      {
        protocol: "http",
        hostname: "127.0.0.1",
        port: "8000",
        pathname: "/storage/**",
      },
    ],
  },
};

export default nextConfig;
