import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { AppProviders } from "@/providers/app-providers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "JSPL EAF TTT",
    template: "%s · JSPL EAF TTT",
  },
  description:
    "AI-powered Electric Arc Furnace Tap-to-Tap prediction, physics-guided optimization, and industrial decision support.",
  applicationName: "JSPL EAF TTT",
  icons: {
    icon: "/favicon.svg",
    apple: "/favicon.svg",
  },
  openGraph: {
    title: "JSPL EAF TTT",
    description: "JSPL Electric Arc Furnace Tap-to-Tap Time prediction system",
    type: "website",
    siteName: "JSPL EAF TTT",
  },
  twitter: {
    card: "summary_large_image",
    title: "JSPL EAF TTT",
    description: "JSPL Electric Arc Furnace Tap-to-Tap Time prediction system",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} min-h-screen font-sans antialiased`}>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
