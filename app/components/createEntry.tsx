'use client';

import { useState, useCallback, type FC, type FormEvent } from 'react';

interface FormState {
  vehicleId: string;
  startTime: string;
  endTime: string;
  fuel: string;
}

const VEHICLES = [
  { id: '1', name: 'Toyota Corolla', plate: 'ZH-123456' },
  { id: '2', name: 'VW Golf', plate: 'ZH-789012' },
] as const;

const calculateHours = (start: string, end: string): number | null => {
  if (!start || !end) return null;
  const startDate = new Date(start);
  const endDate = new Date(end);
  const diffMs = endDate.getTime() - startDate.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  return Math.round(diffHours * 10) / 10;
};

const EintragErfassen: FC = () => {
  const [formData, setFormData] = useState<FormState>({
    vehicleId: '1',
    startTime: '',
    endTime: '',
    fuel: '',
  });
  const [calculatedHours, setCalculatedHours] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateCalculatedHours = useCallback(() => {
    const hours = calculateHours(formData.startTime, formData.endTime);
    setCalculatedHours(hours);
  }, [formData.startTime, formData.endTime]);

  const handleTimeChange = (field: 'startTime' | 'endTime', value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setTimeout(updateCalculatedHours, 0);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      console.log('Eintrag:', { ...formData, hours: calculatedHours });
      // TODO: API Call hier
      alert('Eintrag gespeichert (mock)');
      
      setFormData({ vehicleId: '1', startTime: '', endTime: '', fuel: '' });
      setCalculatedHours(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="space-y-6">
      <style>{`
        input[type="datetime-local"]::-webkit-calendar-picker-indicator {
          filter: invert(1) brightness(1.2);
          cursor: pointer;
        }
      `}</style>

      <div>
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
          Eintrag erfassen
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
          Erfasse die Nutzungsdaten für ein Fahrzeug
        </p>
      </div>

      <form onSubmit={handleSubmit} className="max-w-2xl space-y-5">
        {/* Fahrzeug */}
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
            {VEHICLES.map((vehicle) => (
              <option key={vehicle.id} value={vehicle.id}>
                {vehicle.name} ({vehicle.plate})
              </option>
            ))}
          </select>
        </div>

        {/* Startzeit */}
        <div className="space-y-2">
          <label htmlFor="startTime" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Startzeit
          </label>
          <input
            id="startTime"
            type="datetime-local"
            value={formData.startTime}
            onChange={(e) => handleTimeChange('startTime', e.target.value)}
            className="block w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-4 py-2 text-zinc-900 dark:text-zinc-50 focus:border-blue-500 focus:ring-blue-500"
            required
          />
        </div>

        {/* Endzeit */}
        <div className="space-y-2">
          <label htmlFor="endTime" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Endzeit
          </label>
          <input
            id="endTime"
            type="datetime-local"
            value={formData.endTime}
            onChange={(e) => handleTimeChange('endTime', e.target.value)}
            className="block w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-4 py-2 text-zinc-900 dark:text-zinc-50 focus:border-blue-500 focus:ring-blue-500"
            required
          />
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
            Treibstoff (L)
          </label>
          <input
            id="fuel"
            type="number"
            value={formData.fuel}
            onChange={(e) => setFormData((prev) => ({ ...prev, fuel: e.target.value }))}
            className="block w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-4 py-2 text-zinc-900 dark:text-zinc-50 focus:border-blue-500 focus:ring-blue-500"
            required
            min="0"
            step="0.1"
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed px-6 py-2.5 font-medium text-white transition-colors"
        >
          {isSubmitting ? 'Wird gespeichert...' : 'Eintrag speichern'}
        </button>
      </form>
    </section>
  );
};

export default EintragErfassen;