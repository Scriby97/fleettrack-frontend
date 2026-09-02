'use client';

import { useState, useEffect, type FC, type FormEvent } from 'react';
import { useTranslations } from 'next-intl';
import { useDateLocale } from '@/lib/i18n/formatDate';
import CalendarView from './CalendarView';
import { authenticatedFetch } from '@/lib/api/authenticatedFetch';
import { buildApiUrl, getApiBaseUrlOrNull } from '@/lib/api/url';
import { throwApiError } from '@/lib/api/ApiError';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useOrganization } from '@/lib/contexts/OrganizationContext';
import { getUsagesWithVehicles } from '@/lib/api/usages';
import { useToast } from '@/lib/hooks/useToast';
import { useApiErrorMessage } from '@/lib/i18n/useApiErrorMessage';
import { ToastContainer } from './Toast';
import { ConfirmDialog } from './ConfirmDialog';

interface Report {
  id: number | string;
  vehicleId?: string;
  vehicle: string;
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

  return (
  <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 p-4 hover:shadow-md transition-shadow flex justify-between items-start">
    <div className="flex-1">
      <h3 className="font-semibold text-zinc-900 dark:text-zinc-50 mb-2">
        {report.vehicle}
      </h3>
      <div className="space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
        {report.usageDate && (
          <p>
            <span className="font-medium">{t('usageDateLabel')}:</span> {new Date(report.usageDate).toLocaleDateString(dateLocale)}
          </p>
        )}
        <p>
          <span className="font-medium">{t('startEndLabel')}</span> {report.startOperatingHours.toFixed(1)} h — {report.endOperatingHours.toFixed(1)} h{' '}
          <span className="font-medium">({(report.endOperatingHours - report.startOperatingHours).toFixed(1)} h {t('diffSuffix')})</span>
        </p>
        <p>
          <span className="font-medium">{t('fuelSummaryLabel')}</span> {report.fuel} L
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
  const [reports, setReports] = useState<Report[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'list' | 'calendar'>('list');
  const [editingReport, setEditingReport] = useState<Report | null>(null);
  const [editForm, setEditForm] = useState({
    vehicleId: '',
    startOperatingHours: '',
    endOperatingHours: '',
    fuel: '',
    usageDate: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | string | null>(null);

  const calendarEvents = reports
    .filter((r) => r.usageDate)
    .map((r) => ({
      id: r.id,
      title: `${r.vehicle}: ${r.endOperatingHours - r.startOperatingHours}h`,
      start: r.usageDate!,
      end: r.usageDate!,
    }));

  const handleEdit = (report: Report) => {
    setEditingReport(report);
    
    // Konvertiere das usageDate in das Format YYYY-MM-DD für das Date Input
    let formattedDate = '';
    if (report.usageDate) {
      const date = new Date(report.usageDate);
      formattedDate = date.toISOString().split('T')[0];
    }
    
    setEditForm({
      vehicleId: report.vehicleId || '',
      startOperatingHours: String(report.startOperatingHours),
      endOperatingHours: String(report.endOperatingHours),
      fuel: String(report.fuel),
      usageDate: formattedDate,
    });
  };

  const handleEventClick = (eventId: string | number) => {
    const report = reports.find(r => String(r.id) === String(eventId));
    if (report) {
      handleEdit(report);
    }
  };

  const handleCancelEdit = () => {
    setEditingReport(null);
    setEditForm({
      vehicleId: '',
      startOperatingHours: '',
      endOperatingHours: '',
      fuel: '',
      usageDate: '',
    });
  };

  const handleSaveEdit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingReport) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const payload = {
        vehicleId: editForm.vehicleId,
        startOperatingHours: parseFloat(editForm.startOperatingHours),
        endOperatingHours: parseFloat(editForm.endOperatingHours),
        fuelLitersRefilled: parseFloat(editForm.fuel) || 0,
        usageDate: editForm.usageDate,
      };

      const res = await authenticatedFetch(buildApiUrl(`/usages/${editingReport.id}`), {
        method: 'PUT',
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        await throwApiError(res, `API error ${res.status}`);
      }

      // Aktualisiere die Liste
      const updatedUsage = await res.json();
      const vehicleMap = new Map<string, Vehicle>();
      vehicles.forEach((v) => vehicleMap.set(v.id, v));

      setReports((prev) =>
        prev.map((r) =>
          r.id === editingReport.id
            ? {
                id: updatedUsage.id,
                vehicleId: updatedUsage.vehicleId,
                vehicle: vehicleMap.get(String(updatedUsage.vehicleId))?.name ?? t('unknownVehicle'),
                startOperatingHours: updatedUsage.startOperatingHours,
                endOperatingHours: updatedUsage.endOperatingHours,
                fuel: updatedUsage.fuelLitersRefilled,
                usageDate: updatedUsage.usageDate,
                creatorId: updatedUsage.creatorId ?? r.creatorId,
                creatorFirstName: updatedUsage.creator?.firstName ?? r.creatorFirstName,
                creatorLastName: updatedUsage.creator?.lastName ?? r.creatorLastName,
                creatorEmail: updatedUsage.creator?.email ?? r.creatorEmail,
              }
            : r
        )
      );

      handleCancelEdit();
      showToast(t('updateSuccess'), 'success');
    } catch (err) {
      console.error('Fehler beim Aktualisieren der Nutzung:', err);
      setError(getApiErrorMessage(err, t('updateErrorGeneric')));
      showToast(t('updateErrorToast'), 'error');
    } finally {
      setIsSubmitting(false);
    }
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
      showToast(t('deleteSuccess'), 'success');
    } catch (err) {
      console.error('Fehler beim Löschen der Nutzung:', err);
      showToast(getApiErrorMessage(err, t('deleteErrorToast')), 'error');
    }
  };

  // Fetch usages data when organization is selected
  useEffect(() => {
    const apiBaseUrl = getApiBaseUrlOrNull();
    if (!apiBaseUrl) return;

    // Wait for organization to be selected
    if (!selectedOrgId) return;

    const controller = new AbortController();
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Single optimized request to fetch usages with vehicle data
        const usagesWithVehicles = await getUsagesWithVehicles(selectedOrgId || undefined);

        // Extract unique vehicles from the response
        const vehicleMap = new Map<string, Vehicle>();
        usagesWithVehicles.forEach((u) => {
          if (u.vehicle && u.vehicleId) {
            vehicleMap.set(u.vehicleId, u.vehicle);
          }
        });

        // Map to Report format
        const mapped: Report[] = usagesWithVehicles.map((u) => ({
          id: u.id,
          vehicleId: u.vehicleId,
          vehicle: u.vehicle?.name ?? String(u.vehicleId ?? t('unknownVehicle')),
          startOperatingHours: typeof u.startOperatingHours === 'number' ? u.startOperatingHours : Number(u.startOperatingHours ?? 0),
          endOperatingHours: typeof u.endOperatingHours === 'number' ? u.endOperatingHours : Number(u.endOperatingHours ?? 0),
          fuel: typeof u.fuelLitersRefilled === 'number' ? u.fuelLitersRefilled : Number(u.fuelLitersRefilled ?? 0),
          usageDate: u.usageDate,
          creatorId: u.creatorId,
          creatorFirstName: u.creator?.firstName,
          creatorLastName: u.creator?.lastName,
          creatorEmail: u.creator?.email,
        }));

        setReports(mapped);
        setVehicles(Array.from(vehicleMap.values()));
        setError(null);
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return;
        console.error('Fehler beim Laden der Nutzungen:', err);
        setError(t('loadError'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();

    return () => {
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedOrgId]);

  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-zinc-50">
          {t('title')}
        </h1>
        <div className="flex flex-col gap-2 mt-2">
          {isAdmin && organizations.length > 0 && (
            <div className="flex items-center gap-2">
              <label className="text-sm text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
                {tCommon('organizationLabel')}:
              </label>
              <select
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
              {isLoading ? t('loadingUsages') : t('usagesFoundCount', { count: reports.length })}
            </p>
            <div className="flex gap-2">
              <button onClick={() => setView('list')} className={`px-2 sm:px-3 py-1 text-sm rounded ${view === 'list' ? 'bg-zinc-200 dark:bg-zinc-700' : ''}`}>{t('listView')}</button>
              <button onClick={() => setView('calendar')} className={`px-2 sm:px-3 py-1 text-sm rounded ${view === 'calendar' ? 'bg-zinc-200 dark:bg-zinc-700' : ''}`}>{t('calendarView')}</button>
            </div>
          </div>
        </div>
        {error && reports.length === 0 && (
          <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-3 mt-3">
            <p className="text-sm text-red-900 dark:text-red-100">{error}</p>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editingReport && (() => {
        const canEditEditingReport = canEditReport(editingReport);
        return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-zinc-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                  {canEditEditingReport ? t('editUsage') : t('viewUsage')}
                </h2>
                {canEditEditingReport && (() => {
                  const editingCreatorName = editingReport.creatorFirstName || editingReport.creatorLastName
                    ? `${editingReport.creatorFirstName ?? ''} ${editingReport.creatorLastName ?? ''}`.trim()
                    : editingReport.creatorEmail
                  return editingCreatorName && (
                    <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                      {t('createdBy', { name: editingCreatorName })}
                    </p>
                  )
                })()}
              </div>
              <button
                onClick={handleCancelEdit}
                className="text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-5">
              {/* Fahrzeug */}
              <div className="space-y-2">
                <label htmlFor="edit-vehicle" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  {t('vehicleField')}
                </label>
                <select
                  id="edit-vehicle"
                  value={editForm.vehicleId}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, vehicleId: e.target.value }))}
                  className="block w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-4 py-2 text-zinc-900 dark:text-zinc-50 focus:border-blue-500 focus:ring-blue-500"
                  required
                  disabled={!canEditEditingReport}
                >
                  {vehicles.map((vehicle) => (
                    <option key={vehicle.id} value={vehicle.id}>
                      {vehicle.name} {vehicle.plate ? `(${vehicle.plate})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Erfassungsdatum */}
              <div className="space-y-2">
                <label htmlFor="edit-usageDate" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  {t('usageDateLabel')}
                </label>
                <input
                  id="edit-usageDate"
                  type="date"
                  value={editForm.usageDate}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, usageDate: e.target.value }))}
                  className="block w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-4 py-2 text-zinc-900 dark:text-zinc-50 focus:border-blue-500 focus:ring-blue-500 [&::-webkit-calendar-picker-indicator]:invert"
                  required
                  disabled={!canEditEditingReport}
                />
              </div>

              {/* Start-Betriebsstunden */}
              <div className="space-y-2">
                <label htmlFor="edit-startOperatingHours" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  {t('startHoursLabel')}
                </label>
                <input
                  id="edit-startOperatingHours"
                  type="number"
                  value={editForm.startOperatingHours}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, startOperatingHours: e.target.value }))}
                  className="block w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-4 py-2 text-zinc-900 dark:text-zinc-50 focus:border-blue-500 focus:ring-blue-500"
                  min="0"
                  step="0.1"
                  required
                  disabled={!canEditEditingReport}
                />
              </div>

              {/* End-Betriebsstunden */}
              <div className="space-y-2">
                <label htmlFor="edit-endOperatingHours" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  {t('endHoursLabel')}
                </label>
                <input
                  id="edit-endOperatingHours"
                  type="number"
                  value={editForm.endOperatingHours}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, endOperatingHours: e.target.value }))}
                  className="block w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-4 py-2 text-zinc-900 dark:text-zinc-50 focus:border-blue-500 focus:ring-blue-500"
                  min="0"
                  step="0.1"
                  required
                  disabled={!canEditEditingReport}
                />
              </div>

              {/* Treibstoff */}
              <div className="space-y-2">
                <label htmlFor="edit-fuel" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  {t('fuelLabel')}
                </label>
                <input
                  id="edit-fuel"
                  type="number"
                  value={editForm.fuel}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, fuel: e.target.value }))}
                  className="block w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-4 py-2 text-zinc-900 dark:text-zinc-50 focus:border-blue-500 focus:ring-blue-500"
                  min="0"
                  step="0.1"
                  disabled={!canEditEditingReport}
                />
              </div>

              {/* Error Message */}
              {error && (
                <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-3">
                  <p className="text-sm text-red-900 dark:text-red-100">{error}</p>
                </div>
              )}

              {/* Buttons */}
              <div className="flex gap-3">
                {canEditEditingReport && (
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed px-6 py-2.5 font-medium text-white transition-colors"
                  >
                    {isSubmitting ? t('saving') : t('saveChanges')}
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  disabled={isSubmitting}
                  className={`${canEditEditingReport ? '' : 'flex-1'} px-6 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-600 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors disabled:opacity-50`}
                >
                  {canEditEditingReport ? tCommon('cancel') : tCommon('close')}
                </button>
              </div>
            </form>
          </div>
        </div>
        );
      })()}

      {isLoading ? (
        <div className="rounded-lg border border-dashed border-zinc-300 dark:border-zinc-600 p-4 text-center">
          <p className="text-zinc-600 dark:text-zinc-400">{t('loadingUsagesEllipsis')}</p>
        </div>
      ) : view === 'calendar' ? (
        <CalendarView events={calendarEvents} onEventClick={handleEventClick} />
      ) : reports.length > 0 ? (
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