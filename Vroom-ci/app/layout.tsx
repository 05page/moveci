import type { Metadata } from "next";
import { Montserrat, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import ConditionalHeader from "./components/ConditionalHeader";
import { Toaster } from "sonner";
import { UserProvider } from "@/src/context/UserContext";
import { NotificationProvider } from "@/src/context/NotificationContext";
import { MessageProvider } from "@/src/context/MessageContext";

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Move CI — Marketplace Automobile",
  description: "Achetez, vendez et louez des véhicules en toute confiance.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={`${montserrat.variable} ${jetbrainsMono.variable}`}>
      <body className="antialiased bg-white text-black min-h-screen">
        <UserProvider>
          <NotificationProvider>
          <MessageProvider>
              <ConditionalHeader />
              {children}
              <Toaster position="top-center" />
          </MessageProvider>
          </NotificationProvider>
        </UserProvider>
      </body>
    </html>
  );
}
