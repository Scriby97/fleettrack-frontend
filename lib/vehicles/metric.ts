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

/**
 * Zählt die Nachkommastellen eines rohen Zahlen-Inputs (String aus einem
 * <input type="number">) - für die eigene, übersetzte Validierung von
 * `maxDecimalPlaces`/`step`-Grenzen. Die native HTML5-Validierung
 * (step-Attribut) meldet eine Zu-viele-Nachkommastellen-Eingabe sonst nur mit
 * einem Browser-eigenen, nie übersetzten Tooltip ("Please enter a valid
 * value...") - unabhängig von der UI-Sprache der Seite. Über einen String
 * statt parseFloat(), weil Fliesskomma-Vergleiche (z.B. wert * 10 % 1) durch
 * Rundungsfehler unzuverlässig sind.
 */
export function decimalPlaces(raw: string): number {
  const dotIndex = raw.indexOf('.')
  return dotIndex === -1 ? 0 : raw.length - dotIndex - 1
}
