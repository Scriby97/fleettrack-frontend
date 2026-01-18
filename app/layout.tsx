import type { Metadata } from "next";
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

export const metadata: Metadata = {
  title: "FleetTrack - Flottenverwaltung",
  description: "Verwalte deine Fahrzeugflotte mit FleetTrack",
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
