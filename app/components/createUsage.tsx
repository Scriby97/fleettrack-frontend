'use client';

import { useState, useCallback, useEffect, type FC, type FormEvent } from 'react';

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
}

const FALLBACK_VEHICLES: Vehicle[] = [
  { id: '1', name: 'Toyota Corolla', plate: 'ZH-123456' },
  { id: '2', name: 'VW Golf', plate: 'ZH-789012' },
];

const calculateHoursDifference = (start: string, end: string): number | null => {
  const startHours = parseInt(start, 10);
  const endHours = parseInt(end, 10);
  if (Number.isNaN(startHours) || Number.isNaN(endHours)) return null;
  if (endHours <= startHours) return null;
  return endHours - startHours;
};

const CreateUsage: FC = () => {
  const [formData, setFormData] = useState<FormState>({
    vehicleId: FALLBACK_VEHICLES[0].id,
    startOperatingHours: '',
    endOperatingHours: '',
    fuel: '',
  });
  const [vehicles, setVehicles] = useState<Vehicle[]>(FALLBACK_VEHICLES);
  const [vehiclesLoading, setVehiclesLoading] = useState(false);
  const [vehiclesError, setVehiclesError] = useState<string | null>(null);
  const [calculatedHours, setCalculatedHours] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeError, setTimeError] = useState<string | null>(null);

  const updateCalculatedHours = useCallback(() => {
    const hours = calculateHoursDifference(formData.startOperatingHours, formData.endOperatingHours);
    setCalculatedHours(hours);
  }, [formData.startOperatingHours, formData.endOperatingHours]);

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
      };

      // Im Dev-Mode an das lokale Backend senden
      if (process.env.NODE_ENV === 'development') {
        const res = await fetch('http://localhost:3001/usages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const text = await res.text();
          throw new Error(`API error ${res.status}: ${text}`);
        }

        const created = await res.json();
        console.log('Usage erstellt:', created);
      } else {
        console.log('Nicht-Dev-Modus: POST /usages übersprungen', payload);
      }

      setFormData({ vehicleId: vehicles[0]?.id ?? '', startOperatingHours: '', endOperatingHours: '', fuel: '' });
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
    // Nur im Dev-Mode lokales Backend anfragen
    if (process.env.NODE_ENV !== 'development') return;

    const controller = new AbortController();
    const fetchVehicles = async () => {
      setVehiclesLoading(true);
      setVehiclesError(null);

      try {
        const res = await fetch('http://localhost:3001/vehicles', { signal: controller.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (Array.isArray(data)) {
          setVehicles(data);
          // set default selected vehicle if none or mismatched
          setFormData((prev) => {
            const currentValid = data.find((v: Vehicle) => v.id === prev.vehicleId);
            return { ...prev, vehicleId: currentValid ? prev.vehicleId : data[0]?.id ?? '' };
          });
        } else {
          throw new Error('Unexpected response format');
        }
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return;
        console.error('Fehler beim Laden der Fahrzeuge:', err);
        setVehiclesError('Fehler beim Laden der Fahrzeuge (Fallback verwendet)');
      } finally {
        setVehiclesLoading(false);
      }
    };

    fetchVehicles();

    return () => controller.abort();
  }, []);

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
          Nutzung erfassen
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
          Nutzung die Nutzungsdaten für ein Fahrzeug
        </p>
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
              onChange={(e) => setFormData((prev) => ({ ...prev, vehicleId: e.target.value }))}
              className="block w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-4 py-2 text-zinc-900 dark:text-zinc-50 focus:border-blue-500 focus:ring-blue-500"
            >
              {vehiclesLoading ? (
                <option value="" disabled>Lade Fahrzeuge...</option>
              ) : vehiclesError ? (
                <>
                  <option value="" disabled>{vehiclesError}</option>
                  {FALLBACK_VEHICLES.map((vehicle) => (
                    <option key={vehicle.id} value={vehicle.id}>
                      {vehicle.name} ({vehicle.plate})
                    </option>
                  ))}
                </>
              ) : (
                vehicles.map((vehicle) => (
                  <option key={vehicle.id} value={vehicle.id}>
                    {vehicle.name} ({vehicle.plate})
                  </option>
                ))
              )}
            </select>
        </div>

        {/* Start-Betriebsstunden */}
        <div className="space-y-2">
          <label htmlFor="startOperatingHours" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Start-Betriebsstunden
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
    </section>
  );
};

export default CreateUsage;