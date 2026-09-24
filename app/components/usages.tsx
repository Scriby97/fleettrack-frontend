'use client';

import { useState, useEffect, useRef, useCallback, useMemo, type FC } from 'react';
import { useTranslations } from 'next-intl';
import { useDateLocale } from '@/lib/i18n/formatDate';
import CalendarView from './CalendarView';
import { authenticatedFetch } from '@/lib/api/authenticatedFetch';
import { buildApiUrl, getApiBaseUrlOrNull } from '@/lib/api/url';
import { throwApiError } from '@/lib/api/ApiError';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useOrganization } from '@/lib/contexts/OrganizationContext';
import { getUsagesWithVehicles, type UsageWithVehicle } from '@/lib/api/usages';
import { getOrganizationVehicles } from '@/lib/api/vehicles';
import { useToast } from '@/lib/hooks/useToast';
import { useApiErrorMessage } from '@/lib/i18n/useApiErrorMessage';
import { ToastContainer } from './Toast';
import { ConfirmDialog } from './ConfirmDialog';
import { UsageEditDialog } from './UsageEditDialog';
import { VehicleTypeIcon } from './VehicleTypeIcon';
import { vehicleUsesKm } from '@/lib/vehicles/metric';

interface Report {
  id: number | string;
  vehicleId?: string;
  vehicle: string;
  vehicleType?: string;
  startOperatingHours: number;
  endOperatingHours: number;
  fuel: number;
  usageDate?: string;
  creatorId?: string;
  creatorFirstName?: string;
  creatorLastName?: string;
  // Fallback fuer die Anzeige, falls Vor-/Nachname fehlen (z.B. Accounts, die
  // vor der Vorname/Nachname-Pflicht bei der Registrierung angelegt wurden).
  creatorEmail?: string;
}

interface Vehicle {
  id: string;
  name: string;
  plate?: string;
  vehicleType?: string;
}



interface ReportItemProps {
  report: Report;
  onEdit: (report: Report) => void;
  onDelete: (id: number | string) => void;
  // Admin/Owner der Organisation dieser Nutzung, oder globaler Administrator -
  // NICHT die globale isAdmin-Rolle allein (ein Org-Owner ohne globale
  // Administrator-Rolle muss Nutzungen genauso bearbeiten/löschen dürfen).
  // Steuert Löschen + Anzeige des Erstellers - nur Admin/Owner/globaler Admin.
  canManage: boolean;
  // canManage ODER der Eintrag stammt vom eingeloggten User selbst - ein
  // Mitarbeiter darf seine eigenen Nutzungen bearbeiten, aber nicht löschen.
  canEdit: boolean;
}

const ReportItem: FC<ReportItemProps> = ({ report, onEdit, onDelete, canManage, canEdit }) => {
  const t = useTranslations('usagesOverview');
  const tCommon = useTranslations('common');
  const dateLocale = useDateLocale();
  const creatorName = report.creatorFirstName || report.creatorLastName
    ? `${report.creatorFirstName || ''} ${report.creatorLastName || ''}`.trim()
    : report.creatorEmail ?? null;

  // Pistenfahrzeuge: Betriebsstunden; alle anderen Typen: Kilometer.
  const usesKm = vehicleUsesKm(report.vehicleType);
  const unit = usesKm ? 'km' : 'h';
  const fmt = (n: number) => (usesKm ? Math.round(n).toString() : n.toFixed(1));

  return (
  <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 p-4 hover:shadow-md transition-shadow flex justify-between items-start">
    <div className="flex-1">
      <div className="flex items-center gap-2.5 mb-2">
        <VehicleTypeIcon
          type={report.vehicleType}
          variant="document"
          className="w-8 h-8 shrink-0 text-blue-600 dark:text-blue-400"
        />
        <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">
          {report.vehicle}
        </h3>
      </div>
      <div className="space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
        {report.usageDate && (
          <p>
            <span className="font-medium">{t('usageDateLabel')}:</span>{' '}
            {new Date(report.usageDate).toLocaleString(dateLocale, { dateStyle: 'medium', timeStyle: 'short' })}
          </p>
        )}
        <p>
          <span className="font-medium">{usesKm ? t('startEndKmLabel') : t('startEndLabel')}</span>{' '}
          {fmt(report.startOperatingHours)} {unit} — {fmt(report.endOperatingHours)} {unit}{' '}
          <span className="font-medium">({fmt(report.endOperatingHours - report.startOperatingHours)} {unit} {t('diffSuffix')})</span>
        </p>
        <p>
          <span className="font-medium">{t('fuelSummaryLabel')}</span> {report.fuel.toFixed(2)} L
        </p>
        {canManage && creatorName && (
          <p>
            <span className="font-medium">{t('createdByLabel')}</span> {creatorName}
          </p>
        )}
      </div>
    </div>

    {/* Action Buttons - Bearbeiten: Admin/Owner/globaler Admin oder eigener Eintrag; Löschen: nur Admin/Owner/globaler Admin */}
    {(canEdit || canManage) && (
      <div className="flex gap-2 ml-4 flex-shrink-0">
        {canEdit && (
          <button
            onClick={() => onEdit(report)}
            className="p-2 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 transition-colors"
            title={tCommon('edit')}
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
          </button>
        )}

        {canManage && (
          <button
            onClick={() => onDelete(report.id)}
            className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 transition-colors"
            title={tCommon('delete')}
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        )}
      </div>
    )}
  </div>
);
};

