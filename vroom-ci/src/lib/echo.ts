import Echo from "laravel-echo";
import Pusher from "pusher-js";

let echo: Echo<"reverb"> | null = null;

export const getEcho = () => {
  if (echo) return echo;

  (window as any).Pusher = Pusher;

  echo = new Echo({
    broadcaster: "reverb",
    key: process.env.NEXT_PUBLIC_REVERB_APP_KEY,
    wsHost: process.env.NEXT_PUBLIC_REVERB_HOST,
    wsPort: parseInt(process.env.NEXT_PUBLIC_REVERB_PORT ?? "8080"),
    forceTLS: false,
    enabledTransports: ['ws', 'wss'],
    authEndpoint: "/api/broadcasting/auth"
  });

  return echo;
};
