/**
 * Fahrzeuge erfassen ihren Zählerstand entweder in Betriebsstunden oder in
 * Kilometern. Die Erfassung selbst ist identisch (Start-/Endstand), nur die
 * Bedeutung/Einheit unterscheidet sich: Pistenfahrzeuge laufen auf
 * Betriebsstunden, alle anderen Fahrzeugtypen (Transporter, Quad, Skidoo, …
 * inkl. Fahrzeuge ohne gesetzten Typ) auf Kilometern.
 *
 * Das Datenmodell speichert weiterhin `startOperatingHours` / `endOperatingHours`
 * – für Kilometer-Fahrzeuge sind das schlicht Kilometerstände.
 */
export function vehicleUsesKm(vehicleType?: string | null): boolean {
  return (vehicleType ?? '').trim() !== 'Pistenfahrzeug'
}

/** Nachkommastellen für die Anzeige des Zählerstands (Stunden: 1, Kilometer: 0). */
export function counterDecimals(usesKm: boolean): number {
  return usesKm ? 0 : 1
}
