'use client';

import { useState, useCallback, useEffect, useRef, type FC, type FormEvent } from 'react';
import { authenticatedFetch } from '@/lib/api/authenticatedFetch';
import { buildApiUrl, getApiBaseUrlOrNull } from '@/lib/api/url';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useOrganization } from '@/lib/contexts/OrganizationContext';
import { useToast } from '@/lib/hooks/useToast';
import { ToastContainer } from './Toast';

interface Vehicle {
  id: string;
  name: string;
  plate: string;
  snowsatNumber?: string;
}

interface FormState {
  vehicleId: string;
  startOperatingHours: string;
  endOperatingHours: string;
  fuel: string;
  usageDate: string;
}

const calculateHoursDifference = (start: string, end: string): number | null => {
  const startHours = parseFloat(start);
  const endHours = parseFloat(end);
  if (Number.isNaN(startHours) || Number.isNaN(endHours)) return null;
  if (endHours <= startHours) return null;
  return endHours - startHours;
};

// Zwischenspeicherung der Formular-Eingaben, damit ein Fahrer offline erfasste
// Werte nicht verliert, wenn er die App schliesst und erst spaeter (mit
// Empfang) zur Erfassung zurueckkehrt. Wird nach erfolgreichem Speichern der
// Nutzung wieder auf den Standardzustand zurueckgesetzt (siehe handleSubmit).
// Pro Organisation getrennt, damit Fahrer/Admins mit mehreren Organisationen
// keinen falsch zugeordneten Entwurf vorfinden.
function getDraftStorageKey(organizationId: string): string {
  return `fleettrack:createUsageDraft:${organizationId}`;
}

function loadDraft(organizationId: string): Partial<FormState> | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(getDraftStorageKey(organizationId));
    return raw ? (JSON.parse(raw) as Partial<FormState>) : null;
  } catch {
    return null;
  }
}

// Netzwerkfehler (fetch() schlaegt fehl bzw. laeuft in den 20s-Timeout) lassen
// sich nicht sauber von "Server down" unterscheiden, sind in der Praxis bei
// dieser App aber praktisch immer fehlender/schlechter Empfang - navigator
// .onLine allein reicht nicht, da es bei schwachem Empfang oft faelschlich
// "online" meldet.
function isLikelyOfflineError(err: unknown): boolean {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return true;
  if (err instanceof TypeError) return true;
  if (err instanceof DOMException && (err.name === 'TimeoutError' || err.name === 'AbortError')) return true;
  return false;
}

