import type { Metadata, Viewport } from "next";
import { Geist, IBM_Plex_Mono } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import "./globals.css";
import { AuthProvider } from "@/lib/auth/AuthProvider";
import { OrganizationProvider } from "@/lib/contexts/OrganizationContext";
import { PendingInvitesProvider } from "@/lib/contexts/PendingInvitesContext";
import { FleetConsistencyProvider } from "@/lib/contexts/FleetConsistencyContext";
import { DataFreshnessProvider } from "@/lib/contexts/DataFreshnessContext";
import { BackendLoadingWrapper } from "./components/BackendLoadingWrapper";
import { InvitePopup } from "./components/InvitePopup";
import { PastDueSubscriptionBanner } from "./components/PastDueSubscriptionBanner";
import { AppChrome } from "./components/AppChrome";
import { ApiLoadingProvider } from "@/lib/api/ApiLoadingContext";
import { ApiLoadingOverlay } from "./components/TopLoadingBar";
import { ServiceWorkerRegistration } from "./components/ServiceWorkerRegistration";
import { ThemeManager } from "./components/ThemeManager";

const geistSans = Geist({
  variable: "--font-geist-sans",
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

// Text fuer die Link-Vorschau - gleiche Aussage wie die SEO-Description von
// /login (siehe app/login/layout.tsx).
const shareDescription =
  "Betriebsstunden und Diesel pro Pistenfahrzeug in Sekunden erfassen – für eine lückenlose Mineralölsteuer-Rückerstattung.";

export const metadata: Metadata = {
  // Absolute Basis-URL fuer Open-Graph-Bilder (WhatsApp & Co. brauchen
  // absolute URLs). fleettrack.ch leitet auf www weiter.
  metadataBase: new URL("https://www.fleettrack.ch"),
  title: "FleetTrack - Flottenverwaltung",
  description: "Verwalte deine Fahrzeugflotte mit FleetTrack",
  // Link-Vorschau beim Teilen (WhatsApp, Teams, Mail ...) - z.B. ueber
  // "App teilen" in der Mitarbeiterverwaltung. Unterseiten ohne eigenes
  // openGraph erben diese Angaben.
  openGraph: {
    type: "website",
    siteName: "FleetTrack",
    title: "FleetTrack",
    description: shareDescription,
    url: "/",
    locale: "de_CH",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "FleetTrack" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "FleetTrack",
    description: shareDescription,
    images: ["/og-image.png"],
  },
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

const INSTALL_PROMPT_CAPTURE_SCRIPT = `
window.addEventListener('beforeinstallprompt', function (e) {
  e.preventDefault();
  window.__deferredInstallPrompt = e;
  window.dispatchEvent(new Event('installpromptchange'));
});
window.addEventListener('appinstalled', function () {
  window.__deferredInstallPrompt = null;
  window.dispatchEvent(new Event('installpromptchange'));
});
`;

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <head>
        {/* Chrome feuert beforeinstallprompt nur einmal, sehr frueh beim
            Laden - oft bevor InstallPrompt gemountet ist (z.B. waehrend die
            Anmeldung noch laedt). Daher hier vor React abfangen und global
            ablegen; InstallPrompt liest es von dort. */}
        <script dangerouslySetInnerHTML={{ __html: INSTALL_PROMPT_CAPTURE_SCRIPT }} />
      </head>
      <body
        className={`${geistSans.variable} ${plexMono.variable} antialiased`}
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
                    <FleetConsistencyProvider>
                      <DataFreshnessProvider>
                        <InvitePopup />
                        <PastDueSubscriptionBanner />
                        <AppChrome />
                        {children}
                      </DataFreshnessProvider>
                    </FleetConsistencyProvider>
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
