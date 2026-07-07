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
    default: "SteelOps AI",
    template: "%s · SteelOps AI",
  },
  description: "Enterprise operating system for EAF steel production — AI-powered mission control, digital twin, and executive command center.",
  applicationName: "SteelOps AI",
  icons: {
    icon: "/favicon.svg",
    apple: "/favicon.svg",
  },
  openGraph: {
    title: "SteelOps AI",
    description: "Enterprise AI operating system for steel plants",
    type: "website",
    siteName: "SteelOps AI",
  },
  twitter: {
    card: "summary_large_image",
    title: "SteelOps AI",
    description: "Enterprise AI operating system for steel plants",
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
