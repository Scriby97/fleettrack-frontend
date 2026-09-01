'use client';

import { useState, useEffect, type FC, type FormEvent } from 'react';
import { useTranslations } from 'next-intl';
import { authenticatedFetch } from '@/lib/api/authenticatedFetch';
import { buildApiUrl, getApiBaseUrlOrNull } from '@/lib/api/url';
import { throwApiError } from '@/lib/api/ApiError';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useOrganization } from '@/lib/contexts/OrganizationContext';
import { useToast } from '@/lib/hooks/useToast';
import { useApiErrorMessage } from '@/lib/i18n/useApiErrorMessage';
import { ToastContainer } from './Toast';
import { ConfirmDialog } from './ConfirmDialog';

interface Vehicle {
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
  periodStartHours?: number | null;
  periodEndHours?: number | null;
  totalFuelLiters?: number;
  fuelLiters?: number;
}

// Shape of each value when the endpoint returns a keyed object
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
  periodStartHours?: number | null;
  periodEndHours?: number | null;
  totalFuelLiters?: number;
  fuelLiters?: number;
}

interface VehicleItemProps {
  vehicle: Vehicle;
  onEdit: (vehicle: Vehicle) => void;
  onDelete: (id: string) => void;
  stats?: { startHours: number | null; endHours: number | null; fuelLiters: number } | null;
}

const VehicleItem: FC<VehicleItemProps> = ({ vehicle, onEdit, onDelete, stats = null }) => {
  const t = useTranslations('fleetOverview');
  const tCommon = useTranslations('common');

  return (
  <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 p-4 hover:shadow-md transition-shadow flex justify-between items-start">
    <div className="flex-1">
      <h3 className="font-semibold text-zinc-900 dark:text-zinc-50 mb-2">
        {vehicle.name}
        {vehicle.isRetired && (
          <span className="ml-2 text-sm font-normal text-red-600 dark:text-red-400">({t('retiredLabel')})</span>
        )}
      </h3>
      <div className="space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
        <div>{t('plateLabel')}: <span className="font-medium">{vehicle.plate}</span></div>
        {vehicle.snowsatNumber && (
          <div>{t('snowsatLabel')}: <span className="font-medium">{vehicle.snowsatNumber}</span></div>
        )}
        {vehicle.location && (
          <div>{t('locationLabel')}: <span className="font-medium">{vehicle.location}</span></div>
        )}
        {vehicle.vehicleType && (
          <div>{t('typeLabel')}: <span className="font-medium">{vehicle.vehicleType}</span></div>
        )}
        {vehicle.fuelType && (
          <div>{t('fuelTypeLabel')}: <span className="font-medium">{vehicle.fuelType}</span></div>
        )}
        {vehicle.notes && (
          <div>{t('notesLabel')}: <span className="font-medium">{vehicle.notes}</span></div>
        )}
      </div>
      <div className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        <div>
          {t('startHoursLabel')}:{' '}
          <span className="font-medium">
            {typeof stats?.startHours === 'number' ? stats.startHours.toFixed(1) : '—'}
          </span>
        </div>
        <div>
          {t('endHoursLabel')}:{' '}
          <span className="font-medium">
            {typeof stats?.endHours === 'number' ? stats.endHours.toFixed(1) : '—'}
          </span>
        </div>
        <div>{t('totalFueledLabel')}: <span className="font-medium">{stats?.fuelLiters ?? '—'} L</span></div>
      </div>
    </div>

    {/* Action Buttons */}
    <div className="flex gap-2 ml-4">
      <button
        onClick={() => onEdit(vehicle)}
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

      <button
        onClick={() => onDelete(vehicle.id)}
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
    </div>
  </div>
  );
};

