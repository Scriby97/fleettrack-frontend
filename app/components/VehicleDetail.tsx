'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useTranslations } from 'next-intl';
import { authenticatedFetch } from '@/lib/api/authenticatedFetch';
import { buildApiUrl } from '@/lib/api/url';
import { throwApiError } from '@/lib/api/ApiError';
import { useApiErrorMessage } from '@/lib/i18n/useApiErrorMessage';
import { useToast } from '@/lib/hooks/useToast';
import { ToastContainer } from './Toast';
import { ConfirmDialog } from './ConfirmDialog';
import { VehicleTypeIcon } from './VehicleTypeIcon';
import { ActivityBarChart } from './ActivityBarChart';
import { vehicleUsesKm, counterDecimals } from '@/lib/vehicles/metric';
import { getVehicleUsageHistory, type VehicleUsageHistory } from '@/lib/api/vehicles';

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
  const getApiErrorMessage = useApiErrorMessage();
  const { toasts, showToast, removeToast } = useToast();

  const [history, setHistory] = useState<VehicleUsageHistory | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [metric, setMetric] = useState<'hours' | 'fuel'>('hours');

  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState(emptyEditForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

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
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-zinc-50 truncate">
              {vehicle.name}
              {vehicle.isRetired && (
                <span className="ml-2 align-middle text-sm font-normal text-red-600 dark:text-red-400">
                  ({t('retiredLabel')})
                </span>
              )}
            </h1>
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
            <div className="flex items-center justify-between gap-3 mb-4">
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">{t('chartTitle')}</h2>
              <div className="flex rounded-lg border border-zinc-300 dark:border-zinc-600 overflow-hidden text-xs">
                <button
                  onClick={() => setMetric('hours')}
                  className={`px-3 py-1.5 font-medium transition-colors ${
                    metric === 'hours'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700'
                  }`}
                >
                  {usesKm ? t('chartMetricKm') : t('chartMetricHours')}
                </button>
                <button
                  onClick={() => setMetric('fuel')}
                  className={`px-3 py-1.5 font-medium transition-colors ${
                    metric === 'fuel'
                      ? 'bg-blue-600 text-white'
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
                  className="flex-1 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed px-6 py-2.5 font-medium text-white transition-colors"
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
