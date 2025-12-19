'use client';

import Image from "next/image";
import { useState } from "react";
import CreateUsage from "./components/createUsage";
import UebersichtEintraege from "./components/usages";
import FlottenUebersicht from "./components/vehicles";
import FahrzeugErfassen from "./components/createVehicle";

type MenuKey = "nutzung" | "uebersichtEintraege" | "uebersicht" | "fahrzeug";

export default function Home() {
  const [active, setActive] = useState<MenuKey>("nutzung");

  return (
    <div className="flex min-h-screen bg-zinc-50 dark:bg-black font-sans">
      {/* Left menu */}
      <aside className="w-64 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0b0b0b] px-6 py-8">
        <div className="flex items-center gap-3 mb-8">
          <Image src="/next.svg" alt="logo" width={36} height={24} className="dark:invert" />
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">FleetTrack</h2>
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
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-10">
        {active === "nutzung" && <CreateUsage />}
        {active === "uebersichtEintraege" && <UebersichtEintraege />}
        {active === "uebersicht" && <FlottenUebersicht />}
        {active === "fahrzeug" && <FahrzeugErfassen />}
      </main>
    </div>
  );
}