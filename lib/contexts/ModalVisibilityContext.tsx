'use client';

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';

interface ModalVisibilityContextType {
  isAnyModalOpen: boolean;
  // Meldet an, dass genau EIN Modal/Dialog offen ist - gibt eine
  // Abmelde-Funktion zurueck, die beim Schliessen/Unmounten aufgerufen werden
  // muss. In der Praxis nicht direkt aufrufen, sondern ueber
  // useRegisterModalOpen() unten.
  registerOpenModal: () => () => void;
}

// Default (kein Provider in der Baumstruktur): no-op statt zu werfen - rein
// kosmetisches Feature (BottomNav waehrend eines Modals ausblenden), das in
// jedem Komponententest einen eigenen Mock zu verlangen waere unverhaeltnis-
// maessig; ohne Provider bleibt die BottomNav einfach immer sichtbar.
const noopContextValue: ModalVisibilityContextType = {
  isAnyModalOpen: false,
  registerOpenModal: () => () => {},
};

const ModalVisibilityContext = createContext<ModalVisibilityContextType>(noopContextValue);

/**
 * Zaehlt, wie viele der fixed-inset-0-Dialoge (ConfirmDialog, UsageEditDialog,
 * VehicleDetail-Bearbeiten-Modal, usw.) gerade gleichzeitig offen sind - damit
 * die BottomNav sich waehrenddessen ausblenden kann (siehe BottomNav.tsx).
 * Hintergrund: auf manchen mobilen Browsern (insbesondere nach Fokuswechseln
 * durch die Bildschirmtastatur beim Ausfuellen eines Formulars) rendert die
 * per position:fixed+z-40 eigentlich tiefer liegende BottomNav trotzdem ueber
 * dem per z-50 verdunkelten Modal-Hintergrund durch - ein bekanntes
 * Darstellungsproblem von position:fixed auf Android Chrome. Die BottomNav
 * waehrend eines offenen Modals komplett zu entfernen umgeht das zuverlaessig,
 * statt sich auf die (dort fehlerhafte) z-index-Berechnung zu verlassen.
 */
export function ModalVisibilityProvider({ children }: { children: ReactNode }) {
  const [openCount, setOpenCount] = useState(0);

  const registerOpenModal = useCallback(() => {
    setOpenCount((count) => count + 1);
    let unregistered = false;
    return () => {
      if (unregistered) return;
      unregistered = true;
      setOpenCount((count) => Math.max(0, count - 1));
    };
  }, []);

  return (
    <ModalVisibilityContext.Provider value={{ isAnyModalOpen: openCount > 0, registerOpenModal }}>
      {children}
    </ModalVisibilityContext.Provider>
  );
}

export function useModalVisibility() {
  return useContext(ModalVisibilityContext);
}

/**
 * Meldet eine Modal-Komponente an, solange `isOpen` true ist - meldet sich
 * beim Schliessen (isOpen wird false) oder beim Unmounten automatisch wieder
 * ab. Am Anfang der Komponente aufrufen, VOR einem bedingten "return null"
 * (Hooks-Regel).
 */
export function useRegisterModalOpen(isOpen: boolean) {
  const { registerOpenModal } = useModalVisibility();

  useEffect(() => {
    if (!isOpen) return;
    return registerOpenModal();
  }, [isOpen, registerOpenModal]);
}
