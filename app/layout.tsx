import type { Metadata, Viewport } from "next";
import { Bungee, Outfit } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const bungee = Bungee({
  variable: "--font-bungee",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: "National Paper Airplane Day",
  description:
    "Launch a paper airplane every minute. Each flight multiplies SOL and burns pump.fun tokens on Solana.",
};

export const viewport: Viewport = {
  themeColor: "#2563eb",
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
    <html lang="en" className={`${outfit.variable} ${bungee.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
