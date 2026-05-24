import type { Metadata, Viewport } from "next";
import { Fredoka } from "next/font/google";
import "./globals.css";

const fredoka = Fredoka({
  variable: "--font-fredoka",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Lucky Penny Day · Plinko Buy & Burn",
  description:
    "Drop a lucky penny every minute. The treasury buys & burns a pump.fun token live on Solana.",
};

export const viewport: Viewport = {
  themeColor: "#1f6b27",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${fredoka.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