const CreateUsage: FC = () => {
  const { isAdmin } = useAuth();
  const { organizations, selectedOrgId, setSelectedOrgId } = useOrganization();
  const { toasts, showToast, removeToast } = useToast();
  
  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  const [formData, setFormData] = useState<FormState>({
    vehicleId: '',
    startOperatingHours: '',
    endOperatingHours: '',
    fuel: '',
    usageDate: getTodayDate(),
  });
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehiclesLoading, setVehiclesLoading] = useState(false);
  const [vehiclesError, setVehiclesError] = useState<string | null>(null);
  const [calculatedHours, setCalculatedHours] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeError, setTimeError] = useState<string | null>(null);
  const [loadingOperatingHours, setLoadingOperatingHours] = useState(false);
  // Keep a ref of the current vehicleId so the vehicles-fetching effect can check
  // if the currently selected vehicle is still valid without being in its dep array.
  const currentVehicleIdRef = useRef<string>('');
  // Verhindert, dass die Start-Betriebsstunden eines wiederhergestellten Entwurfs
  // beim ersten Laden der Fahrzeuge sofort durch den automatischen "letzte
  // Betriebsstunden"-Fetch ueberschrieben werden (siehe Vehicles-Fetch-Effekt).
  const skipInitialFetchRef = useRef<boolean>(false);
  // Fuer welche Organisation formData gerade den geladenen Entwurf enthaelt -
  // wird zusammen mit formData im selben Batch gesetzt (siehe Restore-Effekt),
  // damit der Persistierungs-Effekt formData nie unter der falschen bzw. noch
  // nicht wiederhergestellten Organisation abspeichert.
  const [activeDraftOrgId, setActiveDraftOrgId] = useState<string | null>(null);

  // Entwurf laden, sobald (und jedes Mal wenn) die ausgewaehlte Organisation
  // bekannt ist bzw. wechselt.
  useEffect(() => {
    if (!selectedOrgId) return;

    const draft = loadDraft(selectedOrgId);
    currentVehicleIdRef.current = draft?.vehicleId ?? '';
    skipInitialFetchRef.current = Boolean(draft?.vehicleId);

    setFormData({
      vehicleId: draft?.vehicleId ?? '',
      startOperatingHours: draft?.startOperatingHours ?? '',
      endOperatingHours: draft?.endOperatingHours ?? '',
      fuel: draft?.fuel ?? '',
      usageDate: draft?.usageDate ?? getTodayDate(),
    });
    setCalculatedHours(
      draft ? calculateHoursDifference(draft.startOperatingHours ?? '', draft.endOperatingHours ?? '') : null
    );
    setActiveDraftOrgId(selectedOrgId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedOrgId]);

  // Formular-Eingaben laufend zwischenspeichern (auch waehrend der Eingabe,
  // nicht erst beim Verlassen der Seite) - nach erfolgreichem Speichern wird
  // formData in handleSubmit auf den Standardzustand zurueckgesetzt, wodurch
  // hier automatisch auch der zwischengespeicherte Entwurf "geleert" wird.
  // Schreibt erst, sobald der Entwurf fuer die aktuelle Organisation wirklich
  // geladen wurde (activeDraftOrgId === selectedOrgId), sonst wuerde hier ein
  // noch nicht wiederhergestellter (leerer) Zwischenstand einen vorhandenen
  // Entwurf ueberschreiben.
  useEffect(() => {
    if (!selectedOrgId || activeDraftOrgId !== selectedOrgId) return;
    try {
      window.localStorage.setItem(getDraftStorageKey(selectedOrgId), JSON.stringify(formData));
    } catch {
      // localStorage nicht verfuegbar (z.B. Private Mode) - Entwurf wird dann nicht zwischengespeichert
    }
  }, [formData, selectedOrgId, activeDraftOrgId]);

  const updateCalculatedHours = useCallback(() => {
    const hours = calculateHoursDifference(formData.startOperatingHours, formData.endOperatingHours);
    setCalculatedHours(hours);
  }, [formData.startOperatingHours, formData.endOperatingHours]);

  const fetchVehicleEndOperatingHours = useCallback(async (vehicleId: string) => {
    const apiBaseUrl = getApiBaseUrlOrNull();
    if (!apiBaseUrl || !vehicleId) return;

    setLoadingOperatingHours(true);
    try {
      const url = new URL(buildApiUrl(`/vehicles/${vehicleId}/last-operating-hours`));
      if (selectedOrgId) {
        url.searchParams.set('organizationId', selectedOrgId);
      }

      const res = await authenticatedFetch(url.toString());
      if (!res.ok) {
        setFormData((prev) => ({ ...prev, startOperatingHours: '0' }));
        return;
      }
      const data = await res.json();
      if (data.endOperatingHours !== undefined && data.endOperatingHours !== null) {
        setFormData((prev) => ({ ...prev, startOperatingHours: String(data.endOperatingHours) }));
      } else {
        setFormData((prev) => ({ ...prev, startOperatingHours: '0' }));
      }
    } catch (err) {
      console.error('Fehler beim Laden der letzten Betriebsstunden:', err);
      setFormData((prev) => ({ ...prev, startOperatingHours: '0' }));
    } finally {
      setLoadingOperatingHours(false);
    }
  }, [selectedOrgId]);

  const handleVehicleChange = useCallback((vehicleId: string) => {
    currentVehicleIdRef.current = vehicleId;
    setFormData((prev) => ({ ...prev, vehicleId }));
    fetchVehicleEndOperatingHours(vehicleId);
  }, [fetchVehicleEndOperatingHours]);

  const handleOperatingHoursChange = (field: 'startOperatingHours' | 'endOperatingHours', value: string) => {
    // compute new values immediately to avoid relying on state update timing
    const newValues = {
      startOperatingHours: field === 'startOperatingHours' ? value : formData.startOperatingHours,
      endOperatingHours: field === 'endOperatingHours' ? value : formData.endOperatingHours,
    };

    setFormData((prev) => ({ ...prev, [field]: value }));
    const hours = calculateHoursDifference(newValues.startOperatingHours, newValues.endOperatingHours);
    setCalculatedHours(hours);

    // Inline validation: ensure end > start
    const parsedStart = parseFloat(newValues.startOperatingHours);
    const parsedEnd = parseFloat(newValues.endOperatingHours);
    if (!Number.isNaN(parsedStart) && !Number.isNaN(parsedEnd)) {
      if (parsedEnd <= parsedStart) {
        setTimeError('End-Betriebsstunden müssen größer als Start-Betriebsstunden sein');
      } else {
        setTimeError(null);
      }
    } else {
      setTimeError(null);
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      if (!formData.vehicleId) throw new Error('Bitte ein Fahrzeug auswählen');
      if (!formData.startOperatingHours || !formData.endOperatingHours) throw new Error('Start- und End-Betriebsstunden sind erforderlich');

      const parsedStart = parseFloat(formData.startOperatingHours);
      const parsedEnd = parseFloat(formData.endOperatingHours);
      if (Number.isNaN(parsedStart) || Number.isNaN(parsedEnd)) throw new Error('Ungültiges Zahlenformat');
      if (parsedEnd <= parsedStart) throw new Error('End-Betriebsstunden müssen größer als Start-Betriebsstunden sein');

      const parsedFuel = formData.fuel.trim() === '' ? NaN : parseFloat(formData.fuel);
      const fuelLitersRefilled = Number.isNaN(parsedFuel) ? 0 : parsedFuel;

      const payload = {
        vehicleId: formData.vehicleId,
        startOperatingHours: parsedStart,
        endOperatingHours: parsedEnd,
        fuelLitersRefilled,
        usageDate: formData.usageDate,
      };

      const res = await authenticatedFetch(buildApiUrl('/usages'), {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`API-Fehler ${res.status}: ${text}`);
      }

      await res.json();

      setFormData({ vehicleId: vehicles[0]?.id ?? '', startOperatingHours: '', endOperatingHours: '', fuel: '', usageDate: getTodayDate() });
      setCalculatedHours(null);
      showToast('Nutzung erfolgreich gespeichert', 'success');
    } catch (err) {
      console.error('Fehler beim Speichern der Nutzung:', err);

      if (isLikelyOfflineError(err)) {
        // Eingaben bewusst NICHT zuruecksetzen - sie bleiben im Formular und
        // werden (siehe Persistierungs-Effekt) weiterhin zwischengespeichert,
        // damit der Fahrer es spaeter mit Empfang erneut versuchen kann, ohne
        // alles nochmals eingeben zu muessen.
        const message = 'Keine Verbindung zum Server. Die Nutzung konnte nicht gespeichert werden. Deine Eingaben bleiben erhalten - bitte versuche es erneut, sobald du wieder online bist.';
        setError(message);
        showToast(message, 'error');
      } else {
        setError(err instanceof Error ? err.message : 'Fehler beim Speichern des Eintrags');
        showToast('Fehler beim Speichern der Nutzung', 'error');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Fetch vehicles when organization is selected
  useEffect(() => {
    const apiBaseUrl = getApiBaseUrlOrNull();
    if (!apiBaseUrl) return;

    // Wait for organization to be selected
    if (!selectedOrgId) return;

    const controller = new AbortController();
    const fetchVehicles = async () => {
      setVehiclesLoading(true);
      setVehiclesError(null);

      try {
        const url = new URL(buildApiUrl('/vehicles'));
        if (selectedOrgId) {
          url.searchParams.set('organizationId', selectedOrgId);
        }

        const res = await authenticatedFetch(url.toString(), { signal: controller.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (Array.isArray(data)) {
          setVehicles(data);
          const currentValid = data.find((v: Vehicle) => v.id === currentVehicleIdRef.current);
          const selectedVehicleId = currentValid ? currentVehicleIdRef.current : data[0]?.id ?? '';
          // Nur beim allerersten Laden (und nur, wenn das wiederhergestellte
          // Fahrzeug noch existiert) die bereits vorhandenen Start-Betriebsstunden
          // aus dem Entwurf behalten statt sie sofort vom Server zu ueberschreiben.
          const keepRestoredValue = skipInitialFetchRef.current && Boolean(currentValid);
          skipInitialFetchRef.current = false;

          setFormData((prev) => ({ ...prev, vehicleId: selectedVehicleId }));
          currentVehicleIdRef.current = selectedVehicleId;

          if (selectedVehicleId && !keepRestoredValue) {
            fetchVehicleEndOperatingHours(selectedVehicleId);
          }
        } else {
          throw new Error('Unexpected response format');
        }
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return;
        console.error('Fehler beim Laden der Fahrzeuge:', err);
        setVehiclesError('Fehler beim Laden der Fahrzeuge');
      } finally {
        setVehiclesLoading(false);
      }
    };

    fetchVehicles();

    return () => {
      controller.abort();
    };
  }, [fetchVehicleEndOperatingHours, selectedOrgId]);

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
          Nutzung erfassen
        </h1>
        {isAdmin && organizations.length > 0 && (
          <div className="flex items-center gap-2 mt-2">
            <label className="text-sm text-zinc-600 dark:text-zinc-400">
              Organization:
            </label>
            <select
              value={selectedOrgId || ''}
              onChange={(e) => setSelectedOrgId(e.target.value)}
              className="px-3 py-1 text-sm border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-purple-500"
            >
              {organizations.map(org => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="max-w-2xl space-y-5">
        {/* Fahrzeug */}
          {/* Error Message */}
          {error && (
            <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4">
              <p className="text-sm text-red-900 dark:text-red-100">{error}</p>
            </div>
          )}

        <div className="space-y-2">
          <label htmlFor="vehicle" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Fahrzeug
            </label>
            <select
              id="vehicle"
              value={formData.vehicleId}
              onChange={(e) => handleVehicleChange(e.target.value)}
              className="block w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-4 py-2 text-zinc-900 dark:text-zinc-50 focus:border-blue-500 focus:ring-blue-500"
            >
              {vehiclesLoading ? (
                <option value="" disabled>Lade Fahrzeuge...</option>
              ) : vehiclesError ? (
                <option value="" disabled>{vehiclesError}</option>
              ) : vehicles.length === 0 ? (
                <option value="" disabled>Keine Fahrzeuge verfügbar</option>
              ) : (
                vehicles.map((vehicle) => (
                  <option key={vehicle.id} value={vehicle.id}>
                    {vehicle.snowsatNumber ? `${vehicle.snowsatNumber} - ${vehicle.name}` : vehicle.name}
                  </option>
                ))
              )}
            </select>
        </div>

        {/* Erfassungsdatum */}
        <div className="space-y-2">
          <label htmlFor="usageDate" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Erfassungsdatum
          </label>
          <input
            id="usageDate"
            type="date"
            value={formData.usageDate}
            onChange={(e) => setFormData((prev) => ({ ...prev, usageDate: e.target.value }))}
            className="block w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-4 py-2 text-zinc-900 dark:text-zinc-50 focus:border-blue-500 focus:ring-blue-500 [&::-webkit-calendar-picker-indicator]:invert"
            required
          />
        </div>

        {/* Start-Betriebsstunden */}
        <div className="space-y-2">
          <label htmlFor="startOperatingHours" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Start-Betriebsstunden
            {loadingOperatingHours && <span className="ml-2 text-xs text-zinc-500">(wird geladen...)</span>}
          </label>
          <input
            id="startOperatingHours"
            type="number"
            value={formData.startOperatingHours}
            onChange={(e) => handleOperatingHoursChange('startOperatingHours', e.target.value)}
            className="block w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-4 py-2 text-zinc-900 dark:text-zinc-50 focus:border-blue-500 focus:ring-blue-500"
            min="0"
            step="0.1"
            required
            disabled={loadingOperatingHours}
          />
        </div>

        {/* End-Betriebsstunden */}
        <div className="space-y-2">
          <label htmlFor="endOperatingHours" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            End-Betriebsstunden
          </label>
          <input
            id="endOperatingHours"
            type="number"
            value={formData.endOperatingHours}
            onChange={(e) => handleOperatingHoursChange('endOperatingHours', e.target.value)}
            className="block w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-4 py-2 text-zinc-900 dark:text-zinc-50 focus:border-blue-500 focus:ring-blue-500"
            min="0"
            step="0.1"
            required
          />
          {timeError && (
            <p className="mt-2 text-sm text-red-700 dark:text-red-200">{timeError}</p>
          )}
        </div>

        {/* Dauer Anzeige */}
        {calculatedHours !== null && (
          <div className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 p-4">
            <p className="text-sm text-blue-900 dark:text-blue-100">
              Gesamtdauer: <span className="font-semibold">{calculatedHours.toFixed(1)} Stunden</span>
            </p>
          </div>
        )}

        {/* Treibstoff */}
        <div className="space-y-2">
          <label htmlFor="fuel" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Treibstoff (L, optional)
          </label>
          <input
            id="fuel"
            type="number"
            value={formData.fuel}
            onChange={(e) => setFormData((prev) => ({ ...prev, fuel: e.target.value }))}
            className="block w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-4 py-2 text-zinc-900 dark:text-zinc-50 focus:border-blue-500 focus:ring-blue-500"
            min="0"
            step="0.1"
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting || !!timeError}
          className="w-full rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed px-6 py-2.5 font-medium text-white transition-colors"
        >
          {isSubmitting ? 'Wird gespeichert...' : 'Nutzung speichern'}
        </button>
      </form>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </section>
  );
};

export default CreateUsage;