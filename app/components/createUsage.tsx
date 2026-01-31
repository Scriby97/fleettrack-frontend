'use client';

import { useState, useCallback, useEffect, type FC, type FormEvent } from 'react';
import { authenticatedFetch } from '@/lib/api/authenticatedFetch';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useOrganization } from '@/lib/contexts/OrganizationContext';
import { useToast } from '@/lib/hooks/useToast';
import { ToastContainer } from './Toast';

interface Vehicle {
  id: string;
  name: string;
  plate: string;
}

interface FormState {
  vehicleId: string;
  startOperatingHours: string;
  endOperatingHours: string;
  fuel: string;
  creationDate: string;
}

const calculateHoursDifference = (start: string, end: string): number | null => {
  const startHours = parseInt(start, 10);
  const endHours = parseInt(end, 10);
  if (Number.isNaN(startHours) || Number.isNaN(endHours)) return null;
  if (endHours <= startHours) return null;
  return endHours - startHours;
};

const CreateUsage: FC = () => {
  const { isSuperAdmin } = useAuth();
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
    creationDate: getTodayDate(),
  });
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehiclesLoading, setVehiclesLoading] = useState(false);
  const [vehiclesError, setVehiclesError] = useState<string | null>(null);
  const [calculatedHours, setCalculatedHours] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeError, setTimeError] = useState<string | null>(null);
  const [loadingOperatingHours, setLoadingOperatingHours] = useState(false);

  const updateCalculatedHours = useCallback(() => {
    const hours = calculateHoursDifference(formData.startOperatingHours, formData.endOperatingHours);
    setCalculatedHours(hours);
  }, [formData.startOperatingHours, formData.endOperatingHours]);

  const fetchVehicleEndOperatingHours = useCallback(async (vehicleId: string) => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!apiUrl || !vehicleId) return;

    setLoadingOperatingHours(true);
    try {
      const headers: HeadersInit = {};
      if (isSuperAdmin && selectedOrgId) {
        headers['X-Organization-Id'] = selectedOrgId;
      }
      
      const res = await authenticatedFetch(`${apiUrl}/vehicles/${vehicleId}/last-operating-hours`, { headers });
      if (!res.ok) {
        console.warn('Konnte letzte Betriebsstunden nicht laden, setze auf 0');
        setFormData((prev) => ({ ...prev, startOperatingHours: '0' }));
        return;
      }
      const data = await res.json();
      if (data.endOperatingHours !== undefined && data.endOperatingHours !== null) {
        setFormData((prev) => ({ ...prev, startOperatingHours: String(data.endOperatingHours) }));
      } else {
        // Keine vorherige Nutzung vorhanden, setze auf 0
        setFormData((prev) => ({ ...prev, startOperatingHours: '0' }));
      }
    } catch (err) {
      console.error('Fehler beim Laden der letzten Betriebsstunden:', err);
      // Bei Fehler auf 0 setzen
      setFormData((prev) => ({ ...prev, startOperatingHours: '0' }));
    } finally {
      setLoadingOperatingHours(false);
    }
  }, [isSuperAdmin, selectedOrgId]);

  const handleVehicleChange = useCallback((vehicleId: string) => {
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
    const parsedStart = parseInt(newValues.startOperatingHours, 10);
    const parsedEnd = parseInt(newValues.endOperatingHours, 10);
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

      const parsedStart = parseInt(formData.startOperatingHours, 10);
      const parsedEnd = parseInt(formData.endOperatingHours, 10);
      if (Number.isNaN(parsedStart) || Number.isNaN(parsedEnd)) throw new Error('Ungültiges Zahlenformat');
      if (parsedEnd <= parsedStart) throw new Error('End-Betriebsstunden müssen größer als Start-Betriebsstunden sein');

      const parsedFuel = formData.fuel.trim() === '' ? NaN : parseInt(formData.fuel, 10);
      const fuelLitersRefilled = Number.isNaN(parsedFuel) ? 0 : parsedFuel;

      const payload = {
        vehicleId: formData.vehicleId,
        startOperatingHours: parsedStart,
        endOperatingHours: parsedEnd,
        fuelLitersRefilled,
        creationDate: formData.creationDate,
      };

      const apiUrl = process.env.NEXT_PUBLIC_API_URL
      if (apiUrl) {
        const headers: HeadersInit = {};
        if (isSuperAdmin && selectedOrgId) {
          headers['X-Organization-Id'] = selectedOrgId;
        }
        
        const res = await authenticatedFetch(`${apiUrl}/usages`, {
          method: 'POST',
          body: JSON.stringify(payload),
          headers,
        });

        if (!res.ok) {
          const text = await res.text();
          throw new Error(`API error ${res.status}: ${text}`);
        }

        const created = await res.json();
        console.log('Usage erstellt:', created);
      } else {
        console.log('NEXT_PUBLIC_API_URL nicht konfiguriert, Daten nur lokal gespeichert');
      }

      setFormData({ vehicleId: vehicles[0]?.id ?? '', startOperatingHours: '', endOperatingHours: '', fuel: '', creationDate: getTodayDate() });
      setCalculatedHours(null);
      showToast('Nutzung erfolgreich gespeichert', 'success');
    } catch (err) {
      console.error('Fehler beim Speichern der Nutzung:', err);
      setError(err instanceof Error ? err.message : 'Fehler beim Speichern des Eintrags');
      showToast('Fehler beim Speichern der Nutzung', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Fetch vehicles when organization is selected
  useEffect(() => {
    console.log('[CREATE_USAGE] useEffect gestartet');
    const apiUrl = process.env.NEXT_PUBLIC_API_URL
    console.log('[CREATE_USAGE] API URL:', apiUrl);
    if (!apiUrl) {
      console.warn('NEXT_PUBLIC_API_URL nicht konfiguriert')
      return
    }

    // Wait for organization to be selected
    if (!selectedOrgId) {
      console.log('[CREATE_USAGE] Waiting for organization selection...');
      return;
    }

    const controller = new AbortController();
    const fetchVehicles = async () => {
      console.log('[CREATE_USAGE] fetchVehicles wird aufgerufen');
      setVehiclesLoading(true);
      setVehiclesError(null);

      try {
        console.log('[CREATE_USAGE] Versuche Request zu senden...');
        const headers: HeadersInit = {};
        if (isSuperAdmin && selectedOrgId) {
          headers['X-Organization-Id'] = selectedOrgId;
        }
        
        const res = await authenticatedFetch(`${apiUrl}/vehicles`, { signal: controller.signal, headers });
        console.log('[CREATE_USAGE] Request erfolgreich, Status:', res.status);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (Array.isArray(data)) {
          setVehicles(data);
          // set default selected vehicle if none or mismatched
          const currentValid = data.find((v: Vehicle) => v.id === formData.vehicleId);
          const selectedVehicleId = currentValid ? formData.vehicleId : data[0]?.id ?? '';
          
          setFormData((prev) => ({ ...prev, vehicleId: selectedVehicleId }));
          
          // Lade die letzten Betriebsstunden für das ausgewählte Fahrzeug
          if (selectedVehicleId) {
            fetchVehicleEndOperatingHours(selectedVehicleId);
          }
        } else {
          throw new Error('Unexpected response format');
        }
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return;
        console.error('[CREATE_USAGE] Fehler beim Laden der Fahrzeuge:', err);
        console.error('[CREATE_USAGE] Fehler Details:', err instanceof Error ? err.message : String(err));
        setVehiclesError('Fehler beim Laden der Fahrzeuge (Fallback verwendet)');
      } finally {
        setVehiclesLoading(false);
      }
    };

    console.log('[CREATE_USAGE] Rufe fetchVehicles auf');
    fetchVehicles();

    return () => {
      console.log('[CREATE_USAGE] useEffect cleanup');
      controller.abort();
    };
  }, [fetchVehicleEndOperatingHours, selectedOrgId, isSuperAdmin]);

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
          Nutzung erfassen
        </h1>
        {isSuperAdmin && organizations.length > 0 && (
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
                    {vehicle.name} ({vehicle.plate})
                  </option>
                ))
              )}
            </select>
        </div>

        {/* Erfassungsdatum */}
        <div className="space-y-2">
          <label htmlFor="creationDate" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Erfassungsdatum
          </label>
          <input
            id="creationDate"
            type="date"
            value={formData.creationDate}
            onChange={(e) => setFormData((prev) => ({ ...prev, creationDate: e.target.value }))}
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
            step="1"
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
            step="1"
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
              Gesamtdauer: <span className="font-semibold">{calculatedHours} Stunden</span>
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