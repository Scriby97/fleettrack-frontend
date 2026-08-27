'use client';

import { useState, type FC, type FormEvent } from 'react';
import { useTranslations } from 'next-intl';
import { authenticatedFetch } from '@/lib/api/authenticatedFetch';
import { buildApiUrl } from '@/lib/api/url';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useOrganization } from '@/lib/contexts/OrganizationContext';
import { useToast } from '@/lib/hooks/useToast';
import { ToastContainer } from './Toast';

interface FormState {
  name: string;
  plate: string;
  snowsatNumber: string;
  location: string;
  vehicleType: string;
  fuelType: string;
  notes: string;
}

const CreateVehicle: FC = () => {
  const { isAdmin } = useAuth();
  const { organizations, selectedOrgId, setSelectedOrgId } = useOrganization();
  const { toasts, showToast, removeToast } = useToast();
  const t = useTranslations('createVehicle');
  const tCommon = useTranslations('common');
  const [formData, setFormData] = useState<FormState>({
    name: '',
    plate: '',
    snowsatNumber: '',
    location: '',
    vehicleType: '',
    fuelType: '',
    notes: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    // Validate first, before setting isSubmitting
    if (!formData.name.trim() || !formData.plate.trim() || !formData.snowsatNumber.trim()) {
      setError(t('allFieldsRequiredError'));
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = selectedOrgId ? { ...formData, organizationId: selectedOrgId } : formData;

      const res = await authenticatedFetch(buildApiUrl('/vehicles'), {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message || `API-Fehler ${res.status}`);
      }

      await res.json();

      setFormData({ name: '', plate: '', snowsatNumber: '', location: '', vehicleType: '', fuelType: '', notes: '' });
      showToast(t('addSuccess'), 'success');
    } catch (err) {
      console.error('Fehler beim Erstellen des Fahrzeugs:', err);
      setError(err instanceof Error ? err.message : t('genericError'));
      showToast(t('addErrorToast'), 'error');
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
          {t('title')}
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {t('subtitle')}
        </p>
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
            {t('nameLabel')}
          </label>
          <input
            id="name"
            type="text"
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            placeholder={t('namePlaceholder')}
            className="block w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-4 py-2 text-zinc-900 dark:text-zinc-50 placeholder-zinc-500 dark:placeholder-zinc-400 focus:border-blue-500 focus:ring-blue-500 focus:ring-1"
            required
          />
        </div>

        {/* Kennzeichen */}
        <div className="space-y-2">
          <label htmlFor="plate" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            {t('plateLabel')}
          </label>
          <input
            id="plate"
            type="text"
            value={formData.plate}
            onChange={(e) => handleChange('plate', e.target.value)}
            placeholder={t('platePlaceholder')}
            className="block w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-4 py-2 text-zinc-900 dark:text-zinc-50 placeholder-zinc-500 dark:placeholder-zinc-400 focus:border-blue-500 focus:ring-blue-500 focus:ring-1"
            required
          />
        </div>

        {/* SNOWsat-Nummer */}
        <div className="space-y-2">
          <label htmlFor="snowsatNumber" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            {t('snowsatLabel')}
          </label>
          <input
            id="snowsatNumber"
            type="text"
            value={formData.snowsatNumber}
            onChange={(e) => handleChange('snowsatNumber', e.target.value)}
            placeholder={t('snowsatPlaceholder')}
            className="block w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-4 py-2 text-zinc-900 dark:text-zinc-50 placeholder-zinc-500 dark:placeholder-zinc-400 focus:border-blue-500 focus:ring-blue-500 focus:ring-1"
            required
          />
        </div>

        {/* Ort */}
        <div className="space-y-2">
          <label htmlFor="location" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            {t('locationLabel')}
          </label>
          <input
            id="location"
            type="text"
            value={formData.location}
            onChange={(e) => handleChange('location', e.target.value)}
            placeholder={t('locationPlaceholder')}
            className="block w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-4 py-2 text-zinc-900 dark:text-zinc-50 placeholder-zinc-500 dark:placeholder-zinc-400 focus:border-blue-500 focus:ring-blue-500 focus:ring-1"
          />
        </div>

        {/* Typ */}
        <div className="space-y-2">
          <label htmlFor="vehicleType" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            {t('typeLabel')}
          </label>
          <select
            id="vehicleType"
            value={formData.vehicleType}
            onChange={(e) => handleChange('vehicleType', e.target.value)}
            className="block w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-4 py-2 text-zinc-900 dark:text-zinc-50 focus:border-blue-500 focus:ring-blue-500 focus:ring-1"
          >
            <option value="">{t('pleaseSelect')}</option>
            <option value="Pistenfahrzeug">{t('vehicleTypeGroomer')}</option>
            <option value="Skidoo">{t('vehicleTypeSkidoo')}</option>
            <option value="Quad">{t('vehicleTypeQuad')}</option>
          </select>
        </div>

        {/* Treibstoff */}
        <div className="space-y-2">
          <label htmlFor="fuelType" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            {t('fuelTypeLabel')}
          </label>
          <select
            id="fuelType"
            value={formData.fuelType}
            onChange={(e) => handleChange('fuelType', e.target.value)}
            className="block w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-4 py-2 text-zinc-900 dark:text-zinc-50 focus:border-blue-500 focus:ring-blue-500 focus:ring-1"
          >
            <option value="">{t('pleaseSelect')}</option>
            <option value="Diesel">{t('fuelTypeDiesel')}</option>
            <option value="Benzin">{t('fuelTypeGasoline')}</option>
          </select>
        </div>

        {/* Bemerkung */}
        <div className="space-y-2">
          <label htmlFor="notes" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            {t('notesLabel')}
          </label>
          <textarea
            id="notes"
            value={formData.notes}
            onChange={(e) => handleChange('notes', e.target.value)}
            placeholder={t('notesPlaceholder')}
            rows={3}
            className="block w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-4 py-2 text-zinc-900 dark:text-zinc-50 placeholder-zinc-500 dark:placeholder-zinc-400 focus:border-blue-500 focus:ring-blue-500 focus:ring-1"
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed px-6 py-2.5 font-medium text-white transition-colors"
        >
          {isSubmitting ? t('submitting') : t('submitButton')}
        </button>
      </form>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </section>
  );
};

export default CreateVehicle;