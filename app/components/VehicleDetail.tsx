'use client';

import { useCallback, useEffect, useRef, useState, type FC, type FormEvent } from 'react';
import { useTranslations } from 'next-intl';
import { useDateLocale } from '@/lib/i18n/formatDate';
import { authenticatedFetch } from '@/lib/api/authenticatedFetch';
import { buildApiUrl } from '@/lib/api/url';
import { throwApiError } from '@/lib/api/ApiError';
import { useApiErrorMessage } from '@/lib/i18n/useApiErrorMessage';
import { useToast } from '@/lib/hooks/useToast';
import { useOrganization } from '@/lib/contexts/OrganizationContext';
import { ToastContainer } from './Toast';
import { ConfirmDialog } from './ConfirmDialog';
import { VehicleTypeIcon } from './VehicleTypeIcon';
import { ActivityBarChart } from './ActivityBarChart';
import { vehicleUsesKm, counterDecimals } from '@/lib/vehicles/metric';
import { getVehicleUsageHistory, type VehicleUsageHistory } from '@/lib/api/vehicles';
import { getUsagesWithVehicles, type UsageWithVehicle } from '@/lib/api/usages';

// Nutzungen-Tab: so viele Eintraege pro Seite, weitere laden beim Scrollen nach
// (gleiches Muster/gleiche Seitengroesse wie die Listenansicht der Nutzungsuebersicht).
const USAGES_PAGE_SIZE = 10;

interface VehicleUsageEntry {
  id: number | string;
  startOperatingHours: number;
  endOperatingHours: number;
  fuel: number;
  usageDate?: string;
  creatorId?: string;
  creatorFirstName?: string;
  creatorLastName?: string;
  creatorEmail?: string;
}

// Postgres numeric/decimal-Spalten kommen vom Backend als String - siehe
// gleichnamige Funktion in usages.tsx.
function toNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' ? value : Number(value ?? fallback);
}

function mapUsageEntry(u: UsageWithVehicle): VehicleUsageEntry {
  return {
    id: u.id,
    startOperatingHours: toNumber(u.startOperatingHours),
    endOperatingHours: toNumber(u.endOperatingHours),
    fuel: toNumber(u.fuelLitersRefilled),
    usageDate: u.usageDate,
    creatorId: u.creatorId,
    creatorFirstName: u.creator?.firstName,
    creatorLastName: u.creator?.lastName,
    creatorEmail: u.creator?.email,
  };
}

interface VehicleUsageItemProps {
  entry: VehicleUsageEntry;
  usesKm: boolean;
  canManage: boolean;
}

const VehicleUsageItem: FC<VehicleUsageItemProps> = ({ entry, usesKm, canManage }) => {
  const t = useTranslations('usagesOverview');
  const dateLocale = useDateLocale();
  const unit = usesKm ? 'km' : 'h';
  const fmt = (n: number) => (usesKm ? Math.round(n).toString() : n.toFixed(1));
  const creatorName = entry.creatorFirstName || entry.creatorLastName
    ? `${entry.creatorFirstName || ''} ${entry.creatorLastName || ''}`.trim()
    : entry.creatorEmail ?? null;

  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 p-4">
      <div className="space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
        {entry.usageDate && (
          <p>
            <span className="font-medium">{t('usageDateLabel')}:</span>{' '}
            {new Date(entry.usageDate).toLocaleString(dateLocale, { dateStyle: 'medium', timeStyle: 'short' })}
          </p>
        )}
        <p>
          <span className="font-medium">{usesKm ? t('startEndKmLabel') : t('startEndLabel')}</span>{' '}
          {fmt(entry.startOperatingHours)} {unit} — {fmt(entry.endOperatingHours)} {unit}{' '}
          <span className="font-medium">
            ({fmt(entry.endOperatingHours - entry.startOperatingHours)} {unit} {t('diffSuffix')})
          </span>
        </p>
        <p>
          <span className="font-medium">{t('fuelSummaryLabel')}</span> {entry.fuel} L
        </p>
        {canManage && creatorName && (
          <p>
            <span className="font-medium">{t('createdByLabel')}</span> {creatorName}
          </p>
        )}
      </div>
    </div>
  );
};

