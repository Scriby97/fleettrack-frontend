import { authenticatedFetch } from './authenticatedFetch';
import { buildApiUrl } from './url';
import { throwApiError } from './ApiError';

export interface Creator {
  id: string;
  firstName: string;
  lastName: string;
  // Fallback fuer die Anzeige, falls Vor-/Nachname fehlen (z.B. Accounts, die
  // vor der Vorname/Nachname-Pflicht bei der Registrierung angelegt wurden).
  email?: string;
}

export interface Usage {
  id: number | string;
  vehicleId?: string;
  startOperatingHours?: number;
  endOperatingHours?: number;
  fuelLitersRefilled?: number;
  usageDate?: string;
  creatorId?: string;
  creator?: Creator;
}

export interface Vehicle {
  id: string;
  name: string;
  plate?: string;
  vehicleType?: string;
}

export interface UsageWithVehicle extends Usage {
  vehicle: Vehicle;
  creator?: Creator;
}

export interface GetUsagesWithVehiclesResponse {
  usages: UsageWithVehicle[];
  // Cursor fuer die naechste Seite; null = keine weiteren Nutzungen.
  nextCursor: string | null;
}

export interface GetUsagesWithVehiclesOptions {
  // Optional, nur zusammen: begrenzt auf Nutzungen in diesem Zeitraum (ISO).
  startDate?: string;
  endDate?: string;
  // Seitengroesse (neueste zuerst). Ohne limit kommen alle Treffer auf einmal -
  // nur sinnvoll bei einem eng begrenzten Zeitraum (Kalender: Monat/Woche).
  limit?: number;
  // nextCursor der vorherigen Seite.
  cursor?: string;
  // Nur Nutzungen dieses einen Fahrzeugs (Nutzungen-Tab der Fahrzeug-Detailseite).
  vehicleId?: string;
  signal?: AbortSignal;
}

/**
 * Fetch usages with vehicle data included in a single request, newest first.
 * With `limit` the result is a page; pass the returned `nextCursor` as `cursor`
 * to load the next one.
 *
 * @param organizationId - Optional organization ID for filtering (used by super admins)
 */
export async function getUsagesWithVehicles(
  organizationId?: string,
  options: GetUsagesWithVehiclesOptions = {},
): Promise<GetUsagesWithVehiclesResponse> {
  const url = new URL(buildApiUrl('/usages/with-vehicles'));
  if (organizationId) {
    url.searchParams.set('organizationId', organizationId);
  }
  if (options.startDate && options.endDate) {
    url.searchParams.set('startDate', options.startDate);
    url.searchParams.set('endDate', options.endDate);
  }
  if (options.limit) {
    url.searchParams.set('limit', String(options.limit));
  }
  if (options.cursor) {
    url.searchParams.set('cursor', options.cursor);
  }
  if (options.vehicleId) {
    url.searchParams.set('vehicleId', options.vehicleId);
  }

  const response = await authenticatedFetch(url.toString(), {
    signal: options.signal,
    // Nachladen beim Scrollen soll nicht den globalen Ladeindikator aufblitzen lassen.
    skipLoadingIndicator: Boolean(options.cursor),
  });

  if (!response.ok) {
    await throwApiError(response, `HTTP ${response.status}`);
  }

  const data: GetUsagesWithVehiclesResponse = await response.json();
  return { usages: data.usages, nextCursor: data.nextCursor ?? null };
}

export interface InconsistentUsagePair {
  type: 'gap' | 'overlap';
  hours: number;
  previous: UsageWithVehicle;
  current: UsageWithVehicle;
}

/**
 * Pairs of chronologically consecutive usages of a vehicle that don't
 * connect seamlessly (a gap or an overlap between them) - powers the "only
 * inconsistent usages" filter in the vehicle detail page's Nutzungen tab.
 */
export async function getInconsistentPairs(
  vehicleId: string,
  options: { organizationId?: string; signal?: AbortSignal } = {},
): Promise<InconsistentUsagePair[]> {
  const url = new URL(buildApiUrl('/usages/inconsistent-pairs'));
  url.searchParams.set('vehicleId', vehicleId);
  if (options.organizationId) {
    url.searchParams.set('organizationId', options.organizationId);
  }

  const response = await authenticatedFetch(url.toString(), {
    signal: options.signal,
  });

  if (!response.ok) {
    await throwApiError(response, `HTTP ${response.status}`);
  }

  const data: { pairs: InconsistentUsagePair[] } = await response.json();
  return data.pairs ?? [];
}
