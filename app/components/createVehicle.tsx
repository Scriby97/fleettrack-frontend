'use client';

import { useState, useEffect, type FC, type FormEvent } from 'react';
import { authenticatedFetch } from '@/lib/api/authenticatedFetch';
import { useAuth } from '@/lib/auth/AuthProvider';
import { getAllOrganizations } from '@/lib/api/organizations';
import type { Organization } from '@/lib/types/user';
import { useToast } from '@/lib/hooks/useToast';
import { ToastContainer } from './Toast';

interface FormState {
  name: string;
  plate: string;
  snowsatNumber: string;
}

const CreateVehicle: FC = () => {
  const { isSuperAdmin, organizationId } = useAuth();
  const { toasts, showToast, removeToast } = useToast();
  const [formData, setFormData] = useState<FormState>({
    name: '',
    plate: '',
    snowsatNumber: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);

  useEffect(() => {
    if (isSuperAdmin) {
      getAllOrganizations()
        .then(orgs => {
          setOrganizations(orgs);
          if (!selectedOrgId && orgs.length > 0) {
            setSelectedOrgId(orgs[0].id);
          }
        })
        .catch(err => console.error('Failed to load organizations:', err));
    } else if (organizationId && !selectedOrgId) {
      setSelectedOrgId(organizationId);
    }
  }, [isSuperAdmin, organizationId, selectedOrgId]);

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
        const headers: HeadersInit = {};
        if (isSuperAdmin && selectedOrgId) {
          headers['X-Organization-Id'] = selectedOrgId;
        }
        
        const res = await authenticatedFetch(`${apiUrl}/vehicles`, {
          method: 'POST',
          body: JSON.stringify(formData),
          headers,
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
      showToast('Fahrzeug erfolgreich erfasst', 'success');
    } catch (err) {
      console.error('Fehler beim Erstellen des Fahrzeugs:', err);
      setError(err instanceof Error ? err.message : 'Ein Fehler ist aufgetreten');
      showToast('Fehler beim Erstellen des Fahrzeugs', 'error');
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
      <div className="space-y-3">
        <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-zinc-50">
          Fahrzeug erfassen
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Fügen Sie ein neues Fahrzeug zur Flotte hinzu
        </p>
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
            placeholder="z.B. New Leitwolf LT t5"
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
            placeholder="z.B. BE-123456"
            className="block w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-4 py-2 text-zinc-900 dark:text-zinc-50 placeholder-zinc-500 dark:placeholder-zinc-400 focus:border-blue-500 focus:ring-blue-500 focus:ring-1"
            required
          />
        </div>

        {/* SNOWsat-Nummer */}
        <div className="space-y-2">
          <label htmlFor="snowsatNumber" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            SNOWsat-Nummer
          </label>
          <input
            id="snowsatNumber"
            type="text"
            value={formData.snowsatNumber}
            onChange={(e) => handleChange('snowsatNumber', e.target.value)}
            placeholder="z.B. GSD-PB-09"
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
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </section>
  );
};

export default CreateVehicle;