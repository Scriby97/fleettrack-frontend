'use client';

import { useState, useEffect, useRef, useCallback, type FC } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { authenticatedFetch } from '@/lib/api/authenticatedFetch';
import { buildApiUrl, getApiBaseUrlOrNull } from '@/lib/api/url';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useOrganization } from '@/lib/contexts/OrganizationContext';
import { useFleetConsistency } from '@/lib/contexts/FleetConsistencyContext';
import { VehicleTypeIcon } from './VehicleTypeIcon';
import { InconsistencyBadge } from './InconsistencyBadge';
import VehicleDetail from './VehicleDetail';
import ExportFleetModal from './ExportFleetModal';
import { defaultRangeStart, defaultRangeEnd } from '@/lib/dates/rangeDefaults';

export interface Vehicle {
  id: string;
  name: string;
  plate: string;
  snowsatNumber?: string;
  isRetired?: boolean;
  location?: string;
  vehicleType?: string;
  fuelType?: string;
  notes?: string;
}

// Shape of each element returned by the /vehicles/stats endpoint (fields vary by backend)
interface StatsArrayItem {
  vehicleId?: string;
  id?: string;
  vehicle?: string;
  name?: string;
  vehicleName?: string;
  plate?: string;
  kennzeichen?: string;
  registration?: string;
  snowsatNumber?: string;
  SNOWsatNumber?: string;
  snowsat?: string;
  isRetired?: boolean;
  location?: string;
  ort?: string;
  vehicleType?: string;
  type?: string;
  typ?: string;
  fuelType?: string;
  fuel?: string;
  treibstoff?: string;
  notes?: string;
  bemerkung?: string;
  remarks?: string;
}

interface StatsObjectValue {
  name?: string;
  vehicleName?: string;
  plate?: string;
  kennzeichen?: string;
  snowsatNumber?: string;
  SNOWsatNumber?: string;
  snowsat?: string;
  isRetired?: boolean;
  location?: string;
  ort?: string;
  vehicleType?: string;
  type?: string;
  typ?: string;
  fuelType?: string;
  fuel?: string;
  treibstoff?: string;
  notes?: string;
  bemerkung?: string;
  remarks?: string;
}

interface VehicleItemProps {
  vehicle: Vehicle;
  onSelect: (id: string) => void;
}

const VehicleItem: FC<VehicleItemProps> = ({ vehicle, onSelect }) => {
  const t = useTranslations('fleetOverview');
  const { inconsistentVehicleIds } = useFleetConsistency();
  const hasInconsistentUsages = inconsistentVehicleIds.has(vehicle.id);

  return (
    <button
      onClick={() => onSelect(vehicle.id)}
      className="w-full text-left rounded-lg border border-zinc-200 dark:border-zinc-700 p-4 hover:shadow-md hover:border-blue-300 dark:hover:border-blue-600 transition-all flex items-center gap-3"
    >
      <span className="relative w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0">
        <VehicleTypeIcon
          type={vehicle.vehicleType}
          className="w-5 h-5 text-blue-600 dark:text-blue-400"
        />
        {hasInconsistentUsages && <InconsistencyBadge className="absolute -top-1 -right-1" />}
      </span>
      <div className="min-w-0 flex-1">
        <h3 className="font-semibold text-zinc-900 dark:text-zinc-50 truncate">
          {vehicle.name}
          {vehicle.isRetired && (
            <span className="ml-2 text-sm font-normal text-red-600 dark:text-red-400">({t('retiredLabel')})</span>
          )}
        </h3>
        <div className="mt-0.5 flex flex-wrap gap-x-4 gap-y-0.5 text-sm text-zinc-600 dark:text-zinc-400">
          {vehicle.snowsatNumber && (
            <span>{t('snowsatLabel')}: <span className="font-medium">{vehicle.snowsatNumber}</span></span>
          )}
          <span>{t('plateLabel')}: <span className="font-medium">{vehicle.plate}</span></span>
        </div>
      </div>
      <svg className="w-5 h-5 shrink-0 text-zinc-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 18l6-6-6-6" />
      </svg>
    </button>
  );
};

