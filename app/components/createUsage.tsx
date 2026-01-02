'use client';

import { useState, useCallback, useEffect, type FC, type FormEvent } from 'react';
import { authenticatedFetch } from '@/lib/api/authenticatedFetch';

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
      const res = await authenticatedFetch(`${apiUrl}/vehicles/${vehicleId}/last-operating-hours`);
      if (!res.ok) {
        console.warn('Konnte letzte Betriebsstunden nicht laden');
        return;
      }
      const data = await res.json();
      if (data.endOperatingHours !== undefined && data.endOperatingHours !== null) {
        setFormData((prev) => ({ ...prev, startOperatingHours: String(data.endOperatingHours) }));
      }
    } catch (err) {
      console.error('Fehler beim Laden der letzten Betriebsstunden:', err);
    } finally {
      setLoadingOperatingHours(false);
    }
  }, []);

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
        const res = await authenticatedFetch(`${apiUrl}/usages`, {
          method: 'POST',
          body: JSON.stringify(payload),
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
      alert('Nutzung erfolgreich gespeichert');
    } catch (err) {
      console.error('Fehler beim Speichern der Nutzung:', err);
      setError(err instanceof Error ? err.message : 'Fehler beim Speichern des Eintrags');
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    console.log('[CREATE_USAGE] useEffect gestartet');
    const apiUrl = process.env.NEXT_PUBLIC_API_URL
    console.log('[CREATE_USAGE] API URL:', apiUrl);
    if (!apiUrl) {
      console.warn('NEXT_PUBLIC_API_URL nicht konfiguriert')
      return
    }

    const controller = new AbortController();
    const fetchVehicles = async () => {
      console.log('[CREATE_USAGE] fetchVehicles wird aufgerufen');
      setVehiclesLoading(true);
      setVehiclesError(null);

      try {
        console.log('[CREATE_USAGE] Versuche Request zu senden...');
        const res = await authenticatedFetch(`${apiUrl}/vehicles`, { signal: controller.signal });
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
  }, [fetchVehicleEndOperatingHours]);

  return (
    <section className="space-y-6">
      <div className="px-1">
        <h1 className="text-3xl font-bold text-[var(--foreground)]">Nutzung erfassen</h1>
        <p className="text-sm text-[var(--secondary)] mt-2">Erfassen Sie eine neue Fahrzeugnutzung</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-7 max-w-xl px-1">
        {error && (
          <div className="rounded-xl bg-red-900/20 border border-red-800 p-4">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        <div>
          <label htmlFor="vehicle" className="block text-base font-medium text-[var(--foreground)] mb-3">
            Fahrzeug
          </label>
          <select
            id="vehicle"
            value={formData.vehicleId}
            onChange={(e) => handleVehicleChange(e.target.value)}
            className="w-full px-5 py-4 bg-[var(--card-bg)] text-[var(--foreground)] border border-[var(--border)] rounded-2xl focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent text-base"
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

        <div>
          <label htmlFor="creationDate" className="block text-base font-medium text-[var(--foreground)] mb-3">
            Erfassungsdatum
          </label>
          <input
            id="creationDate"
            type="date"
            value={formData.creationDate}
            onChange={(e) => setFormData((prev) => ({ ...prev, creationDate: e.target.value }))}
            className="w-full px-5 py-4 bg-[var(--card-bg)] text-[var(--foreground)] border border-[var(--border)] rounded-2xl focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent text-base"
            required
          />
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="startOperatingHours" className="block text-base font-medium text-[var(--foreground)] mb-3">
              Start (Stunden)
            </label>
            <input
              id="startOperatingHours"
              type="number"
              value={formData.startOperatingHours}
              onChange={(e) => handleOperatingHoursChange('startOperatingHours', e.target.value)}
              className="w-full px-5 py-4 bg-[var(--card-bg)] text-[var(--foreground)] border border-[var(--border)] rounded-2xl focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent text-base"
              min="0"
              step="1"
              required
              disabled={loadingOperatingHours}
            />
          </div>

          <div>
            <label htmlFor="endOperatingHours" className="block text-base font-medium text-[var(--foreground)] mb-3">
              Ende (Stunden)
            </label>
            <input
              id="endOperatingHours"
              type="number"
              value={formData.endOperatingHours}
              onChange={(e) => handleOperatingHoursChange('endOperatingHours', e.target.value)}
              className="w-full px-5 py-4 bg-[var(--card-bg)] text-[var(--foreground)] border border-[var(--border)] rounded-2xl focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent text-base"
              min="0"
              step="1"
              required
            />
          </div>
        </div>

        {timeError && (
          <p className="text-sm text-red-400">{timeError}</p>
        )}

        {calculatedHours !== null && (
          <div className="p-5 bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl">
            <div className="flex items-center justify-between">
              <span className="text-base font-medium text-[var(--foreground)]">Gesamtdauer</span>
              <span className="text-2xl font-bold text-[var(--primary)]">{calculatedHours} h</span>
            </div>
          </div>
        )}

        <div>
          <label htmlFor="fuel" className="block text-base font-medium text-[var(--foreground)] mb-3">
            Treibstoff (Liter) <span className="text-[var(--secondary)] font-normal">optional</span>
          </label>
          <input
            id="fuel"
            type="number"
            value={formData.fuel}
            onChange={(e) => setFormData((prev) => ({ ...prev, fuel: e.target.value }))}
            className="w-full px-5 py-4 bg-[var(--card-bg)] text-[var(--foreground)] border border-[var(--border)] rounded-2xl focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent text-base"
            min="0"
            step="0.1"
            placeholder="0.0"
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting || !!timeError}
          className="w-full bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white font-semibold py-4 rounded-2xl disabled:opacity-50 transition-all text-lg shadow-lg"
        >
          {isSubmitting ? 'Wird gespeichert...' : 'Nutzung speichern'}
        </button>
      </form>
    </section>
  );
};

export default CreateUsage;