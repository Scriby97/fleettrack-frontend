'use client';

import Image from "next/image";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import CreateUsage from "./components/createUsage";
import UebersichtEintraege from "./components/usages";
import FlottenUebersicht from "./components/vehicles";
import FahrzeugErfassen from "./components/createVehicle";
import UserMenu from "./components/UserMenu";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useOrganization } from "@/lib/contexts/OrganizationContext";
import { InstallPrompt } from "./components/InstallPrompt";
import { useRouter } from "next/navigation";

type MenuKey = "nutzung" | "uebersichtEintraege" | "uebersicht" | "fahrzeug";

export default function Home() {
  const router = useRouter();
  const t = useTranslations("nav");
  const [active, setActive] = useState<MenuKey>("nutzung");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { userProfile, hasOrganization } = useAuth();
  // Reagiert auf die im Menü AUSGEWÄHLTE Organisation, nicht nur auf die erste
  // Mitgliedschaft - wichtig, sobald man zwischen mehreren Organisationen wechselt.
  const { canManageSelectedOrganization: canManageOrganization } = useOrganization();

  useEffect(() => {
    if (userProfile && !hasOrganization) {
      router.replace('/onboarding');
    }
  }, [userProfile, hasOrganization, router]);

  if (userProfile && !hasOrganization) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-900 px-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-zinc-600 dark:text-zinc-400">{t("redirectingToOnboarding")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-zinc-50 dark:bg-black font-sans">
      {/* Left menu - Hidden on mobile */}
      <aside className="hidden md:flex md:w-64 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0b0b0b] px-6 py-8 flex-col h-screen sticky top-0">
        <div className="flex items-center gap-2 mb-8 flex-shrink-0">
          <Image src="/fleettrack-logo-light.svg" alt="FleetTrack Logo" width={36} height={36} className="dark:hidden" />
          <Image src="/fleettrack-logo-dark.svg" alt="FleetTrack Logo" width={36} height={36} className="hidden dark:block" />
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">FleetTrack</h2>
        </div>

        <nav className="flex flex-col gap-2 flex-1 overflow-y-auto">
          <button
            onClick={() => setActive("nutzung")}
            className={
              "text-left px-4 py-3 rounded-md transition-colors " +
              (active === "nutzung"
                ? "bg-foreground text-background font-medium"
                : "hover:bg-zinc-100 dark:hover:bg-zinc-900")
            }
          >
            Nutzung erfassen
          </button>

          <button
            onClick={() => setActive("uebersichtEintraege")}
            className={
              "text-left px-4 py-3 rounded-md transition-colors " +
              (active === "uebersichtEintraege"
                ? "bg-foreground text-background font-medium"
                : "hover:bg-zinc-100 dark:hover:bg-zinc-900")
            }
          >
            Übersicht Nutzungen
          </button>

          {/* Fleet management menu items - global admins and org admins/owners */}
          {canManageOrganization && (
            <>
              <button
                onClick={() => setActive("uebersicht")}
                className={
                  "text-left px-4 py-3 rounded-md transition-colors " +
                  (active === "uebersicht"
                    ? "bg-foreground text-background font-medium"
                    : "hover:bg-zinc-100 dark:hover:bg-zinc-900")
                }
              >
                {t("fleetOverview")}
              </button>

              <button
                onClick={() => setActive("fahrzeug")}
                className={
                  "text-left px-4 py-3 rounded-md transition-colors " +
                  (active === "fahrzeug"
                    ? "bg-foreground text-background font-medium"
                    : "hover:bg-zinc-100 dark:hover:bg-zinc-900")
                }
              >
                {t("createVehicle")}
              </button>
            </>
          )}
        </nav>

        {/* User Menu at bottom */}
        <div className="mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-800 space-y-3 flex-shrink-0">
          <InstallPrompt />
          <UserMenu />
        </div>
      </aside>

      {/* Mobile header */}
      <div className="md:hidden fixed top-0 left-0 right-0 bg-white dark:bg-[#0b0b0b] border-b border-zinc-200 dark:border-zinc-800 px-5 py-4 flex items-center justify-between z-50">
        <div className="flex items-center gap-1.5">
          <Image src="/fleettrack-logo-light.svg" alt="FleetTrack Logo" width={28} height={28} className="dark:hidden" />
          <Image src="/fleettrack-logo-dark.svg" alt="FleetTrack Logo" width={28} height={28} className="hidden dark:block" />
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">FleetTrack</h2>
        </div>
        <div className="flex items-center gap-2">
          <InstallPrompt />
          <button 
            onClick={() => setMobileMenuOpen(true)}
            className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-md transition-colors"
            aria-label={t("openMenu")}
            aria-expanded={mobileMenuOpen}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile menu overlay */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileMenuOpen(false)} />
          <div className="absolute right-0 top-0 bottom-0 w-64 bg-white dark:bg-[#0b0b0b] border-l border-zinc-200 dark:border-zinc-800 px-6 py-8 flex flex-col">
            <button 
              onClick={() => setMobileMenuOpen(false)}
              className="absolute top-4 right-4 p-2 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-md transition-colors"
              aria-label={t("closeMenu")}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="flex items-center gap-2 mb-8 mt-8">
              <Image src="/fleettrack-logo-light.svg" alt="FleetTrack Logo" width={36} height={36} className="dark:hidden" />
              <Image src="/fleettrack-logo-dark.svg" alt="FleetTrack Logo" width={36} height={36} className="hidden dark:block" />
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">FleetTrack</h2>
            </div>

            <nav className="flex flex-col gap-2">
              <button
                onClick={() => {
                  setActive("nutzung");
                  setMobileMenuOpen(false);
                }}
                className={
                  "text-left px-4 py-3 rounded-md transition-colors " +
                  (active === "nutzung"
                    ? "bg-foreground text-background font-medium"
                    : "hover:bg-zinc-100 dark:hover:bg-zinc-900")
                }
              >
                {t("createUsage")}
              </button>

              <button
                onClick={() => {
                  setActive("uebersichtEintraege");
                  setMobileMenuOpen(false);
                }}
                className={
                  "text-left px-4 py-3 rounded-md transition-colors " +
                  (active === "uebersichtEintraege"
                    ? "bg-foreground text-background font-medium"
                    : "hover:bg-zinc-100 dark:hover:bg-zinc-900")
                }
              >
                {t("usagesOverview")}
              </button>

              {canManageOrganization && (
                <>
                  <button
                    onClick={() => {
                      setActive("uebersicht");
                      setMobileMenuOpen(false);
                    }}
                    className={
                      "text-left px-4 py-3 rounded-md transition-colors " +
                      (active === "uebersicht"
                        ? "bg-foreground text-background font-medium"
                        : "hover:bg-zinc-100 dark:hover:bg-zinc-900")
                    }
                  >
                    Flottenübersicht
                  </button>

                  <button
                    onClick={() => {
                      setActive("fahrzeug");
                      setMobileMenuOpen(false);
                    }}
                    className={
                      "text-left px-4 py-3 rounded-md transition-colors " +
                      (active === "fahrzeug"
                        ? "bg-foreground text-background font-medium"
                        : "hover:bg-zinc-100 dark:hover:bg-zinc-900")
                    }
                  >
                    Fahrzeug erfassen
                  </button>
                </>
              )}
            </nav>

            <div className="mt-auto pt-4 border-t border-zinc-200 dark:border-zinc-800">
              <UserMenu />
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 p-10 md:p-10 pt-20 md:pt-10">
        {active === "nutzung" && <CreateUsage />}
        {active === "uebersichtEintraege" && <UebersichtEintraege />}
        {active === "uebersicht" && (canManageOrganization ? <FlottenUebersicht /> : <AccessDenied />)}
        {active === "fahrzeug" && (canManageOrganization ? <FahrzeugErfassen /> : <AccessDenied />)}
      </main>
    </div>
  );
}

function AccessDenied() {
  const t = useTranslations("nav");
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center space-y-4">
        <div className="text-6xl">🔒</div>
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          {t("accessDeniedTitle")}
        </h2>
        <p className="text-zinc-600 dark:text-zinc-400">
          {t("accessDeniedBody")}
        </p>
      </div>
    </div>
  );
}