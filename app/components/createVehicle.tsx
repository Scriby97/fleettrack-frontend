'use client';

import { useState, type FC, type FormEvent } from 'react';

interface FormState {
  name: string;
  plate: string;
}

const CreateVehicle: FC = () => {
  const [formData, setFormData] = useState<FormState>({
    name: '',
    plate: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      // Validierung
      if (!formData.name.trim() || !formData.plate.trim()) {
        setError('Alle Felder sind erforderlich');
        return;
      }

      console.log('Neues Fahrzeug:', formData);
      // TODO: API Call hier
      alert('Fahrzeug erfasst (mock)');
      
      setFormData({ name: '', plate: '' });
    } catch (err) {
      setError('Ein Fehler ist aufgetreten');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (field: keyof FormState, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError(null);
  };

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
          Fahrzeug erfassen
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
          Fügen Sie ein neues Fahrzeug zur Flotte hinzu
        </p>
      </div>

      <form onSubmit={handleSubmit} className="max-w-2xl space-y-5">
        {/* Error Message */}
        {error && (
          <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4">
            <p className="text-sm text-red-900 dark:text-red-100">{error}</p>
          </div>
        )}

        {/* Bezeichnung */}
        <div className="space-y-2">
          <label htmlFor="name" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Fahrzeugbezeichnung
          </label>
          <input
            id="name"
            type="text"
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            placeholder="z.B. Toyota Corolla"
            className="block w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-4 py-2 text-zinc-900 dark:text-zinc-50 placeholder-zinc-500 dark:placeholder-zinc-400 focus:border-blue-500 focus:ring-blue-500 focus:ring-1"
            required
          />
        </div>

        {/* Kennzeichen */}
        <div className="space-y-2">
          <label htmlFor="plate" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Kennzeichen
          </label>
          <input
            id="plate"
            type="text"
            value={formData.plate}
            onChange={(e) => handleChange('plate', e.target.value)}
            placeholder="z.B. ZH-123456"
            className="block w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-4 py-2 text-zinc-900 dark:text-zinc-50 placeholder-zinc-500 dark:placeholder-zinc-400 focus:border-blue-500 focus:ring-blue-500 focus:ring-1"
            required
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed px-6 py-2.5 font-medium text-white transition-colors"
        >
          {isSubmitting ? 'Wird hinzugefügt...' : 'Fahrzeug hinzufügen'}
        </button>
      </form>
    </section>
  );
};

export default CreateVehicle;