'use client';

import { useRouter, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

type MenuKey = "nutzung" | "uebersichtEintraege" | "uebersicht" | "fahrzeug";

interface BottomNavProps {
  active: MenuKey;
  onNavigate: (key: MenuKey) => void;
  // Der "Flotte"-Tab fuehrt fuer Mitarbeiter ohne Verwaltungsrechte nur zur
  // "Zugriff verweigert"-Seite - daher fuer sie gar nicht erst anzeigen.
  showFleetTab: boolean;
}

// Untere Tab-Leiste fuer Mobile - ersetzt den bisherigen Hamburger-Drawer.
// Bewusst immer Navy (bg-zinc-950), in beiden Themes, wie die Chrome-Leisten
// im gewaehlten Design (Richtung D). "Konto" ist keine der vier
// In-Page-Tabs, sondern navigiert auf die bestehende /settings-Route.
export function BottomNav({ active, onNavigate, showFleetTab }: BottomNavProps) {
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations("nav");
  const accountActive = pathname.startsWith("/settings");

  const itemClass = (isActive: boolean) =>
    `flex flex-col items-center gap-1 py-1.5 px-3 ${isActive ? "text-signal-600" : "text-zinc-400"}`;
  const labelClass = (isActive: boolean) =>
    `text-[10px] tracking-wide ${isActive ? "font-semibold" : "font-medium"}`;

  return (
    <nav
      className="md:hidden fixed inset-x-0 bottom-0 z-40 bg-zinc-950 border-t border-zinc-800 flex items-stretch justify-between px-2 pt-1.5"
      style={{ paddingBottom: "max(0.375rem, env(safe-area-inset-bottom))" }}
    >
      <button type="button" onClick={() => onNavigate("nutzung")} className={itemClass(active === "nutzung" && !accountActive)}>
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3v14M5 10l7-7 7 7" />
          <rect x="5" y="17" width="14" height="4" rx="1" />
        </svg>
        <span className={labelClass(active === "nutzung" && !accountActive)}>{t("tabCreateUsage")}</span>
      </button>

      <button type="button" onClick={() => onNavigate("uebersichtEintraege")} className={itemClass(active === "uebersichtEintraege" && !accountActive)}>
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 6h16M4 12h16M4 18h10" />
        </svg>
        <span className={labelClass(active === "uebersichtEintraege" && !accountActive)}>{t("tabUsages")}</span>
      </button>

      {showFleetTab && (
        <button type="button" onClick={() => onNavigate("uebersicht")} className={itemClass(active === "uebersicht" && !accountActive)}>
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="11" width="14" height="7" rx="1.5" />
            <circle cx="6" cy="19" r="1.8" />
            <circle cx="13" cy="19" r="1.8" />
            <path d="M16 13h4l2 3v2h-2" />
          </svg>
          <span className={labelClass(active === "uebersicht" && !accountActive)}>{t("tabFleet")}</span>
        </button>
      )}

      <button type="button" onClick={() => router.push("/settings")} className={itemClass(accountActive)}>
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
        </svg>
        <span className={labelClass(accountActive)}>{t("tabAccount")}</span>
      </button>
    </nav>
  );
}