export interface DetailVehicle {
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

interface VehicleDetailProps {
  initialVehicle: DetailVehicle;
  rangeStart: string;
  rangeEnd: string;
  onRangeChange: (next: { start: string; end: string }) => void;
  onBack: () => void;
  /** Liste im Hintergrund neu laden (nach Bearbeiten). */
  onChanged: () => void;
  /** Zur Liste zurück + Liste neu laden (nach Löschen). */
  onDeleted: () => void;
}

const emptyEditForm = {
  name: '',
  plate: '',
  snowsatNumber: '',
  location: '',
  vehicleType: '',
  fuelType: '',
  notes: '',
};

const VehicleDetail = ({
  initialVehicle,
  rangeStart,
  rangeEnd,
  onRangeChange,
  onBack,
  onChanged,
  onDeleted,
}: VehicleDetailProps) => {
  const t = useTranslations('fleetOverview');
  const tCommon = useTranslations('common');
  const tUsages = useTranslations('usagesOverview');
  const getApiErrorMessage = useApiErrorMessage();
  const { toasts, showToast, removeToast } = useToast();
  const { selectedOrgId, canManageSelectedOrganization } = useOrganization();

  const [tab, setTab] = useState<'overview' | 'usages'>('overview');

  const [history, setHistory] = useState<VehicleUsageHistory | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [metric, setMetric] = useState<'hours' | 'fuel'>('hours');

  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState(emptyEditForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Nutzungen-Tab: seitenweise geladen (neueste zuerst), nextCursor = null -> alles geladen.
  const [usageEntries, setUsageEntries] = useState<VehicleUsageEntry[]>([]);
  const [usagesNextCursor, setUsagesNextCursor] = useState<string | null>(null);
  const [isLoadingUsages, setIsLoadingUsages] = useState(false);
  const [isLoadingMoreUsages, setIsLoadingMoreUsages] = useState(false);
  const [loadMoreUsagesError, setLoadMoreUsagesError] = useState(false);
  const [usagesError, setUsagesError] = useState<string | null>(null);
  const usagesRequestRef = useRef(0);
  const loadingMoreUsagesRef = useRef(false);
  const usagesSentinelRef = useRef<HTMLDivElement | null>(null);

  const rangeInvalid =
    Boolean(rangeStart) && Boolean(rangeEnd) && new Date(rangeStart) > new Date(rangeEnd);

  const vehicle = history?.vehicle ?? initialVehicle;
  // Pistenfahrzeuge: Betriebsstunden; alle anderen Typen: Kilometer.
  const usesKm = vehicleUsesKm(vehicle.vehicleType);
  const counterUnit = usesKm ? t('chartKmUnit') : t('chartHoursUnit');
  const fmtCounter = (n: number) => (usesKm ? Math.round(n).toString() : n.toFixed(1));

  useEffect(() => {
    if (!rangeStart || !rangeEnd || rangeInvalid) return;

    const controller = new AbortController();
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await getVehicleUsageHistory(initialVehicle.id, {
          startDate: new Date(rangeStart).toISOString(),
          endDate: new Date(rangeEnd).toISOString(),
          signal: controller.signal,
        });
        setHistory(data);
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return;
        console.error('Fehler beim Laden des Nutzungsverlaufs:', err);
        setError(t('historyLoadError'));
      } finally {
        setIsLoading(false);
      }
    };

    load();
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialVehicle.id, rangeStart, rangeEnd, rangeInvalid, reloadKey]);

