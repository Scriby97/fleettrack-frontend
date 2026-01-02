'use client';

import { useState, type FC, type FormEvent } from 'react';
import { authenticatedFetch } from '@/lib/api/authenticatedFetch';

interface FormState {
  name: string;
  plate: string;
  snowsatNumber: string;
}

const CreateVehicle: FC = () => {
  const [formData, setFormData] = useState<FormState>({
    name: '',
    plate: '',
    snowsatNumber: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      // Validierung
      if (!formData.name.trim() || !formData.plate.trim() || !formData.snowsatNumber.trim()) {
        setError('Alle Felder sind erforderlich');
        return;
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL
      if (apiUrl) {
        const res = await authenticatedFetch(`${apiUrl}/vehicles`, {
          method: 'POST',
          body: JSON.stringify(formData),
        });

        if (!res.ok) {
          const text = await res.text();
          throw new Error(`API error ${res.status}: ${text}`);
        }

        const created = await res.json();
        console.log('Fahrzeug erstellt:', created);
      } else {
        console.log('NEXT_PUBLIC_API_URL nicht konfiguriert, Daten nur lokal gespeichert');
      }

      setFormData({ name: '', plate: '', snowsatNumber: '' });
      alert('Fahrzeug erfolgreich erfasst');
    } catch (err) {
      console.error('Fehler beim Erstellen des Fahrzeugs:', err);
      setError(err instanceof Error ? err.message : 'Ein Fehler ist aufgetreten');
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
      <div className="px-1">
        <h1 className="text-3xl font-bold text-[var(--foreground)]">Fahrzeug erfassen</h1>
        <p className="text-sm text-[var(--secondary)] mt-2">Fügen Sie ein neues Fahrzeug zur Flotte hinzu</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-7 max-w-xl px-1">
        {error && (
          <div className="rounded-xl bg-red-900/20 border border-red-800 p-4">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        <div>
          <label htmlFor="name" className="block text-base font-medium text-[var(--foreground)] mb-3">
            Fahrzeugbezeichnung
          </label>
          <input
            id="name"
            type="text"
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            placeholder="z.B. New Leitwolf LT t5"
            className="w-full px-5 py-4 bg-[var(--card-bg)] text-[var(--foreground)] border border-[var(--border)] rounded-2xl focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent text-base"
            required
          />
        </div>

        <div>
          <label htmlFor="plate" className="block text-base font-medium text-[var(--foreground)] mb-3">
            Kennzeichen
          </label>
          <input
            id="plate"
            type="text"
            value={formData.plate}
            onChange={(e) => handleChange('plate', e.target.value)}
            placeholder="z.B. BE-123456"
            className="w-full px-5 py-4 bg-[var(--card-bg)] text-[var(--foreground)] border border-[var(--border)] rounded-2xl focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent text-base"
            required
          />
        </div>

        <div>
          <label htmlFor="snowsatNumber" className="block text-base font-medium text-[var(--foreground)] mb-3">
            SNOWsat-Nummer
          </label>
          <input
            id="snowsatNumber"
            type="text"
            value={formData.snowsatNumber}
            onChange={(e) => handleChange('snowsatNumber', e.target.value)}
            placeholder="z.B. GSD-PB-09"
            className="w-full px-5 py-4 bg-[var(--card-bg)] text-[var(--foreground)] border border-[var(--border)] rounded-2xl focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent text-base"
            required
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white font-semibold py-4 rounded-2xl disabled:opacity-50 transition-all text-lg shadow-lg"
        >
          {isSubmitting ? 'Wird hinzugefügt...' : 'Fahrzeug hinzufügen'}
        </button>
      </form>
    </section>
  );
};

export default CreateVehicle;