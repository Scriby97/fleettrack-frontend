import type { Metadata, Viewport } from "next";
import { Geist, Big_Shoulders, IBM_Plex_Mono } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import "./globals.css";
import { AuthProvider } from "@/lib/auth/AuthProvider";
import { OrganizationProvider } from "@/lib/contexts/OrganizationContext";
import { PendingInvitesProvider } from "@/lib/contexts/PendingInvitesContext";
import { BackendLoadingWrapper } from "./components/BackendLoadingWrapper";
import { InvitePopup } from "./components/InvitePopup";
import { ApiLoadingProvider } from "@/lib/api/ApiLoadingContext";
import { ApiLoadingOverlay } from "./components/TopLoadingBar";
import { ServiceWorkerRegistration } from "./components/ServiceWorkerRegistration";
import { ThemeManager } from "./components/ThemeManager";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const bigShoulders = Big_Shoulders({
  variable: "--font-big-shoulders",
  weight: ["600", "700", "900"],
  subsets: ["latin"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  weight: ["500", "600", "700"],
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: "#0a1222",
};

export const metadata: Metadata = {
  title: "FleetTrack - Flottenverwaltung",
  description: "Verwalte deine Fahrzeugflotte mit FleetTrack",
  manifest: "/manifest.webmanifest",
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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <body
        className={`${geistSans.variable} ${bigShoulders.variable} ${plexMono.variable} antialiased`}
      >
        <NextIntlClientProvider messages={messages}>
          <ServiceWorkerRegistration />
          <ThemeManager />
          <ApiLoadingProvider>
            <ApiLoadingOverlay />
            <AuthProvider>
              <OrganizationProvider>
                <BackendLoadingWrapper>
                  <PendingInvitesProvider>
                    <InvitePopup />
                    {children}
                  </PendingInvitesProvider>
                </BackendLoadingWrapper>
              </OrganizationProvider>
            </AuthProvider>
          </ApiLoadingProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