  // Nutzungen-Tab: erste Seite (neueste zuerst) erst laden, wenn der Tab
  // tatsaechlich geoeffnet wird - spart den Request, solange niemand hinschaut.
  useEffect(() => {
    if (tab !== 'usages') return;

    const requestRef = usagesRequestRef;
    const requestId = ++requestRef.current;
    const controller = new AbortController();
    loadingMoreUsagesRef.current = false;

    const fetchFirstPage = async () => {
      setIsLoadingUsages(true);
      setIsLoadingMoreUsages(false);
      setLoadMoreUsagesError(false);
      setUsagesError(null);

      try {
        const page = await getUsagesWithVehicles(selectedOrgId ?? undefined, {
          vehicleId: initialVehicle.id,
          limit: USAGES_PAGE_SIZE,
          signal: controller.signal,
        });
        if (requestId !== usagesRequestRef.current) return;

        setUsageEntries(page.usages.map(mapUsageEntry));
        setUsagesNextCursor(page.nextCursor);
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return;
        if (requestId !== usagesRequestRef.current) return;
        console.error('Fehler beim Laden der Nutzungen des Fahrzeugs:', err);
        setUsageEntries([]);
        setUsagesNextCursor(null);
        setUsagesError(tUsages('loadError'));
      } finally {
        if (requestId === usagesRequestRef.current) setIsLoadingUsages(false);
      }
    };

    fetchFirstPage();

    return () => {
      requestRef.current++;
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, initialVehicle.id, selectedOrgId]);

  const loadMoreUsages = useCallback(async () => {
    if (!usagesNextCursor || loadingMoreUsagesRef.current) return;
    loadingMoreUsagesRef.current = true;
    const requestId = usagesRequestRef.current;
    setIsLoadingMoreUsages(true);
    setLoadMoreUsagesError(false);

    try {
      const page = await getUsagesWithVehicles(selectedOrgId ?? undefined, {
        vehicleId: initialVehicle.id,
        limit: USAGES_PAGE_SIZE,
        cursor: usagesNextCursor,
      });
      if (requestId !== usagesRequestRef.current) return;

      setUsageEntries((prev) => {
        const known = new Set(prev.map((e) => String(e.id)));
        const fresh = page.usages.filter((u) => !known.has(String(u.id))).map(mapUsageEntry);
        return [...prev, ...fresh];
      });
      setUsagesNextCursor(page.nextCursor);
    } catch (err) {
      if (requestId !== usagesRequestRef.current) return;
      console.error('Fehler beim Nachladen der Nutzungen des Fahrzeugs:', err);
      setLoadMoreUsagesError(true);
    } finally {
      if (requestId === usagesRequestRef.current) {
        loadingMoreUsagesRef.current = false;
        setIsLoadingMoreUsages(false);
      }
    }
  }, [usagesNextCursor, selectedOrgId, initialVehicle.id]);

  // Endlos-Scrollen: gleiches Muster wie die Listenansicht der Nutzungsuebersicht.
  useEffect(() => {
    const node = usagesSentinelRef.current;
    if (tab !== 'usages' || !node || !usagesNextCursor || isLoadingUsages || isLoadingMoreUsages || loadMoreUsagesError) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) void loadMoreUsages();
      },
      { rootMargin: '200px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [tab, usagesNextCursor, isLoadingUsages, isLoadingMoreUsages, loadMoreUsagesError, loadMoreUsages]);

  const openEdit = useCallback(() => {
    setEditForm({
      name: vehicle.name ?? '',
      plate: vehicle.plate ?? '',
      snowsatNumber: vehicle.snowsatNumber ?? '',
      location: vehicle.location ?? '',
      vehicleType: vehicle.vehicleType ?? '',
      fuelType: vehicle.fuelType ?? '',
      notes: vehicle.notes ?? '',
    });
    setError(null);
    setEditing(true);
  }, [vehicle]);

  const handleSaveEdit = async (event: FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      const payload = {
        name: editForm.name,
        plate: editForm.plate,
        snowsatNumber: editForm.snowsatNumber || undefined,
        location: editForm.location || undefined,
        vehicleType: editForm.vehicleType || undefined,
        fuelType: editForm.fuelType || undefined,
        notes: editForm.notes || undefined,
      };
      const res = await authenticatedFetch(buildApiUrl(`/vehicles/${initialVehicle.id}`), {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      if (!res.ok) await throwApiError(res, `API error ${res.status}`);

      setEditing(false);
      showToast(t('updateSuccess'), 'success');
      setReloadKey((k) => k + 1);
      onChanged();
    } catch (err) {
      console.error('Fehler beim Aktualisieren des Fahrzeugs:', err);
      setError(getApiErrorMessage(err, t('updateErrorGeneric')));
      showToast(t('updateErrorToast'), 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setConfirmDelete(false);
    try {
      const res = await authenticatedFetch(buildApiUrl(`/vehicles/${initialVehicle.id}`), {
        method: 'DELETE',
      });
      if (!res.ok) await throwApiError(res, t('deleteErrorGeneric', { status: res.status }));
      showToast(t('deleteSuccess'), 'success');
      onDeleted();
    } catch (err) {
      console.error('Fehler beim Löschen des Fahrzeugs:', err);
      showToast(getApiErrorMessage(err, t('deleteErrorToast')), 'error');
    }
  };

  const localizedType = (value?: string | null) => {
    if (value === 'Pistenfahrzeug') return t('vehicleTypeGroomer');
    if (value === 'Skidoo') return t('vehicleTypeSkidoo');
    if (value === 'Quad') return t('vehicleTypeQuad');
    return value || '—';
  };
  const localizedFuel = (value?: string | null) => {
    if (value === 'Diesel') return t('fuelTypeDiesel');
    if (value === 'Benzin') return t('fuelTypeGasoline');
    return value || '—';
  };

  const totals = history?.totals;

  const infoRows: Array<[string, string]> = [
    [t('plateLabel'), vehicle.plate || '—'],
    [t('snowsatLabel'), vehicle.snowsatNumber || '—'],
    [t('locationLabel'), vehicle.location || '—'],
    [t('typeLabel'), localizedType(vehicle.vehicleType)],
    [t('fuelTypeLabel'), localizedFuel(vehicle.fuelType)],
    [t('notesLabel'), vehicle.notes || '—'],
  ];

  return (
    <section className="space-y-6">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 18l-6-6 6-6" />
        </svg>
        {t('detailBackToList')}
      </button>

      {/* Kopf */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <VehicleTypeIcon type={vehicle.vehicleType} className="w-10 h-10 shrink-0 text-blue-600 dark:text-blue-400" />
          <div className="flex min-w-0 items-baseline gap-2">
            {/* Name und "ausgemustert"-Hinweis bewusst getrennt: nur der Name
                soll bei Platzmangel (v.a. Mobile) trunkieren - stünden beide im
                selben truncate-Element, würde der Hinweis bei langen Namen
                unsichtbar mit abgeschnitten. */}
            <h1 className="min-w-0 truncate text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-zinc-50">
              {vehicle.name}
            </h1>
            {vehicle.isRetired && (
              <span className="shrink-0 text-sm font-normal text-red-600 dark:text-red-400">
                ({t('retiredLabel')})
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={openEdit}
            className="p-2 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 transition-colors"
            title={tCommon('edit')}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            onClick={() => setConfirmDelete(true)}
            className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 transition-colors"
            title={tCommon('delete')}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex rounded-lg border border-zinc-300 dark:border-zinc-600 overflow-hidden text-sm w-fit">
        <button
          onClick={() => setTab('overview')}
          className={`px-4 py-1.5 font-medium transition-colors ${
            tab === 'overview'
              ? 'bg-signal-600 text-white'
              : 'bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700'
          }`}
        >
          {t('detailTabOverview')}
        </button>
        <button
          onClick={() => setTab('usages')}
          className={`px-4 py-1.5 font-medium transition-colors ${
            tab === 'usages'
              ? 'bg-signal-600 text-white'
              : 'bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700'
          }`}
        >
          {t('detailTabUsages')}
        </button>
      </div>

      {tab === 'overview' && (
        <>
          {/* Alle Infos */}
          <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-4">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 mb-3">{t('detailAllInfoTitle')}</h2>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
              {infoRows.map(([label, value]) => (
                <div key={label} className="flex gap-2">
                  <dt className="text-zinc-500 dark:text-zinc-400 shrink-0">{label}:</dt>
                  <dd className="font-medium text-zinc-900 dark:text-zinc-50 break-words">{value}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Zeitraum-Filter */}
          <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-4">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 mb-3">{t('filterSectionTitle')}</h2>
            <div className="flex flex-col sm:flex-row sm:items-end gap-3">
              <div className="flex-1 space-y-1">
                <label htmlFor="detailRangeStart" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  {t('filterStartLabel')}
                </label>
                <input
                  id="detailRangeStart"
                  type="datetime-local"
                  value={rangeStart}
                  onChange={(e) => onRangeChange({ start: e.target.value, end: rangeEnd })}
                  className="block w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-50 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div className="flex-1 space-y-1">
                <label htmlFor="detailRangeEnd" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  {t('filterEndLabel')}
                </label>
                <input
                  id="detailRangeEnd"
                  type="datetime-local"
                  value={rangeEnd}
                  onChange={(e) => onRangeChange({ start: rangeStart, end: e.target.value })}
                  className="block w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-50 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>
            {rangeInvalid && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{t('invalidRangeError')}</p>}
          </div>

          {isLoading && (
            <div className="rounded-lg border border-dashed border-zinc-300 dark:border-zinc-600 p-4 text-center">
              <p className="text-zinc-600 dark:text-zinc-400">{t('detailLoadingHistory')}</p>
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4">
              <p className="text-sm text-red-900 dark:text-red-100">{error}</p>
            </div>
          )}

          {!isLoading && !error && !rangeInvalid && totals && (
            <>
              {/* Kennzahlen */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <StatTile
                  label={usesKm ? t('kmInRange') : t('operatingHoursInRange')}
                  value={`${fmtCounter(totals.operatingHours)} ${counterUnit}`}
                />
                <StatTile label={t('fuelInRange')} value={`${Math.round(totals.fuelLiters)} ${t('chartFuelUnit')}`} />
                <StatTile
                  label={usesKm ? t('currentKm') : t('currentOperatingHours')}
                  value={totals.lastHours == null ? '—' : `${fmtCounter(totals.lastHours)} ${counterUnit}`}
                />
                <StatTile label={t('usageCountLabel')} value={String(totals.usageCount)} />
              </div>

              {/* Diagramm */}
              <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                  <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">{t('chartTitle')}</h2>
                  <div className="flex rounded-lg border border-zinc-300 dark:border-zinc-600 overflow-hidden text-xs">
                    <button
                      onClick={() => setMetric('hours')}
                      className={`px-3 py-1.5 font-medium transition-colors ${
                        metric === 'hours'
                          ? 'bg-signal-600 text-white'
                          : 'bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700'
                      }`}
                    >
                      {usesKm ? t('chartMetricKm') : t('chartMetricHours')}
                    </button>
                    <button
                      onClick={() => setMetric('fuel')}
                      className={`px-3 py-1.5 font-medium transition-colors ${
                        metric === 'fuel'
                          ? 'bg-signal-600 text-white'
                          : 'bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700'
                      }`}
                    >
                      {t('chartMetricFuel')}
                    </button>
                  </div>
                </div>
                <ActivityBarChart
                  daily={history?.daily ?? []}
                  metric={metric}
                  rangeStart={rangeStart}
                  rangeEnd={rangeEnd}
                  unitLabel={metric === 'hours' ? counterUnit : t('chartFuelUnit')}
                  decimals={metric === 'fuel' ? 0 : counterDecimals(usesKm)}
                  noDataLabel={t('chartNoData')}
                />
              </div>
            </>
          )}
        </>
      )}

      {tab === 'usages' && (
        <div className="space-y-3">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {isLoadingUsages
              ? tUsages('loadingUsages')
              : usagesNextCursor
                ? tUsages('usagesShownCountMore', { count: usageEntries.length })
                : tUsages('usagesFoundCount', { count: usageEntries.length })}
          </p>

          {usagesError && usageEntries.length === 0 && (
            <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4">
              <p className="text-sm text-red-900 dark:text-red-100">{usagesError}</p>
            </div>
          )}

          {isLoadingUsages ? (
            <div className="rounded-lg border border-dashed border-zinc-300 dark:border-zinc-600 p-4 text-center">
              <p className="text-zinc-600 dark:text-zinc-400">{tUsages('loadingUsagesEllipsis')}</p>
            </div>
          ) : usageEntries.length > 0 ? (
            <>
              <div className="grid gap-3">
                {usageEntries.map((entry) => (
                  <VehicleUsageItem
                    key={entry.id}
                    entry={entry}
                    usesKm={usesKm}
                    canManage={canManageSelectedOrganization}
                  />
                ))}
              </div>
              {usagesNextCursor && (
                <div ref={usagesSentinelRef} className="py-4 text-center">
                  {loadMoreUsagesError ? (
                    <div className="space-y-2">
                      <p className="text-sm text-red-600 dark:text-red-400">{tUsages('loadError')}</p>
                      <button
                        type="button"
                        onClick={() => void loadMoreUsages()}
                        className="px-4 py-1.5 text-sm rounded-lg border border-zinc-300 dark:border-zinc-600 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors"
                      >
                        {tUsages('loadMore')}
                      </button>
                    </div>
                  ) : (
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">{tUsages('loadingMore')}</p>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="rounded-lg border border-dashed border-zinc-300 dark:border-zinc-600 p-8 text-center">
              <p className="text-zinc-600 dark:text-zinc-400">{tUsages('noUsagesFound')}</p>
            </div>
          )}
        </div>
      )}

      {/* Bearbeiten-Modal */}
      {editing && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-zinc-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">{t('editModalTitle')}</h2>
              <button onClick={() => setEditing(false)} className="text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-5">
              <Field label={t('vehicleNameLabel')}>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                  className="block w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-4 py-2 text-zinc-900 dark:text-zinc-50 focus:border-blue-500 focus:ring-blue-500"
                  required
                />
              </Field>
              <Field label={t('plateLabel')}>
                <input
                  type="text"
                  value={editForm.plate}
                  onChange={(e) => setEditForm((p) => ({ ...p, plate: e.target.value }))}
                  className="block w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-4 py-2 text-zinc-900 dark:text-zinc-50 focus:border-blue-500 focus:ring-blue-500"
                  required
                />
              </Field>
              <Field label={t('snowsatNumberFieldLabel')}>
                <input
                  type="text"
                  value={editForm.snowsatNumber}
                  onChange={(e) => setEditForm((p) => ({ ...p, snowsatNumber: e.target.value }))}
                  className="block w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-4 py-2 text-zinc-900 dark:text-zinc-50 focus:border-blue-500 focus:ring-blue-500"
                />
              </Field>
              <Field label={t('locationLabel')}>
                <input
                  type="text"
                  value={editForm.location}
                  onChange={(e) => setEditForm((p) => ({ ...p, location: e.target.value }))}
                  placeholder={t('locationPlaceholder')}
                  className="block w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-4 py-2 text-zinc-900 dark:text-zinc-50 focus:border-blue-500 focus:ring-blue-500"
                />
              </Field>
              <Field label={t('typeLabel')}>
                <select
                  value={editForm.vehicleType}
                  onChange={(e) => setEditForm((p) => ({ ...p, vehicleType: e.target.value }))}
                  className="block w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-4 py-2 text-zinc-900 dark:text-zinc-50 focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="">{t('pleaseSelect')}</option>
                  <option value="Pistenfahrzeug">{t('vehicleTypeGroomer')}</option>
                  <option value="Skidoo">{t('vehicleTypeSkidoo')}</option>
                  <option value="Quad">{t('vehicleTypeQuad')}</option>
                </select>
              </Field>
              <Field label={t('fuelTypeLabel')}>
                <select
                  value={editForm.fuelType}
                  onChange={(e) => setEditForm((p) => ({ ...p, fuelType: e.target.value }))}
                  className="block w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-4 py-2 text-zinc-900 dark:text-zinc-50 focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="">{t('pleaseSelect')}</option>
                  <option value="Diesel">{t('fuelTypeDiesel')}</option>
                  <option value="Benzin">{t('fuelTypeGasoline')}</option>
                </select>
              </Field>
              <Field label={t('notesLabel')}>
                <textarea
                  value={editForm.notes}
                  onChange={(e) => setEditForm((p) => ({ ...p, notes: e.target.value }))}
                  placeholder={t('notesPlaceholder')}
                  rows={3}
                  className="block w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-4 py-2 text-zinc-900 dark:text-zinc-50 focus:border-blue-500 focus:ring-blue-500"
                />
              </Field>

              {error && (
                <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-3">
                  <p className="text-sm text-red-900 dark:text-red-100">{error}</p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 rounded-lg bg-signal-600 hover:bg-signal-700 disabled:opacity-50 disabled:cursor-not-allowed px-6 py-2.5 font-medium text-white transition-colors"
                >
                  {isSubmitting ? t('saving') : t('saveChanges')}
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-600 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors disabled:opacity-50"
                >
                  {tCommon('cancel')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ToastContainer toasts={toasts} onRemove={removeToast} />
      {confirmDelete && (
        <ConfirmDialog
          title={t('confirmDeleteTitle')}
          message={t('confirmDeleteMessage')}
          confirmLabel={tCommon('delete')}
          cancelLabel={tCommon('cancel')}
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </section>
  );
};

const StatTile = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-3">
    <div className="text-xs text-zinc-500 dark:text-zinc-400">{label}</div>
    <div className="mt-1 text-lg font-semibold text-zinc-900 dark:text-zinc-50">{value}</div>
  </div>
);

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-2">
    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">{label}</label>
    {children}
  </div>
);

export default VehicleDetail;
