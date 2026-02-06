'use client';

import { useState, useEffect, type FC, type FormEvent } from 'react';
import { authenticatedFetch } from '@/lib/api/authenticatedFetch';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useOrganization } from '@/lib/contexts/OrganizationContext';
import { useToast } from '@/lib/hooks/useToast';
import { ToastContainer } from './Toast';

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

interface VehicleItemProps {
  vehicle: Vehicle;
  onEdit: (vehicle: Vehicle) => void;
  onDelete: (id: string) => void;
  stats?: { hours: number; fuelLiters: number } | null;
}

const VehicleItem: FC<VehicleItemProps> = ({ vehicle, onEdit, onDelete, stats = null }) => (
  <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 p-4 hover:shadow-md transition-shadow flex justify-between items-start">
    <div className="flex-1">
      <h3 className="font-semibold text-zinc-900 dark:text-zinc-50 mb-2">
        {vehicle.name}
        {vehicle.isRetired && (
          <span className="ml-2 text-sm font-normal text-red-600 dark:text-red-400">(Ausrangiert)</span>
        )}
      </h3>
      <div className="space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
        <div>Kennzeichen: <span className="font-medium">{vehicle.plate}</span></div>
        {vehicle.snowsatNumber && (
          <div>SNOWsat-Nr: <span className="font-medium">{vehicle.snowsatNumber}</span></div>
        )}
        {vehicle.location && (
          <div>Ort: <span className="font-medium">{vehicle.location}</span></div>
        )}
        {vehicle.vehicleType && (
          <div>Typ: <span className="font-medium">{vehicle.vehicleType}</span></div>
        )}
        {vehicle.fuelType && (
          <div>Treibstoff: <span className="font-medium">{vehicle.fuelType}</span></div>
        )}
        {vehicle.notes && (
          <div>Bemerkung: <span className="font-medium">{vehicle.notes}</span></div>
        )}
      </div>
      <div className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        <div>
          Arbeitsstunden:{' '}
          <span className="font-medium">
            {typeof stats?.hours === 'number' ? stats.hours.toFixed(2) : '—'}
          </span>
        </div>
        <div>Total getankt: <span className="font-medium">{stats?.fuelLiters ?? '—'} L</span></div>
      </div>
    </div>

    {/* Action Buttons */}
    <div className="flex gap-2 ml-4">
      <button
        onClick={() => onEdit(vehicle)}
        className="p-2 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 transition-colors"
        title="Bearbeiten"
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
        onClick={() => {
          if (confirm(`Möchten Sie "${vehicle.name}" wirklich löschen?`)) {
            onDelete(vehicle.id);
          }
        }}
        className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 transition-colors"
        title="Löschen"
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

const FlottenUebersicht: FC = () => {
  const { isSuperAdmin } = useAuth();
  const { organizations, selectedOrgId, setSelectedOrgId } = useOrganization();
  const { toasts, showToast, removeToast } = useToast();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [statsMap, setStatsMap] = useState<Record<string, { hours: number; fuelLiters: number }>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
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

  // Fetch vehicle stats when organization is selected
  useEffect(() => {
    console.log('[VEHICLES] useEffect gestartet');
    const apiUrl = process.env.NEXT_PUBLIC_API_URL
    console.log('[VEHICLES] API URL:', apiUrl);
    if (!apiUrl) {
      console.warn('NEXT_PUBLIC_API_URL nicht konfiguriert')
      return
    }

    if (!selectedOrgId) {
      console.log('[VEHICLES] Waiting for organization selection...');
      return;
    }

    const controller = new AbortController();
    const fetchStats = async () => {
      console.log('[VEHICLES] fetchStats wird aufgerufen');
      setIsLoading(true);
      setError(null);

      try {
        console.log('[VEHICLES] Versuche Request zu senden...');
        const headers: HeadersInit = {};
        if (isSuperAdmin && selectedOrgId) {
          headers['X-Organization-Id'] = selectedOrgId;
        }
        
        const res = await authenticatedFetch(`${apiUrl}/vehicles/stats`, { signal: controller.signal, headers });
        console.log('[VEHICLES] Request erfolgreich, Status:', res.status);
        if (!res.ok) throw new Error(`Vehicles stats HTTP ${res.status}`);
        const statsData = await res.json();

        // Normalize into vehicles array and statsMap
        const vehiclesFromStats: Vehicle[] = [];
        const map: Record<string, { hours: number; fuelLiters: number }> = {};

        if (Array.isArray(statsData)) {
          // Expect items like { id|vehicleId, name, plate, totalHours, totalFuelLiters }
          statsData.forEach((s: any) => {
            const id = String(s.vehicleId ?? s.id ?? s.vehicleId ?? s.vehicle ?? s.vehicleId ?? '');
            const name = s.name ?? s.vehicleName ?? s.vehicle ?? `Fahrzeug ${id}`;
            const plate = s.plate ?? s.kennzeichen ?? s.registration ?? '';
            const snowsatNumber = s.snowsatNumber ?? s.SNOWsatNumber ?? s.snowsat ?? undefined;
            const isRetired = Boolean(s.isRetired);
            const location = s.location ?? s.ort ?? undefined;
            const vehicleType = s.vehicleType ?? s.type ?? s.typ ?? undefined;
            const fuelType = s.fuelType ?? s.fuel ?? s.treibstoff ?? undefined;
            const notes = s.notes ?? s.bemerkung ?? s.remarks ?? undefined;
            vehiclesFromStats.push({ id, name, plate, snowsatNumber, isRetired, location, vehicleType, fuelType, notes });
            map[id] = {
              hours: Number(s.totalWorkHours ?? s.totalHours ?? s.hours ?? 0),
              fuelLiters: Number(s.totalFuelLiters ?? s.fuelLiters ?? s.fuel ?? 0),
            };
          });
        } else if (statsData && typeof statsData === 'object') {
          // object mapping: { vehicleId: { hours, fuelLiters, name?, plate? }, ... }
          Object.entries(statsData).forEach(([k, v]) => {
            const obj: any = v as any;
            const id = String(k);
            const name = obj.name ?? obj.vehicleName ?? `Fahrzeug ${id}`;
            const plate = obj.plate ?? obj.kennzeichen ?? '';
            const snowsatNumber = obj.snowsatNumber ?? obj.SNOWsatNumber ?? obj.snowsat ?? undefined;
            const isRetired = Boolean(obj.isRetired);
            const location = obj.location ?? obj.ort ?? undefined;
            const vehicleType = obj.vehicleType ?? obj.type ?? obj.typ ?? undefined;
            const fuelType = obj.fuelType ?? obj.fuel ?? obj.treibstoff ?? undefined;
            const notes = obj.notes ?? obj.bemerkung ?? obj.remarks ?? undefined;
            vehiclesFromStats.push({ id, name, plate, snowsatNumber, isRetired, location, vehicleType, fuelType, notes });
            map[id] = {
              hours: Number(obj.totalWorkHours ?? obj.totalHours ?? obj.hours ?? 0),
              fuelLiters: Number(obj.totalFuelLiters ?? obj.fuelLiters ?? obj.fuel ?? 0),
            };
          });
        } else {
          throw new Error('Unexpected stats response format');
        }

        setVehicles(vehiclesFromStats);
        setStatsMap(map);
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return;
        console.error('[VEHICLES] Fehler beim Laden der Fahrzeug-Stats:', err);
        console.error('[VEHICLES] Fehler Details:', err instanceof Error ? err.message : String(err));
        setError('Fehler beim Laden der Fahrzeuge');
        // keep empty vehicles and statsMap
      } finally {
        setIsLoading(false);
      }
    };

    console.log('[VEHICLES] Rufe fetchStats auf');
    fetchStats();

    return () => {
      console.log('[VEHICLES] useEffect cleanup');
      controller.abort();
    };
  }, [selectedOrgId, isSuperAdmin]);

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
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      if (!apiUrl) throw new Error('API URL nicht konfiguriert');

      const payload = {
        name: editForm.name,
        plate: editForm.plate,
        snowsatNumber: editForm.snowsatNumber || undefined,
        location: editForm.location || undefined,
        vehicleType: editForm.vehicleType || undefined,
        fuelType: editForm.fuelType || undefined,
        notes: editForm.notes || undefined,
      };

      const headers: HeadersInit = {};
      if (isSuperAdmin && selectedOrgId) {
        headers['X-Organization-Id'] = selectedOrgId;
      }

      const res = await authenticatedFetch(`${apiUrl}/vehicles/${editingVehicle.id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
        headers,
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`API error ${res.status}: ${text}`);
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
      showToast('Fahrzeug erfolgreich aktualisiert', 'success');
    } catch (err) {
      console.error('Fehler beim Aktualisieren des Fahrzeugs:', err);
      setError(err instanceof Error ? err.message : 'Fehler beim Aktualisieren');
      showToast('Fehler beim Aktualisieren des Fahrzeugs', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!apiUrl) {
      setVehicles((prev) => prev.filter((vehicle) => vehicle.id !== id));
      return;
    }

    try {
      const headers: HeadersInit = {};
      if (isSuperAdmin && selectedOrgId) {
        headers['X-Organization-Id'] = selectedOrgId;
      }

      const res = await authenticatedFetch(`${apiUrl}/vehicles/${id}`, {
        method: 'DELETE',
        headers,
      });

      if (!res.ok) {
        throw new Error(`Fehler beim Löschen: ${res.status}`);
      }

      setVehicles((prev) => prev.filter((vehicle) => vehicle.id !== id));
      showToast('Fahrzeug erfolgreich gelöscht', 'success');
    } catch (err) {
      console.error('Fehler beim Löschen des Fahrzeugs:', err);
      showToast('Fehler beim Löschen des Fahrzeugs', 'error');
    }
  };

  // Berechne Gesamttreibstoff über alle Fahrzeuge
  const totalFuel = Object.values(statsMap).reduce((sum, stats) => sum + stats.fuelLiters, 0);

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-zinc-50">
          Flottenübersicht
        </h1>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mt-2">
          {isSuperAdmin && organizations.length > 0 && (
            <div className="flex items-center gap-2">
              <label className="text-sm text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
                Organization:
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
            {vehicles.length} Fahrzeuge in der Flotte
          </p>
        </div>
      </div>

      {/* Gesamttreibstoff Anzeige */}
      {vehicles.length > 0 && (
        <div className="rounded-lg border-2 border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
                Gesamt getankter Treibstoff
              </p>
              <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                {totalFuel.toFixed(2)} L
              </p>
            </div>
            <svg 
              className="w-16 h-16 text-blue-400 dark:text-blue-600" 
              fill="currentColor"
              viewBox="0 0 640 640"
            >
              <path d="M96 128C96 92.7 124.7 64 160 64L320 64C355.3 64 384 92.7 384 128L384 320L392 320C440.6 320 480 359.4 480 408L480 440C480 453.3 490.7 464 504 464C517.3 464 528 453.3 528 440L528 286C500.4 278.9 480 253.8 480 224L480 164.5L454.2 136.2C445.3 126.4 446 111.2 455.8 102.3C465.6 93.4 480.8 94.1 489.7 103.9L561.4 182.7C570.8 193 576 206.4 576 220.4L576 440C576 479.8 543.8 512 504 512C464.2 512 432 479.8 432 440L432 408C432 385.9 414.1 368 392 368L384 368L384 529.4C393.3 532.7 400 541.6 400 552C400 565.3 389.3 576 376 576L104 576C90.7 576 80 565.3 80 552C80 541.5 86.7 532.7 96 529.4L96 128zM160 144L160 240C160 248.8 167.2 256 176 256L304 256C312.8 256 320 248.8 320 240L320 144C320 135.2 312.8 128 304 128L176 128C167.2 128 160 135.2 160 144z"/>
            </svg>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingVehicle && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-zinc-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                Fahrzeug bearbeiten
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
                  Fahrzeugname
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
                  Kennzeichen
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
                  SNOWsat-Nummer (optional)
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
                  Ort
                </label>
                <input
                  id="edit-location"
                  type="text"
                  value={editForm.location}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, location: e.target.value }))}
                  placeholder="z.B. SLG"
                  className="block w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-4 py-2 text-zinc-900 dark:text-zinc-50 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              {/* Typ */}
              <div className="space-y-2">
                <label htmlFor="edit-vehicleType" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Typ
                </label>
                <select
                  id="edit-vehicleType"
                  value={editForm.vehicleType}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, vehicleType: e.target.value }))}
                  className="block w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-4 py-2 text-zinc-900 dark:text-zinc-50 focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="">Bitte wählen</option>
                  <option value="Pistenfahrzeug">Pistenfahrzeug</option>
                  <option value="Skidoo">Skidoo</option>
                  <option value="Quad">Quad</option>
                </select>
              </div>

              {/* Treibstoff */}
              <div className="space-y-2">
                <label htmlFor="edit-fuelType" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Treibstoff
                </label>
                <select
                  id="edit-fuelType"
                  value={editForm.fuelType}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, fuelType: e.target.value }))}
                  className="block w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-4 py-2 text-zinc-900 dark:text-zinc-50 focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="">Bitte wählen</option>
                  <option value="Diesel">Diesel</option>
                  <option value="Benzin">Benzin</option>
                </select>
              </div>

              {/* Bemerkung */}
              <div className="space-y-2">
                <label htmlFor="edit-notes" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Bemerkung
                </label>
                <textarea
                  id="edit-notes"
                  value={editForm.notes}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, notes: e.target.value }))}
                  placeholder="Optionale Bemerkungen zum Fahrzeug"
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
                  {isSubmitting ? 'Wird gespeichert...' : 'Änderungen speichern'}
                </button>
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-600 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors disabled:opacity-50"
                >
                  Abbrechen
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="rounded-lg border border-dashed border-zinc-300 dark:border-zinc-600 p-4 text-center">
          <p className="text-zinc-600 dark:text-zinc-400">Lade Fahrzeuge...</p>
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
              onDelete={handleDelete}
              stats={statsMap[vehicle.id] ?? null}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-zinc-300 dark:border-zinc-600 p-8 text-center">
          <p className="text-zinc-600 dark:text-zinc-400">
            Keine Fahrzeuge vorhanden
          </p>
        </div>
      )}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
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