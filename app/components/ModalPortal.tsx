'use client';

import { createPortal } from 'react-dom';
import type { ReactNode } from 'react';

/**
 * Rendert sein Kind direkt als Kind von <body>, statt an der Stelle im
 * React-Baum, an der es steht - behebt ein auf manchen mobilen Browsern
 * beobachtetes Darstellungsproblem: ein "fixed inset-0"-Modal (z.B. das
 * Fahrzeug-bearbeiten-Fenster) deckte dort nicht zuverlaessig den kompletten
 * sichtbaren Bildschirm ab, sodass am unteren Rand noch echter Seiteninhalt
 * durchschien, obwohl rein rechnerisch (z-index, inset-0) alles korrekt war.
 * Ursache vermutlich ein Containing-Block-Sonderfall irgendwo im Elternbaum,
 * den ein Portal direkt an <body> umgeht, unabhaengig von der genauen Ursache.
 */
export function ModalPortal({ children }: { children: ReactNode }) {
  if (typeof document === 'undefined') return null;
  return createPortal(children, document.body);
}
