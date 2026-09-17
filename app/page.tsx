'use client';

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import CreateUsage from "./components/createUsage";
import UebersichtEintraege from "./components/usages";
import FlottenUebersicht from "./components/vehicles";
import FahrzeugErfassen from "./components/createVehicle";
import UserMenu from "./components/UserMenu";
import { OrgSwitcher } from "./components/OrgSwitcher";
import { BottomNav } from "./components/BottomNav";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useOrganization } from "@/lib/contexts/OrganizationContext";
import { InstallPrompt } from "./components/InstallPrompt";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

type MenuKey = "nutzung" | "uebersichtEintraege" | "uebersicht" | "fahrzeug";

export default function Home() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = useTranslations("nav");
  const [active, setActive] = useState<MenuKey>("nutzung");
  const { userProfile, hasOrganization } = useAuth();
  const { canManageSelectedOrganization: canManageOrganization, selectedOrgId } = useOrganization();

  // Über die Nav (Tabs, Logo) - im Unterschied zum direkten Auswählen eines
  // Fahrzeugs in der Flottenübersicht - immer sauber navigieren: ein evtl.
  // noch in der URL stehender ?vehicleId= (von einer zuvor offenen
  // Fahrzeug-Detailansicht) wird entfernt, damit der Flotte-Tab beim
  // erneuten Öffnen wieder mit der Liste startet statt mit dem alten Detail.
  const goToTab = (key: MenuKey) => {
    setActive(key);
    if (searchParams.get('vehicleId')) {
      router.replace(pathname);
    }
  };

  useEffect(() => {
    if (userProfile && !hasOrganization) {
      router.replace('/onboarding');
    }
  }, [userProfile, hasOrganization, router]);

  // Beim Wechsel der Organisation zurück auf "Nutzung erfassen" springen: die
  // Tabs "Flotte"/"Fahrzeug erfassen" sind nur für Admins der jeweiligen Org
  // sichtbar - ohne diesen Reset könnte man sonst nach dem Wechsel auf einem
  // Tab landen, für den man in der neuen Organisation keine Berechtigung hat
  // ("Zugriff verweigert"). Der erste Durchlauf (initiales Laden der
  // gespeicherten Auswahl, null -> erste Org) zählt bewusst nicht als Wechsel.
  const previousOrgIdRef = useRef<string | null>(null);
  useEffect(() => {
    const previousOrgId = previousOrgIdRef.current;
    previousOrgIdRef.current = selectedOrgId;
    if (previousOrgId !== null && selectedOrgId !== null && selectedOrgId !== previousOrgId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- s.o.
      setActive("nutzung");
    }
  }, [selectedOrgId]);

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
        <div className="mb-8 flex-shrink-0 space-y-3">
          <button
            type="button"
            onClick={() => goToTab("nutzung")}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <Image src="/fleettrack-logo-light.svg" alt="FleetTrack" width={32} height={32} className="dark:hidden" />
            <Image src="/fleettrack-logo-dark.svg" alt="FleetTrack" width={32} height={32} className="hidden dark:block" />
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">FleetTrack</h2>
          </button>
          <OrgSwitcher />
        </div>

        <nav className="flex flex-col gap-2 flex-1 overflow-y-auto">
          <button
            onClick={() => goToTab("nutzung")}
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
            onClick={() => goToTab("uebersichtEintraege")}
            className={
              "text-left px-4 py-3 rounded-md transition-colors " +
              (active === "uebersichtEintraege"
                ? "bg-foreground text-background font-medium"
                : "hover:bg-zinc-100 dark:hover:bg-zinc-900")
            }
          >
            {t("usagesOverview")}
          </button>

          {/* Fleet management menu items - global admins and org admins/owners */}
          {canManageOrganization && (
            <>
              <button
                onClick={() => goToTab("uebersicht")}
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
                onClick={() => goToTab("fahrzeug")}
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
        <button
          type="button"
          onClick={() => goToTab("nutzung")}
          className="flex items-center gap-2 shrink-0 hover:opacity-80 transition-opacity"
        >
          <Image src="/fleettrack-logo-light.svg" alt="FleetTrack" width={26} height={26} className="dark:hidden" />
          <Image src="/fleettrack-logo-dark.svg" alt="FleetTrack" width={26} height={26} className="hidden dark:block" />
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">FleetTrack</h2>
        </button>
        <div className="flex items-center gap-2 shrink-0">
          <InstallPrompt />
          <OrgSwitcher />
        </div>
      </div>

      {/* Main content */}
      <main className="flex-1 min-w-0 p-4 sm:p-6 md:p-10 pt-20 md:pt-10 pb-24 md:pb-10">
        {active === "nutzung" && <CreateUsage />}
        {active === "uebersichtEintraege" && <UebersichtEintraege />}
        {active === "uebersicht" && (canManageOrganization ? (
          <FlottenUebersicht onAddVehicle={() => goToTab("fahrzeug")} />
        ) : <AccessDenied />)}
        {active === "fahrzeug" && (canManageOrganization ? <FahrzeugErfassen /> : <AccessDenied />)}
      </main>

      <BottomNav active={active} onNavigate={goToTab} showFleetTab={canManageOrganization} />
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