// Formatiert ein Date fuer <input type="datetime-local"> (lokale Zeit, kein "Z"/Offset)
const toDatetimeLocalValue = (date: Date): string => {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const defaultRangeStart = (): string => {
  const now = new Date();
  return toDatetimeLocalValue(new Date(now.getFullYear(), now.getMonth(), 1, 0, 0));
};

const defaultRangeEnd = (): string => toDatetimeLocalValue(new Date());

const FlottenUebersicht: FC = () => {
  const { isAdmin } = useAuth();
  const { organizations, selectedOrgId, setSelectedOrgId } = useOrganization();
  const { toasts, showToast, removeToast } = useToast();
  const t = useTranslations('fleetOverview');
  const tCommon = useTranslations('common');
  const getApiErrorMessage = useApiErrorMessage();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [statsMap, setStatsMap] = useState<Record<string, { startHours: number | null; endHours: number | null; fuelLiters: number }>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rangeStart, setRangeStart] = useState(defaultRangeStart);
  const [rangeEnd, setRangeEnd] = useState(defaultRangeEnd);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    plate: '',
    snowsatNumber: '',
    location: '',
    vehicleType: '',
    fuelType: '',
    notes: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const rangeInvalid = Boolean(rangeStart) && Boolean(rangeEnd) && new Date(rangeStart) > new Date(rangeEnd);

  // Fetch vehicle stats when organization or Zeitraum sich aendert
  useEffect(() => {
    const apiBaseUrl = getApiBaseUrlOrNull();
    if (!apiBaseUrl) return;

    if (!selectedOrgId) return;
    if (!rangeStart || !rangeEnd || rangeInvalid) return;

    const controller = new AbortController();
    const fetchStats = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const url = new URL(buildApiUrl('/vehicles/stats'));
        if (selectedOrgId) {
          url.searchParams.set('organizationId', selectedOrgId);
        }
        url.searchParams.set('startDate', new Date(rangeStart).toISOString());
        url.searchParams.set('endDate', new Date(rangeEnd).toISOString());

        const res = await authenticatedFetch(url.toString(), { signal: controller.signal });
        if (!res.ok) throw new Error(`Vehicles stats HTTP ${res.status}`);
        const statsData = await res.json();

        // Normalize into vehicles array and statsMap
        const vehiclesFromStats: Vehicle[] = [];
        const map: Record<string, { startHours: number | null; endHours: number | null; fuelLiters: number }> = {};

        if (Array.isArray(statsData)) {
          // Expect items like { id|vehicleId, name, plate, periodStartHours, periodEndHours, totalFuelLiters }
          statsData.forEach((s: StatsArrayItem) => {
            const id = String(s.vehicleId ?? s.id ?? s.vehicle ?? '');
            const name = s.name ?? s.vehicleName ?? s.vehicle ?? t('vehicleFallbackName', { id });
            const plate = s.plate ?? s.kennzeichen ?? s.registration ?? '';
            const snowsatNumber = s.snowsatNumber ?? s.SNOWsatNumber ?? s.snowsat ?? undefined;
            const isRetired = Boolean(s.isRetired);
            const location = s.location ?? s.ort ?? undefined;
            const vehicleType = s.vehicleType ?? s.type ?? s.typ ?? undefined;
            const fuelType = s.fuelType ?? s.fuel ?? s.treibstoff ?? undefined;
            const notes = s.notes ?? s.bemerkung ?? s.remarks ?? undefined;
            vehiclesFromStats.push({ id, name, plate, snowsatNumber, isRetired, location, vehicleType, fuelType, notes });
            map[id] = {
              startHours: s.periodStartHours == null ? null : Number(s.periodStartHours),
              endHours: s.periodEndHours == null ? null : Number(s.periodEndHours),
              fuelLiters: Number(s.totalFuelLiters ?? s.fuelLiters ?? 0),
            };
          });
        } else if (statsData && typeof statsData === 'object') {
          // object mapping: { vehicleId: { periodStartHours, periodEndHours, fuelLiters, name?, plate? }, ... }
          Object.entries(statsData as Record<string, StatsObjectValue>).forEach(([k, obj]) => {
            const id = String(k);
            const name = obj.name ?? obj.vehicleName ?? t('vehicleFallbackName', { id });
            const plate = obj.plate ?? obj.kennzeichen ?? '';
            const snowsatNumber = obj.snowsatNumber ?? obj.SNOWsatNumber ?? obj.snowsat ?? undefined;
            const isRetired = Boolean(obj.isRetired);
            const location = obj.location ?? obj.ort ?? undefined;
            const vehicleType = obj.vehicleType ?? obj.type ?? obj.typ ?? undefined;
            const fuelType = obj.fuelType ?? obj.fuel ?? obj.treibstoff ?? undefined;
            const notes = obj.notes ?? obj.bemerkung ?? obj.remarks ?? undefined;
            vehiclesFromStats.push({ id, name, plate, snowsatNumber, isRetired, location, vehicleType, fuelType, notes });
            map[id] = {
              startHours: obj.periodStartHours == null ? null : Number(obj.periodStartHours),
              endHours: obj.periodEndHours == null ? null : Number(obj.periodEndHours),
              fuelLiters: Number(obj.totalFuelLiters ?? obj.fuelLiters ?? 0),
            };
          });
        } else {
          throw new Error('Unexpected stats response format');
        }

        setVehicles(vehiclesFromStats);
        setStatsMap(map);
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return;
        console.error('Fehler beim Laden der Fahrzeug-Stats:', err);
        setError(t('statsLoadError'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();

    return () => {
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedOrgId, rangeStart, rangeEnd, rangeInvalid]);

  const handleEdit = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);
    setEditForm({
      name: vehicle.name,
      plate: vehicle.plate,
      snowsatNumber: vehicle.snowsatNumber || '',
      location: vehicle.location || '',
      vehicleType: vehicle.vehicleType || '',
      fuelType: vehicle.fuelType || '',
      notes: vehicle.notes || '',
    });
  };

  const handleCancelEdit = () => {
    setEditingVehicle(null);
    setEditForm({
      name: '',
      plate: '',
      snowsatNumber: '',
      location: '',
      vehicleType: '',
      fuelType: '',
      notes: '',
    });
  };

  const handleSaveEdit = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingVehicle) return;

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

      const res = await authenticatedFetch(buildApiUrl(`/vehicles/${editingVehicle.id}`), {
        method: 'PUT',
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        await throwApiError(res, `API error ${res.status}`);
      }

      const updatedVehicle = await res.json();

      // Aktualisiere die Liste
      setVehicles((prev) =>
        prev.map((v) =>
          v.id === editingVehicle.id
            ? {
                id: updatedVehicle.id,
                name: updatedVehicle.name,
                plate: updatedVehicle.plate,
                snowsatNumber: updatedVehicle.snowsatNumber,
                location: updatedVehicle.location,
                vehicleType: updatedVehicle.vehicleType,
                fuelType: updatedVehicle.fuelType,
                notes: updatedVehicle.notes,
              }
            : v
        )
      );

      handleCancelEdit();
      showToast(t('updateSuccess'), 'success');
    } catch (err) {
      console.error('Fehler beim Aktualisieren des Fahrzeugs:', err);
      setError(getApiErrorMessage(err, t('updateErrorGeneric')));
      showToast(t('updateErrorToast'), 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await authenticatedFetch(buildApiUrl(`/vehicles/${id}`), {
        method: 'DELETE',
      });

      if (!res.ok) {
        await throwApiError(res, t('deleteErrorGeneric', { status: res.status }));
      }

      setVehicles((prev) => prev.filter((vehicle) => vehicle.id !== id));
      showToast(t('deleteSuccess'), 'success');
    } catch (err) {
      console.error('Fehler beim Löschen des Fahrzeugs:', err);
      showToast(getApiErrorMessage(err, t('deleteErrorToast')), 'error');
    }
  };

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-zinc-50">
          {t('title')}
        </h1>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mt-2">
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
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {t('vehiclesInFleetCount', { count: vehicles.length })}
          </p>
        </div>
      </div>

      {/* Zeitraum-Filter */}
      <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-4">
        <div className="flex flex-col sm:flex-row sm:items-end gap-3">
          <div className="flex-1 space-y-1">
            <label htmlFor="rangeStart" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              {t('filterStartLabel')}
            </label>
            <input
              id="rangeStart"
              type="datetime-local"
              value={rangeStart}
              onChange={(e) => setRangeStart(e.target.value)}
              className="block w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-50 focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          <div className="flex-1 space-y-1">
            <label htmlFor="rangeEnd" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              {t('filterEndLabel')}
            </label>
            <input
              id="rangeEnd"
              type="datetime-local"
              value={rangeEnd}
              onChange={(e) => setRangeEnd(e.target.value)}
              className="block w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-50 focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
        </div>
        {rangeInvalid && (
          <p className="mt-3 text-sm text-red-600 dark:text-red-400">{t('invalidRangeError')}</p>
        )}
      </div>

      {/* Edit Modal */}
      {editingVehicle && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-zinc-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                {t('editModalTitle')}
              </h2>
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
              {/* Fahrzeugname */}
              <div className="space-y-2">
                <label htmlFor="edit-name" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  {t('vehicleNameLabel')}
                </label>
                <input
                  id="edit-name"
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="block w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-4 py-2 text-zinc-900 dark:text-zinc-50 focus:border-blue-500 focus:ring-blue-500"
                  required
                />
              </div>

              {/* Kennzeichen */}
              <div className="space-y-2">
                <label htmlFor="edit-plate" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  {t('plateLabel')}
                </label>
                <input
                  id="edit-plate"
                  type="text"
                  value={editForm.plate}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, plate: e.target.value }))}
                  className="block w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-4 py-2 text-zinc-900 dark:text-zinc-50 focus:border-blue-500 focus:ring-blue-500"
                  required
                />
              </div>

              {/* SNOWsat-Nummer */}
              <div className="space-y-2">
                <label htmlFor="edit-snowsatNumber" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  {t('snowsatNumberFieldLabel')}
                </label>
                <input
                  id="edit-snowsatNumber"
                  type="text"
                  value={editForm.snowsatNumber}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, snowsatNumber: e.target.value }))}
                  className="block w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-4 py-2 text-zinc-900 dark:text-zinc-50 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              {/* Ort */}
              <div className="space-y-2">
                <label htmlFor="edit-location" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  {t('locationLabel')}
                </label>
                <input
                  id="edit-location"
                  type="text"
                  value={editForm.location}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, location: e.target.value }))}
                  placeholder={t('locationPlaceholder')}
                  className="block w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-4 py-2 text-zinc-900 dark:text-zinc-50 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              {/* Typ */}
              <div className="space-y-2">
                <label htmlFor="edit-vehicleType" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  {t('typeLabel')}
                </label>
                <select
                  id="edit-vehicleType"
                  value={editForm.vehicleType}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, vehicleType: e.target.value }))}
                  className="block w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-4 py-2 text-zinc-900 dark:text-zinc-50 focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="">{t('pleaseSelect')}</option>
                  <option value="Pistenfahrzeug">{t('vehicleTypeGroomer')}</option>
                  <option value="Skidoo">{t('vehicleTypeSkidoo')}</option>
                  <option value="Quad">{t('vehicleTypeQuad')}</option>
                </select>
              </div>

              {/* Treibstoff */}
              <div className="space-y-2">
                <label htmlFor="edit-fuelType" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  {t('fuelTypeLabel')}
                </label>
                <select
                  id="edit-fuelType"
                  value={editForm.fuelType}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, fuelType: e.target.value }))}
                  className="block w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-4 py-2 text-zinc-900 dark:text-zinc-50 focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="">{t('pleaseSelect')}</option>
                  <option value="Diesel">{t('fuelTypeDiesel')}</option>
                  <option value="Benzin">{t('fuelTypeGasoline')}</option>
                </select>
              </div>

              {/* Bemerkung */}
              <div className="space-y-2">
                <label htmlFor="edit-notes" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  {t('notesLabel')}
                </label>
                <textarea
                  id="edit-notes"
                  value={editForm.notes}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, notes: e.target.value }))}
                  placeholder={t('notesPlaceholder')}
                  rows={3}
                  className="block w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-4 py-2 text-zinc-900 dark:text-zinc-50 focus:border-blue-500 focus:ring-blue-500"
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
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed px-6 py-2.5 font-medium text-white transition-colors"
                >
                  {isSubmitting ? t('saving') : t('saveChanges')}
                </button>
                <button
                  type="button"
                  onClick={handleCancelEdit}
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

      {vehicles.length > 0 ? (
        <div className="grid gap-3">
          {vehicles.map((vehicle) => (
            <VehicleItem
              key={vehicle.id}
              vehicle={vehicle}
              onEdit={handleEdit}
              onDelete={(id) => setConfirmDeleteId(id)}
              stats={statsMap[vehicle.id] ?? null}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-zinc-300 dark:border-zinc-600 p-8 text-center">
          <p className="text-zinc-600 dark:text-zinc-400">
            {t('noVehiclesFound')}
          </p>
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

export default FlottenUebersicht;
// ...existing code...




// 'use client';

// import { useState, type FC } from 'react';

// interface Vehicle {
//   id: string;
//   name: string;
//   plate: string;
// }

// interface VehicleItemProps {
//   vehicle: Vehicle;
//   onEdit: (vehicle: Vehicle) => void;
//   onDelete: (id: string) => void;
// }

// const VehicleItem: FC<VehicleItemProps> = ({ vehicle, onEdit, onDelete }) => (
//   <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 p-4 hover:shadow-md transition-shadow flex justify-between items-start">
//     <div className="flex-1">
//       <h3 className="font-semibold text-zinc-900 dark:text-zinc-50 mb-2">
//         {vehicle.name}
//       </h3>
//       <div className="text-sm text-zinc-600 dark:text-zinc-400">
//         Kennzeichen: <span className="font-medium">{vehicle.plate}</span>
//       </div>
//     </div>

//     {/* Action Buttons */}
//     <div className="flex gap-2 ml-4">
//       <button
//         onClick={() => onEdit(vehicle)}
//         className="p-2 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 transition-colors"
//         title="Bearbeiten"
//       >
//         <svg
//           className="w-5 h-5"
//           fill="none"
//           stroke="currentColor"
//           viewBox="0 0 24 24"
//         >
//           <path
//             strokeLinecap="round"
//             strokeLinejoin="round"
//             strokeWidth={2}
//             d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
//           />
//         </svg>
//       </button>

//       <button
//         onClick={() => {
//           if (confirm(`Möchten Sie "${vehicle.name}" wirklich löschen?`)) {
//             onDelete(vehicle.id);
//           }
//         }}
//         className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 transition-colors"
//         title="Löschen"
//       >
//         <svg
//           className="w-5 h-5"
//           fill="none"
//           stroke="currentColor"
//           viewBox="0 0 24 24"
//         >
//           <path
//             strokeLinecap="round"
//             strokeLinejoin="round"
//             strokeWidth={2}
//             d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
//           />
//         </svg>
//       </button>
//     </div>
//   </div>
// );

// const FlottenUebersicht: FC = () => {
//   const [vehicles, setVehicles] = useState<Vehicle[]>([
//     { id: "1", name: "Toyota Corolla", plate: "ZH-123456" },
//     { id: "2", name: "VW Golf", plate: "ZH-789012" },
//   ]);

//   const handleEdit = (vehicle: Vehicle) => {
//     console.log('Edit:', vehicle);
//     // TODO: Modal oder Edit-View öffnen
//     alert(`Bearbeite: ${vehicle.name}`);
//   };

//   const handleDelete = (id: string) => {
//     setVehicles((prev) => prev.filter((vehicle) => vehicle.id !== id));
//   };

//   return (
//     <section className="space-y-6">
//       <div>
//         <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
//           Flottenübersicht
//         </h1>
//         <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
//           {vehicles.length} Fahrzeuge in der Flotte
//         </p>
//       </div>

//       {vehicles.length > 0 ? (
//         <div className="grid gap-3">
//           {vehicles.map((vehicle) => (
//             <VehicleItem
//               key={vehicle.id}
//               vehicle={vehicle}
//               onEdit={handleEdit}
//               onDelete={handleDelete}
//             />
//           ))}
//         </div>
//       ) : (
//         <div className="rounded-lg border border-dashed border-zinc-300 dark:border-zinc-600 p-8 text-center">
//           <p className="text-zinc-600 dark:text-zinc-400">
//             Keine Fahrzeuge vorhanden
//           </p>
//         </div>
//       )}
//     </section>
//   );
// };

// export default FlottenUebersicht;