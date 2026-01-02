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

// Navigation icons (simple SVG icons)
const NavIcons = {
  nutzung: (
    <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  ),
  uebersichtEintraege: (
    <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
  ),
  uebersicht: (
    <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
    </svg>
  ),
  fahrzeug: (
    <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
    </svg>
  ),
};

export default function Home() {
  const [active, setActive] = useState<MenuKey>("nutzung");
  const { isAdmin } = useAuth();

  const menuItems = [
    { key: "nutzung" as MenuKey, label: "Erfassen", shortLabel: "Erfassen", icon: NavIcons.nutzung, adminOnly: false },
    { key: "uebersichtEintraege" as MenuKey, label: "Nutzungen", shortLabel: "Liste", icon: NavIcons.uebersichtEintraege, adminOnly: false },
    { key: "uebersicht" as MenuKey, label: "Flotte", shortLabel: "Flotte", icon: NavIcons.uebersicht, adminOnly: true },
    { key: "fahrzeug" as MenuKey, label: "Fahrzeug", shortLabel: "Neu", icon: NavIcons.fahrzeug, adminOnly: true },
  ];

  const visibleMenuItems = menuItems.filter(item => !item.adminOnly || isAdmin);

  return (
    <div className="flex flex-col h-screen bg-[var(--background)] md:flex-row">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:w-64 border-r border-[var(--border)] flex-col">
        <div className="p-6 border-b border-[var(--border)]">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-12 h-12 rounded-2xl bg-[var(--primary)] flex items-center justify-center text-white font-bold text-xl">
              FT
            </div>
            <h2 className="text-2xl font-bold text-[var(--foreground)]">FleetTrack</h2>
          </div>
          <p className="text-sm text-[var(--secondary)] mt-1 ml-15">Flottenverwaltung</p>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {visibleMenuItems.map((item) => (
            <button
              key={item.key}
              onClick={() => setActive(item.key)}
              className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-base transition-all ${
                active === item.key
                  ? "bg-[var(--primary)] text-white shadow-lg"
                  : "bg-[var(--card-bg)] text-[var(--foreground)] hover:bg-[var(--hover)]"
              }`}
            >
              <div className="w-6 h-6 flex-shrink-0">
                {item.icon}
              </div>
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-[var(--border)]">
          <UserMenu />
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="md:hidden flex items-center justify-between px-4 py-3 border-b border-[var(--border)] bg-[var(--background)]">
        <h1 className="text-lg font-bold text-[var(--foreground)]">FleetTrack</h1>
        <UserMenu />
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto pb-24 md:pb-0">
        <div className="px-5 py-6 md:px-8 md:py-8 max-w-4xl mx-auto">
          {active === "nutzung" && <CreateUsage />}
          {active === "uebersichtEintraege" && <UebersichtEintraege />}
          {active === "uebersicht" && (isAdmin ? <FlottenUebersicht /> : <AccessDenied />)}
          {active === "fahrzeug" && (isAdmin ? <FahrzeugErfassen /> : <AccessDenied />)}
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[var(--background)] border-t border-[var(--border)] z-50 pb-safe">
        <div className="flex h-20">
          {visibleMenuItems.map((item) => (
            <button
              key={item.key}
              onClick={() => setActive(item.key)}
              className={`flex-1 flex flex-col items-center justify-center gap-1.5 transition-colors ${
                active === item.key ? "text-[var(--primary)]" : "text-[var(--secondary)]"
              }`}
            >
              <div className="w-7 h-7">
                {item.icon}
              </div>
              <span className="text-xs font-medium">{item.shortLabel}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}

function AccessDenied() {
  return (
    <div className="flex items-center justify-center h-full min-h-[60vh]">
      <div className="text-center space-y-4 p-6">
        <div className="text-6xl">🔒</div>
        <h2 className="text-2xl font-bold text-[var(--foreground)]">
          Zugriff verweigert
        </h2>
        <p className="text-[var(--secondary)]">
          Diese Funktion ist nur für Administratoren verfügbar.
        </p>
      </div>
    </div>
  );
}