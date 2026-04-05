import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import OneSignalProvider from "@/components/providers/OneSignalProvider";
import Script from "next/script";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "NoorTech | Private Video Meetings",
  description: "نظام الاجتماعات المرئية الخاصة والمشفرة لموظفي شركة نور تيك",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icon-light.jpg", media: "(prefers-color-scheme: light)" },
      { url: "/icon-dark.jpg", media: "(prefers-color-scheme: dark)" },
    ],
    apple: [
      { url: "/icon-light.jpg", media: "(prefers-color-scheme: light)" },
      { url: "/icon-dark.jpg", media: "(prefers-color-scheme: dark)" },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <Script
          src="https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js"
          defer
          strategy="afterInteractive"
        />
      </head>
      <body className="min-h-full flex flex-col">
        <OneSignalProvider>
          {children}
        </OneSignalProvider>
      </body>
    </html>
  );
}
