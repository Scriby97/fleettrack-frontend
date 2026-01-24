import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth/AuthProvider";
import { BackendLoadingWrapper } from "./components/BackendLoadingWrapper";
import { ApiLoadingProvider } from "@/lib/api/ApiLoadingContext";
import { ApiLoadingOverlay } from "./components/TopLoadingBar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: "#6366f1",
};

export const metadata: Metadata = {
  title: "FleetTrack - Flottenverwaltung",
  description: "Verwalte deine Fahrzeugflotte mit FleetTrack",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "FleetTrack",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.svg", sizes: "180x180", type: "image/svg+xml" },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ApiLoadingProvider>
          <ApiLoadingOverlay />
          <AuthProvider>
            <BackendLoadingWrapper>
              {children}
            </BackendLoadingWrapper>
          </AuthProvider>
        </ApiLoadingProvider>
      </body>
    </html>
  );
}