const RANGE_STORAGE_KEY = 'fleettrack:vehicleRange';

// Sortierung der Flottenliste: zuerst nach Fahrzeugtyp in fester Reihenfolge
// (Pistenfahrzeug, dann Transporter/ohne Typ, dann Quad, dann Skidoo), innerhalb
// desselben Typs nach SNOWsat-Nummer (natürliche Zahlenreihenfolge).
const TYPE_ORDER: Record<string, number> = { Pistenfahrzeug: 0, Quad: 2, Skidoo: 3 };
export const typeRank = (type?: string): number =>
  type && type in TYPE_ORDER ? TYPE_ORDER[type] : 1;

// Gruppenüberschriften der Flottenliste, in Sortier-/Anzeigereihenfolge -
// dieselben Gruppen werden auch als Fahrzeugtyp-Filter im Excel-Export verwendet.
export const VEHICLE_GROUPS = [
  { rank: 0, labelKey: 'fleetGroupGroomer' },
  { rank: 1, labelKey: 'fleetGroupTransporter' },
  { rank: 2, labelKey: 'fleetGroupQuad' },
  { rank: 3, labelKey: 'fleetGroupSkidoo' },
] as const;

const sortVehicles = (list: Vehicle[]): Vehicle[] =>
  [...list].sort((a, b) => {
    const byType = typeRank(a.vehicleType) - typeRank(b.vehicleType);
    if (byType !== 0) return byType;
    const sa = a.snowsatNumber?.trim() ?? '';
    const sb = b.snowsatNumber?.trim() ?? '';
    if (!sa !== !sb) return sa ? -1 : 1; // Fahrzeuge ohne SNOWsat-Nr ans Ende
    return sa.localeCompare(sb, undefined, { numeric: true, sensitivity: 'base' });
  });

interface FlottenUebersichtProps {
  onAddVehicle?: () => void;
}

