'use client';

import Image from "next/image";
import { useState } from "react";
import CreateUsage from "./components/createUsage";
import UebersichtEintraege from "./components/usages";
import FlottenUebersicht from "./components/vehicles";
import FahrzeugErfassen from "./components/createVehicle";
import UserMenu from "./components/UserMenu";
import { useAuth } from "@/lib/auth/AuthProvider";

type MenuKey = "nutzung" | "uebersichtEintraege" | "uebersicht" | "fahrzeug";

export default function Home() {
  const [active, setActive] = useState<MenuKey>("nutzung");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isAdmin } = useAuth();

  return (
    <div className="flex min-h-screen bg-zinc-50 dark:bg-black font-sans">
      {/* Left menu - Hidden on mobile */}
      <aside className="hidden md:flex md:w-64 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0b0b0b] px-6 py-8 flex-col">
        <div className="flex items-center mb-8">
          <Image src="/fleettrack-logo.svg" alt="FleetTrack Logo" width={120} height={120} className="dark:invert" />
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 -ml-3">FleetTrack</h2>
        </div>

        <nav className="flex flex-col gap-2">
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

          {/* Admin-only menu items */}
          {isAdmin && (
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
                Flottenübersicht
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
                Fahrzeug erfassen
              </button>
            </>
          )}
        </nav>

        {/* User Menu at bottom */}
        <div className="mt-auto pt-4 border-t border-zinc-200 dark:border-zinc-800">
          <UserMenu />
        </div>
      </aside>

      {/* Mobile header */}
      <div className="md:hidden fixed top-0 left-0 right-0 bg-white dark:bg-[#0b0b0b] border-b border-zinc-200 dark:border-zinc-800 px-5 py-4 flex items-center justify-between z-50">
        <div className="flex items-center">
          <Image src="/fleettrack-logo.svg" alt="FleetTrack Logo" width={72} height={72} className="dark:invert" />
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50 -ml-2">FleetTrack</h2>
        </div>
        <button 
          onClick={() => setMobileMenuOpen(true)}
          className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-md transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {/* Mobile menu overlay */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileMenuOpen(false)} />
          <div className="absolute right-0 top-0 bottom-0 w-64 bg-white dark:bg-[#0b0b0b] border-l border-zinc-200 dark:border-zinc-800 px-6 py-8 flex flex-col">
            <button 
              onClick={() => setMobileMenuOpen(false)}
              className="absolute top-4 right-4 p-2 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-md transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="flex items-center mb-8 mt-8">
              <Image src="/fleettrack-logo.svg" alt="FleetTrack Logo" width={120} height={120} className="dark:invert" />
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 -ml-3">FleetTrack</h2>
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
                Nutzung erfassen
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
                Übersicht Nutzungen
              </button>

              {isAdmin && (
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
        {active === "uebersicht" && (isAdmin ? <FlottenUebersicht /> : <AccessDenied />)}
        {active === "fahrzeug" && (isAdmin ? <FahrzeugErfassen /> : <AccessDenied />)}
      </main>
    </div>
  );
}

function AccessDenied() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center space-y-4">
        <div className="text-6xl">🔒</div>
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          Zugriff verweigert
        </h2>
        <p className="text-zinc-600 dark:text-zinc-400">
          Diese Funktion ist nur für Administratoren verfügbar.
        </p>
      </div>
    </div>
  );
}