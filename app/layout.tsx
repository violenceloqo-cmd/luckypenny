import type { Metadata, Viewport } from "next";
import { Fredoka, Outfit } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const fredoka = Fredoka({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Fin Drop — Fin Ball Plinko Buy & Burn",
  description:
    "Fin drops fin balls through Plinko. Every landing multiplies a pump.fun token buy and on-chain SPL burn.",
};

export const viewport: Viewport = {
  themeColor: "#59B8F5",
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
    <html lang="en" className={`${outfit.variable} ${fredoka.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