const FlottenUebersicht: FC<FlottenUebersichtProps> = ({ onAddVehicle }) => {
  const { isAdmin } = useAuth();
  const { organizations, selectedOrgId, setSelectedOrgId } = useOrganization();
  const t = useTranslations('fleetOverview');
  const tCommon = useTranslations('common');
  const tNav = useTranslations('nav');
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showActionsMenu, setShowActionsMenu] = useState(false);

  // Schliessen bei Escape - gleiches Muster wie OrgSwitcher.
  useEffect(() => {
    if (!showActionsMenu) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setShowActionsMenu(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [showActionsMenu]);

  // Die Detailansicht wird bewusst über einen URL-Parameter (nicht lokalen
  // State) gesteuert: so legt jeder Fahrzeug-Aufruf einen Browser-Verlauf-
  // Eintrag an. Der "Zurück"-Swipe/-Button auf Android schliesst sonst die
  // ganze App, statt (wie erwartet) zur Flottenliste zurückzukehren, weil es
  // ohne History-Eintrag nichts zum "Zurückgehen" gibt.
  const selectedVehicleId = searchParams.get('vehicleId');
  const selectVehicle = (id: string) => router.push(`${pathname}?vehicleId=${id}`);
  const backToList = () => router.back();

  // Zeitraum lebt hier (nicht in der Detailansicht), damit er beim Wechsel
  // zwischen Fahrzeugen erhalten bleibt; persistiert in localStorage, sobald
  // der User ihn anpasst.
  const [range, setRange] = useState<{ start: string; end: string }>(() => ({
    start: defaultRangeStart(),
    end: defaultRangeEnd(),
  }));
  const rangeLoadedRef = useRef(false);

  useEffect(() => {
    if (rangeLoadedRef.current) return;
    rangeLoadedRef.current = true;
    try {
      const raw = window.localStorage.getItem(RANGE_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed.start === 'string' && typeof parsed.end === 'string') {
          setRange(parsed);
        }
      }
    } catch {
      // localStorage nicht verfügbar - Default gilt für diese Sitzung
    }
  }, []);

  const handleRangeChange = useCallback((next: { start: string; end: string }) => {
    setRange(next);
    try {
      window.localStorage.setItem(RANGE_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  }, []);

  // Fahrzeugliste (ohne Zeitraum-Parameter - /vehicles/stats liefert alle
  // Fahrzeuge inkl. ausgemusterte + vehicleType fürs Icon).
  useEffect(() => {
    const apiBaseUrl = getApiBaseUrlOrNull();
    if (!apiBaseUrl) return;
    if (!selectedOrgId) return;

    const controller = new AbortController();
    const fetchVehicles = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const url = new URL(buildApiUrl('/vehicles/stats'));
        url.searchParams.set('organizationId', selectedOrgId);

        const res = await authenticatedFetch(url.toString(), { signal: controller.signal });
        if (!res.ok) throw new Error(`Vehicles stats HTTP ${res.status}`);
        const statsData = await res.json();

        const list: Vehicle[] = [];
        const readCommon = (s: StatsArrayItem | StatsObjectValue, id: string): Vehicle => ({
          id,
          name: s.name ?? s.vehicleName ?? (s as StatsArrayItem).vehicle ?? t('vehicleFallbackName', { id }),
          plate: s.plate ?? s.kennzeichen ?? (s as StatsArrayItem).registration ?? '',
          snowsatNumber: s.snowsatNumber ?? s.SNOWsatNumber ?? s.snowsat ?? undefined,
          isRetired: Boolean(s.isRetired),
          location: s.location ?? s.ort ?? undefined,
          vehicleType: s.vehicleType ?? s.type ?? s.typ ?? undefined,
          fuelType: s.fuelType ?? s.fuel ?? s.treibstoff ?? undefined,
          notes: s.notes ?? s.bemerkung ?? s.remarks ?? undefined,
        });

        if (Array.isArray(statsData)) {
          statsData.forEach((s: StatsArrayItem) => {
            const id = String(s.vehicleId ?? s.id ?? s.vehicle ?? '');
            list.push(readCommon(s, id));
          });
        } else if (statsData && typeof statsData === 'object') {
          Object.entries(statsData as Record<string, StatsObjectValue>).forEach(([k, obj]) => {
            list.push(readCommon(obj, String(k)));
          });
        } else {
          throw new Error('Unexpected stats response format');
        }

        setVehicles(sortVehicles(list));
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return;
        console.error('Fehler beim Laden der Fahrzeuge:', err);
        setError(t('statsLoadError'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchVehicles();
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedOrgId, reloadKey]);

  const selectedVehicle = vehicles.find((v) => v.id === selectedVehicleId) ?? null;

  if (selectedVehicleId && selectedVehicle) {
    return (
      <VehicleDetail
        initialVehicle={selectedVehicle}
        rangeStart={range.start}
        rangeEnd={range.end}
        onRangeChange={handleRangeChange}
        onBack={backToList}
        onChanged={() => setReloadKey((k) => k + 1)}
        onDeleted={() => {
          setReloadKey((k) => k + 1);
          backToList();
        }}
      />
    );
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-zinc-50">
            {t('title')}
          </h1>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mt-2">
            {isAdmin && organizations.length > 0 && (
              <div className="flex items-center gap-2">
                <label htmlFor="fleetOrgSelect" className="text-sm text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
                  {tCommon('organizationLabel')}:
                </label>
                <select
                  id="fleetOrgSelect"
                  value={selectedOrgId || ''}
                  onChange={(e) => setSelectedOrgId(e.target.value)}
                  className="flex-1 sm:flex-initial px-3 py-1.5 text-sm border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-purple-500"
                >
                  {organizations.map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              {t('vehiclesInFleetCount', { count: vehicles.length })}
            </p>
          </div>
        </div>
        <div className="shrink-0 flex items-center gap-2">
          {/* Desktop: eigener Button, genug Platz vorhanden (kein "+", das gibt es dort schon in der Seitenleiste) */}
          {vehicles.length > 0 && (
            <button
              onClick={() => setShowExportModal(true)}
              className="hidden md:inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg border border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 15V3m0 12l-4-4m4 4l4-4M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" />
              </svg>
              {t('exportButton')}
            </button>
          )}

          {/* Mobile: Excel-Export hinter einem "..."-Menü. "Fahrzeug hinzufügen" lebt
              stattdessen als schwebender Button (siehe weiter unten). */}
          {vehicles.length > 0 && (
            <div className="relative md:hidden">
              <button
                type="button"
                onClick={() => setShowActionsMenu((value) => !value)}
                className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                aria-haspopup="menu"
                aria-expanded={showActionsMenu}
                aria-label={tCommon('moreActions')}
                title={tCommon('moreActions')}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <circle cx="12" cy="5" r="2" />
                  <circle cx="12" cy="12" r="2" />
                  <circle cx="12" cy="19" r="2" />
                </svg>
              </button>

              {showActionsMenu && (
                <>
                  <div
                    className="fixed inset-0 z-20"
                    onClick={() => setShowActionsMenu(false)}
                    aria-hidden="true"
                  />
                  <div
                    role="menu"
                    className="absolute right-0 top-full z-30 mt-1 w-52 overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-lg"
                  >
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setShowActionsMenu(false);
                        setShowExportModal(true);
                      }}
                      className="flex w-full items-center gap-2.5 px-4 py-3 text-left text-sm font-medium text-zinc-900 dark:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                    >
                      <span className="flex items-center justify-center w-[26px] h-[26px] rounded-md bg-zinc-100 dark:bg-zinc-800 shrink-0">
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 15V3m0 12l-4-4m4 4l4-4M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" />
                        </svg>
                      </span>
                      {t('exportButton')}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Schwebender "Fahrzeug hinzufügen"-Button (nur Mobile, oberhalb der BottomNav) */}
      {onAddVehicle && (
        <button
          type="button"
          onClick={onAddVehicle}
          className="md:hidden fixed bottom-24 right-4 z-30 flex items-center justify-center w-14 h-14 rounded-full bg-signal-600 hover:bg-signal-700 text-white shadow-lg shadow-signal-950/30 transition-colors"
          aria-label={tNav('createVehicle')}
          title={tNav('createVehicle')}
        >
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
      )}

      {isLoading && (
        <div className="rounded-lg border border-dashed border-zinc-300 dark:border-zinc-600 p-4 text-center">
          <p className="text-zinc-600 dark:text-zinc-400">{t('loadingVehicles')}</p>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4">
          <p className="text-sm text-red-900 dark:text-red-100">{error}</p>
        </div>
      )}

      {!isLoading && vehicles.length > 0 ? (
        <div className="space-y-6">
          {VEHICLE_GROUPS.map((group) => {
            const items = vehicles.filter((v) => typeRank(v.vehicleType) === group.rank);
            if (items.length === 0) return null;
            return (
              <div key={group.rank} className="space-y-3">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  {t(group.labelKey)}
                </h2>
                <div className="grid gap-3">
                  {items.map((vehicle) => (
                    <VehicleItem key={vehicle.id} vehicle={vehicle} onSelect={selectVehicle} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        !isLoading && (
          <div className="rounded-lg border border-dashed border-zinc-300 dark:border-zinc-600 p-8 text-center">
            <p className="text-zinc-600 dark:text-zinc-400">{t('noVehiclesFound')}</p>
          </div>
        )
      )}

      {showExportModal && (
        <ExportFleetModal
          vehicles={vehicles}
          organizationName={organizations.find((org) => org.id === selectedOrgId)?.name}
          initialRangeStart={range.start}
          initialRangeEnd={range.end}
          onClose={() => setShowExportModal(false)}
        />
      )}

    </section>
  );
};

export default FlottenUebersicht;