// Listenansicht: so viele Nutzungen pro Seite, weitere laden beim Scrollen nach.
const PAGE_SIZE = 10;

// Postgres numeric/decimal-Spalten kommen vom Backend als String (node-postgres
// castet numeric nicht automatisch zu number) - JEDE Stelle, die Werte vom
// Server in ein Report-Objekt uebernimmt, muss das hier konsistent umwandeln,
// sonst crasht spaeter z.B. fmt()'s .toFixed() beim Rendern (kein Fehler beim
// Speichern selbst, nur beim naechsten Rendern der aktualisierten Zahl).
function toNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' ? value : Number(value ?? fallback);
}

function mapUsageToReport(u: UsageWithVehicle, unknownVehicleLabel: string): Report {
  return {
    id: u.id,
    vehicleId: u.vehicleId,
    vehicle: u.vehicle?.name ?? String(u.vehicleId ?? unknownVehicleLabel),
    vehicleType: u.vehicle?.vehicleType,
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

function mergeVehicles(prev: Vehicle[], usages: UsageWithVehicle[]): Vehicle[] {
  const byId = new Map(prev.map((v) => [v.id, v]));
  usages.forEach((u) => {
    if (u.vehicle && u.vehicleId) byId.set(u.vehicleId, u.vehicle);
  });
  return Array.from(byId.values());
}

const UebersichtEintraege: FC = () => {
  const { isAdmin, userProfile } = useAuth();
  const { organizations, selectedOrgId, setSelectedOrgId, canManageSelectedOrganization } = useOrganization();
  const t = useTranslations('usagesOverview');
  const tCommon = useTranslations('common');
  const getApiErrorMessage = useApiErrorMessage();
  // Ein Mitarbeiter darf zusaetzlich seine eigenen Nutzungen bearbeiten (aber
  // nicht loeschen) - siehe assertCanEditUsage im Backend.
  const canEditReport = (report: Report) =>
    canManageSelectedOrganization || report.creatorId === userProfile?.id;
  const { toasts, showToast, removeToast } = useToast();
  // Listenansicht: seitenweise geladen (neueste zuerst), nextCursor = null -> alles geladen.
  const [reports, setReports] = useState<Report[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState(false);
  // Kalenderansicht: laedt genau den sichtbaren Monat/die sichtbare Woche.
  const [calendarReports, setCalendarReports] = useState<Report[]>([]);
  const [calendarRange, setCalendarRange] = useState<{ start: string; end: string } | null>(null);
  // Fahrzeuge der Organisation (fuer das Dropdown im Bearbeiten-Dialog, auch ohne
  // Nutzungen) und die aus den geladenen Nutzungen stammenden - Letztere sichern
  // ab, dass auch ausrangierte Fahrzeuge bestehender Eintraege aufgeloest werden.
  const [orgVehicles, setOrgVehicles] = useState<Vehicle[]>([]);
  const [usageVehicles, setUsageVehicles] = useState<Vehicle[]>([]);
  const vehicles = useMemo(() => {
    const byId = new Map<string, Vehicle>();
    [...usageVehicles, ...orgVehicles].forEach((v) => byId.set(v.id, v));
    return Array.from(byId.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [orgVehicles, usageVehicles]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRequestRef = useRef(0);
  const loadingMoreRef = useRef(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const [view, setView] = useState<'list' | 'calendar'>('list');
  const [editingReport, setEditingReport] = useState<Report | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | string | null>(null);
  const handleVisibleRangeChange = useCallback(({ start, end }: { start: Date; end: Date }) => {
    setCalendarRange({ start: start.toISOString(), end: end.toISOString() });
  }, []);

  const calendarEvents = calendarReports
    .filter((r) => r.usageDate)
    .map((r) => {
      const diff = r.endOperatingHours - r.startOperatingHours;
      const km = vehicleUsesKm(r.vehicleType);
      return {
        id: r.id,
        title: `${r.vehicle}: ${km ? Math.round(diff) : diff}${km ? ' km' : ' h'}`,
        start: r.usageDate!,
        end: r.usageDate!,
      };
    });

  const handleEdit = (report: Report) => {
    setEditingReport(report);
  };

  const handleEventClick = (eventId: string | number) => {
    const report = calendarReports.find(r => String(r.id) === String(eventId));
    if (report) {
      handleEdit(report);
    }
  };

  const applyUsageUpdate = (targetId: number | string, updatedUsage: UsageWithVehicle) => {
    const vehicleMap = new Map<string, Vehicle>();
    vehicles.forEach((v) => vehicleMap.set(v.id, v));

    const applyUpdate = (r: Report): Report =>
      r.id === targetId
        ? {
            id: updatedUsage.id,
            vehicleId: updatedUsage.vehicleId,
            vehicle: vehicleMap.get(String(updatedUsage.vehicleId))?.name ?? t('unknownVehicle'),
            vehicleType: vehicleMap.get(String(updatedUsage.vehicleId))?.vehicleType ?? r.vehicleType,
            startOperatingHours: toNumber(updatedUsage.startOperatingHours),
            endOperatingHours: toNumber(updatedUsage.endOperatingHours),
            fuel: toNumber(updatedUsage.fuelLitersRefilled),
            usageDate: updatedUsage.usageDate,
            creatorId: updatedUsage.creatorId ?? r.creatorId,
            creatorFirstName: updatedUsage.creator?.firstName ?? r.creatorFirstName,
            creatorLastName: updatedUsage.creator?.lastName ?? r.creatorLastName,
            creatorEmail: updatedUsage.creator?.email ?? r.creatorEmail,
          }
        : r;
    setReports((prev) => prev.map(applyUpdate));
    setCalendarReports((prev) => prev.map(applyUpdate));
  };

  const handleDelete = async (id: number | string) => {
    try {
      const res = await authenticatedFetch(buildApiUrl(`/usages/${id}`), {
        method: 'DELETE',
      });

      if (!res.ok) {
        await throwApiError(res, t('deleteErrorGeneric', { status: res.status }));
      }

      setReports((prev) => prev.filter((report) => report.id !== id));
      setCalendarReports((prev) => prev.filter((report) => report.id !== id));
      showToast(t('deleteSuccess'), 'success');
    } catch (err) {
      console.error('Fehler beim Löschen der Nutzung:', err);
      showToast(getApiErrorMessage(err, t('deleteErrorToast')), 'error');
    }
  };

  // Listenansicht: erste Seite (neueste zuerst) laden, wenn die Organisation
  // wechselt. Weitere Seiten kommen ueber loadMore beim Scrollen.
  useEffect(() => {
    if (view !== 'list') return;
    if (!getApiBaseUrlOrNull()) return;
    if (!selectedOrgId) return;

    const requestRef = listRequestRef;
    const requestId = ++requestRef.current;
    const controller = new AbortController();
    loadingMoreRef.current = false;

    const fetchFirstPage = async () => {
      setIsLoading(true);
      setIsLoadingMore(false);
      setLoadMoreError(false);
      setError(null);

      try {
        const page = await getUsagesWithVehicles(selectedOrgId, {
          limit: PAGE_SIZE,
          signal: controller.signal,
        });
        if (requestId !== listRequestRef.current) return;

        setReports(page.usages.map((u) => mapUsageToReport(u, t('unknownVehicle'))));
        setUsageVehicles(mergeVehicles([], page.usages));
        setNextCursor(page.nextCursor);
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return;
        if (requestId !== listRequestRef.current) return;
        console.error('Fehler beim Laden der Nutzungen:', err);
        setReports([]);
        setNextCursor(null);
        setError(t('loadError'));
      } finally {
        if (requestId === listRequestRef.current) setIsLoading(false);
      }
    };

    fetchFirstPage();

    return () => {
      // Antworten dieser (jetzt veralteten) Abfrage verwerfen, auch vom Nachladen.
      requestRef.current++;
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, selectedOrgId]);

  const loadMore = useCallback(async () => {
    if (!nextCursor || !selectedOrgId || loadingMoreRef.current) return;
    loadingMoreRef.current = true;
    const requestId = listRequestRef.current;
    setIsLoadingMore(true);
    setLoadMoreError(false);

    try {
      const page = await getUsagesWithVehicles(selectedOrgId, {
        limit: PAGE_SIZE,
        cursor: nextCursor,
      });
      // Organisation/Filter wurde inzwischen gewechselt - Antwort verwerfen.
      if (requestId !== listRequestRef.current) return;

      setReports((prev) => {
        const known = new Set(prev.map((r) => String(r.id)));
        const fresh = page.usages
          .filter((u) => !known.has(String(u.id)))
          .map((u) => mapUsageToReport(u, t('unknownVehicle')));
        return [...prev, ...fresh];
      });
      setUsageVehicles((prev) => mergeVehicles(prev, page.usages));
      setNextCursor(page.nextCursor);
    } catch (err) {
      if (requestId !== listRequestRef.current) return;
      console.error('Fehler beim Nachladen der Nutzungen:', err);
      setLoadMoreError(true);
    } finally {
      if (requestId === listRequestRef.current) {
        loadingMoreRef.current = false;
        setIsLoadingMore(false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nextCursor, selectedOrgId]);

  // Endlos-Scrollen: sobald das Ende der Liste (leicht vorher) sichtbar wird,
  // die naechste Seite laden. Bei einem Fehler pausiert das Nachladen bis zum
  // manuellen Retry-Button, damit nicht endlos neu versucht wird.
  useEffect(() => {
    const node = sentinelRef.current;
    if (view !== 'list' || !node || !nextCursor || isLoading || isLoadingMore || loadMoreError) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) void loadMore();
      },
      { rootMargin: '200px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [view, nextCursor, isLoading, isLoadingMore, loadMoreError, loadMore]);

  // Alle Fahrzeuge der Organisation fuer den Bearbeiten-Dialog laden.
  useEffect(() => {
    if (!getApiBaseUrlOrNull() || !selectedOrgId) return;
    const controller = new AbortController();
    getOrganizationVehicles(selectedOrgId, { signal: controller.signal })
      .then(setOrgVehicles)
      .catch((err) => {
        if (err instanceof Error && err.name === 'AbortError') return;
        console.error('Fehler beim Laden der Fahrzeuge:', err);
      });
    return () => controller.abort();
  }, [selectedOrgId]);

  // Kalenderansicht: genau den sichtbaren Monat/die sichtbare Woche laden
  // (ohne limit - der Zeitraum ist von sich aus klein).
  useEffect(() => {
    if (view !== 'calendar' || !calendarRange) return;
    if (!getApiBaseUrlOrNull()) return;
    if (!selectedOrgId) return;

    const controller = new AbortController();
    let cancelled = false;

    const fetchVisibleRange = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const page = await getUsagesWithVehicles(selectedOrgId, {
          startDate: calendarRange.start,
          endDate: calendarRange.end,
          signal: controller.signal,
        });
        if (cancelled) return;
        setCalendarReports(page.usages.map((u) => mapUsageToReport(u, t('unknownVehicle'))));
        setUsageVehicles((prev) => mergeVehicles(prev, page.usages));
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return;
        if (cancelled) return;
        console.error('Fehler beim Laden der Nutzungen:', err);
        setError(t('loadError'));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    fetchVisibleRange();

    return () => {
      cancelled = true;
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, selectedOrgId, calendarRange]);

  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-zinc-50">
          {t('title')}
        </h1>
        <div className="flex flex-col gap-2 mt-2">
          {isAdmin && organizations.length > 0 && (
            <div className="flex items-center gap-2">
              <label htmlFor="usagesOrgSelect" className="text-sm text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
                {tCommon('organizationLabel')}:
              </label>
              <select
                id="usagesOrgSelect"
                value={selectedOrgId || ''}
                onChange={(e) => setSelectedOrgId(e.target.value)}
                className="flex-1 sm:flex-initial px-3 py-1.5 text-sm border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-purple-500"
              >
                {organizations.map(org => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              {isLoading
                ? t('loadingUsages')
                : view === 'calendar'
                  ? t('usagesFoundCount', { count: calendarReports.length })
                  : nextCursor
                    ? t('usagesShownCountMore', { count: reports.length })
                    : t('usagesFoundCount', { count: reports.length })}
            </p>
            <div className="flex gap-2">
              <button onClick={() => setView('list')} className={`px-2 sm:px-3 py-1 text-sm rounded ${view === 'list' ? 'bg-zinc-200 dark:bg-zinc-700' : ''}`}>{t('listView')}</button>
              <button onClick={() => setView('calendar')} className={`px-2 sm:px-3 py-1 text-sm rounded ${view === 'calendar' ? 'bg-zinc-200 dark:bg-zinc-700' : ''}`}>{t('calendarView')}</button>
            </div>
          </div>
        </div>
        {error && (view === 'calendar' ? calendarReports : reports).length === 0 && (
          <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-3 mt-3">
            <p className="text-sm text-red-900 dark:text-red-100">{error}</p>
          </div>
        )}
      </div>

      {editingReport && (
        <UsageEditDialog
          key={editingReport.id}
          usage={editingReport}
          vehicles={vehicles}
          canEdit={canEditReport(editingReport)}
          onClose={() => setEditingReport(null)}
          onSaved={(updated) => {
            applyUsageUpdate(editingReport.id, updated);
            setEditingReport(null);
            showToast(t('updateSuccess'), 'success');
          }}
          onSaveError={() => showToast(t('updateErrorToast'), 'error')}
        />
      )}

      {view === 'calendar' ? (
        // Immer gemountet (auch waehrend des Ladens), sonst ginge beim Blaettern
        // der gewaehlte Monat verloren.
        <CalendarView
          events={calendarEvents}
          onEventClick={handleEventClick}
          onVisibleRangeChange={handleVisibleRangeChange}
        />
      ) : isLoading ? (
        <div className="rounded-lg border border-dashed border-zinc-300 dark:border-zinc-600 p-4 text-center">
          <p className="text-zinc-600 dark:text-zinc-400">{t('loadingUsagesEllipsis')}</p>
        </div>
      ) : reports.length > 0 ? (
        <>
          <div className="grid gap-3">
            {reports.map((report) => (
              <ReportItem
                key={report.id}
                report={report}
                onEdit={handleEdit}
                onDelete={(id) => setConfirmDeleteId(id)}
                canManage={canManageSelectedOrganization}
                canEdit={canEditReport(report)}
              />
            ))}
          </div>
          {nextCursor && (
            <div ref={sentinelRef} className="py-4 text-center">
              {loadMoreError ? (
                <div className="space-y-2">
                  <p className="text-sm text-red-600 dark:text-red-400">{t('loadError')}</p>
                  <button
                    type="button"
                    onClick={() => void loadMore()}
                    className="px-4 py-1.5 text-sm rounded-lg border border-zinc-300 dark:border-zinc-600 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors"
                  >
                    {t('loadMore')}
                  </button>
                </div>
              ) : (
                <p className="text-sm text-zinc-500 dark:text-zinc-400">{t('loadingMore')}</p>
              )}
            </div>
          )}
        </>
      ) : (
        <div className="rounded-lg border border-dashed border-zinc-300 dark:border-zinc-600 p-8 text-center">
          <p className="text-zinc-600 dark:text-zinc-400">{t('noUsagesFound')}</p>
        </div>
      )}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      {confirmDeleteId !== null && (
        <ConfirmDialog
          title={t('confirmDeleteTitle')}
          message={t('confirmDeleteMessage')}
          confirmLabel={tCommon('delete')}
          cancelLabel={tCommon('cancel')}
          onConfirm={() => { handleDelete(confirmDeleteId); setConfirmDeleteId(null); }}
          onCancel={() => setConfirmDeleteId(null)}
        />
      )}
    </section>
  );
};

export default UebersichtEintraege;