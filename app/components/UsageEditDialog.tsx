'use client';

import { useState, type FC, type FormEvent } from 'react';
import { useTranslations } from 'next-intl';
import { authenticatedFetch } from '@/lib/api/authenticatedFetch';
import { buildApiUrl } from '@/lib/api/url';
import { ApiError, throwApiError } from '@/lib/api/ApiError';
import { useApiErrorMessage } from '@/lib/i18n/useApiErrorMessage';
import { appendSecondaryContinuityIssue } from '@/lib/i18n/continuityWarning';
import { toDatetimeLocalValue } from '@/lib/dates/rangeDefaults';
import { vehicleUsesKm, counterDecimals, decimalPlaces } from '@/lib/vehicles/metric';
import type { UsageWithVehicle } from '@/lib/api/usages';
import { ConfirmDialog } from './ConfirmDialog';
import { DateTimePicker } from './DateTimePicker';

export interface EditableUsage {
  id: number | string;
  vehicleId?: string;
  vehicleType?: string;
  startOperatingHours: number;
  endOperatingHours: number;
  fuel: number;
  usageDate?: string;
  creatorFirstName?: string;
  creatorLastName?: string;
  creatorEmail?: string;
}

export interface EditDialogVehicle {
  id: string;
  name: string;
  plate?: string;
  vehicleType?: string;
}

interface UsageEditDialogProps {
  usage: EditableUsage;
  vehicles: EditDialogVehicle[];
  // false: nur ansehen (Mitarbeiter bei fremden Nutzungen).
  canEdit: boolean;
  onClose: () => void;
  onSaved: (updated: UsageWithVehicle) => void;
  onSaveError: () => void;
}

// Backend-Fehlercodes, die eine Luecke/Ueberschneidung der Betriebsstunden zum
// benachbarten Eintrag desselben Fahrzeugs melden (siehe UsagesService.
// checkHoursContinuity) - blockieren das Speichern nicht endgueltig, sondern
// werden als Bestaetigungsdialog angezeigt.
const HOURS_CONTINUITY_ERROR_CODES = new Set(['USAGE_HOURS_GAP', 'USAGE_HOURS_OVERLAP']);

// Bearbeiten-Dialog einer Nutzung - gemeinsam genutzt von der
// Nutzungsuebersicht und dem Nutzungen-Tab der Fahrzeug-Detailseite.
export const UsageEditDialog: FC<UsageEditDialogProps> = ({
  usage,
  vehicles,
  canEdit,
  onClose,
  onSaved,
  onSaveError,
}) => {
  const t = useTranslations('usagesOverview');
  const tCommon = useTranslations('common');
  const tErrors = useTranslations('errors');
  const getApiErrorMessage = useApiErrorMessage();

  const [form, setForm] = useState({
    vehicleId: usage.vehicleId || '',
    startOperatingHours: String(usage.startOperatingHours),
    endOperatingHours: String(usage.endOperatingHours),
    fuel: String(usage.fuel),
    // In lokaler Zeit (nicht per .toISOString(), das ist UTC und haette in
    // Zeitzonen vor UTC das Datum je nach Uhrzeit falsch angezeigt).
    usageDate: usage.usageDate ? toDatetimeLocalValue(new Date(usage.usageDate)) : '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Feldspezifische Meldungen statt nur der generischen Banner-Meldung oben -
  // direkt unter dem jeweiligen Feld angezeigt, damit erkennbar ist, WELCHES
  // Feld ungueltig ist.
  const [startError, setStartError] = useState<string | null>(null);
  const [endError, setEndError] = useState<string | null>(null);
  const [fuelError, setFuelError] = useState<string | null>(null);
  // Haelt den Payload fest, damit "Trotzdem speichern" denselben Request mit
  // confirmDespiteWarning=true wiederholen kann.
  const [continuityWarning, setContinuityWarning] = useState<{
    message: string;
    payload: Record<string, unknown>;
  } | null>(null);

  const usesKm = vehicleUsesKm(
    vehicles.find((v) => v.id === form.vehicleId)?.vehicleType ?? usage.vehicleType,
  );
  const counterStep = usesKm ? '1' : '0.1';

  const creatorName =
    usage.creatorFirstName || usage.creatorLastName
      ? `${usage.creatorFirstName ?? ''} ${usage.creatorLastName ?? ''}`.trim()
      : usage.creatorEmail;

  const putUsage = async (payload: Record<string, unknown>): Promise<UsageWithVehicle> => {
    const res = await authenticatedFetch(buildApiUrl(`/usages/${usage.id}`), {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      await throwApiError(res, `API error ${res.status}`);
    }
    return res.json();
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setStartError(null);
    setEndError(null);
    setFuelError(null);

    // Ersetzt die native step/min-Validierung (siehe noValidate am <form>
    // unten) - deren Meldung ist nie uebersetzt, egal welche UI-Sprache
    // eingestellt ist. Jedes Feld bekommt seine eigene Meldung direkt
    // darunter, statt einer einzigen generischen Banner-Meldung, aus der
    // nicht hervorgeht, welches Feld betroffen ist.
    const parsedStart = parseFloat(form.startOperatingHours);
    const parsedEnd = parseFloat(form.endOperatingHours);
    const maxCounterDecimals = counterDecimals(usesKm);
    const parsedFuel = form.fuel.trim() === '' ? 0 : parseFloat(form.fuel);

    let hasFieldError = false;
    if (
      Number.isNaN(parsedStart) ||
      parsedStart < 0 ||
      decimalPlaces(form.startOperatingHours) > maxCounterDecimals
    ) {
      setStartError(t('invalidNumberError'));
      hasFieldError = true;
    }
    if (
      Number.isNaN(parsedEnd) ||
      parsedEnd < 0 ||
      decimalPlaces(form.endOperatingHours) > maxCounterDecimals
    ) {
      setEndError(t('invalidNumberError'));
      hasFieldError = true;
    }
    if (
      form.fuel.trim() !== '' &&
      (Number.isNaN(parsedFuel) || parsedFuel < 0 || decimalPlaces(form.fuel) > 2)
    ) {
      setFuelError(t('invalidNumberError'));
      hasFieldError = true;
    }
    if (hasFieldError) return;

    setIsSubmitting(true);

    const payload = {
      vehicleId: form.vehicleId,
      startOperatingHours: parsedStart,
      endOperatingHours: parsedEnd,
      fuelLitersRefilled: parsedFuel,
      // form.usageDate ist ein datetime-local-Wert ohne Zeitzonenangabe -
      // new Date(...) interpretiert den als lokale Zeit.
      usageDate: new Date(form.usageDate).toISOString(),
    };

    try {
      onSaved(await putUsage(payload));
    } catch (err) {
      if (err instanceof ApiError && err.code && HOURS_CONTINUITY_ERROR_CODES.has(err.code)) {
        setContinuityWarning({
          message: appendSecondaryContinuityIssue(
            err,
            getApiErrorMessage(err, t('updateErrorGeneric')),
            tErrors,
          ),
          payload,
        });
      } else {
        console.error('Fehler beim Aktualisieren der Nutzung:', err);
        setError(getApiErrorMessage(err, t('updateErrorGeneric')));
        onSaveError();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmSaveAnyway = async () => {
    if (!continuityWarning) return;
    const { payload } = continuityWarning;
    setContinuityWarning(null);
    setIsSubmitting(true);
    setError(null);

    try {
      onSaved(await putUsage({ ...payload, confirmDespiteWarning: true }));
    } catch (err) {
      console.error('Fehler beim Aktualisieren der Nutzung:', err);
      setError(getApiErrorMessage(err, t('updateErrorGeneric')));
      onSaveError();
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClass =
    'block w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-4 py-2 text-zinc-900 dark:text-zinc-50 focus:border-blue-500 focus:ring-blue-500';
  const inputClassFor = (hasError: boolean) =>
    hasError
      ? 'block w-full rounded-lg border border-red-500 dark:border-red-500 bg-white dark:bg-zinc-900 px-4 py-2 text-zinc-900 dark:text-zinc-50 focus:border-red-500 focus:ring-blue-500'
      : inputClass;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white dark:bg-zinc-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                {canEdit ? t('editUsage') : t('viewUsage')}
              </h2>
              {canEdit && creatorName && (
                <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                  {t('createdBy', { name: creatorName })}
                </p>
              )}
            </div>
            <button onClick={onClose} className="text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* noValidate: eigene Validierung in handleSubmit deckt required/
              min/step bereits ab - ohne das blockt der Browser bei
              step-Verletzungen mit einem rein englischen, nie übersetzten
              Tooltip, unabhängig von der UI-Sprache der Seite. */}
          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <div className="space-y-2">
              <label htmlFor="edit-vehicle" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                {t('vehicleField')}
              </label>
              <select
                id="edit-vehicle"
                value={form.vehicleId}
                onChange={(e) => setForm((prev) => ({ ...prev, vehicleId: e.target.value }))}
                className={inputClass}
                required
                disabled={!canEdit}
              >
                {vehicles.map((vehicle) => (
                  <option key={vehicle.id} value={vehicle.id}>
                    {vehicle.name} {vehicle.plate ? `(${vehicle.plate})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="edit-usageDate" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                {t('usageDateLabel')}
              </label>
              <DateTimePicker
                id="edit-usageDate"
                value={form.usageDate}
                onChange={(value) => setForm((prev) => ({ ...prev, usageDate: value }))}
                required
                disabled={!canEdit}
                nowLabel={t('nowButton')}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="edit-startOperatingHours" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                {usesKm ? t('startKmLabel') : t('startHoursLabel')}
              </label>
              <input
                id="edit-startOperatingHours"
                type="number"
                value={form.startOperatingHours}
                onChange={(e) => {
                  setForm((prev) => ({ ...prev, startOperatingHours: e.target.value }));
                  setStartError(null);
                }}
                className={inputClassFor(!!startError)}
                min="0"
                step={counterStep}
                required
                disabled={!canEdit}
              />
              {startError && (
                <p className="mt-2 text-sm text-red-700 dark:text-red-200">{startError}</p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="edit-endOperatingHours" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                {usesKm ? t('endKmLabel') : t('endHoursLabel')}
              </label>
              <input
                id="edit-endOperatingHours"
                type="number"
                value={form.endOperatingHours}
                onChange={(e) => {
                  setForm((prev) => ({ ...prev, endOperatingHours: e.target.value }));
                  setEndError(null);
                }}
                className={inputClassFor(!!endError)}
                min="0"
                step={counterStep}
                required
                disabled={!canEdit}
              />
              {endError && (
                <p className="mt-2 text-sm text-red-700 dark:text-red-200">{endError}</p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="edit-fuel" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                {t('fuelLabel')}
              </label>
              <input
                id="edit-fuel"
                type="number"
                value={form.fuel}
                onChange={(e) => {
                  setForm((prev) => ({ ...prev, fuel: e.target.value }));
                  setFuelError(null);
                }}
                className={inputClassFor(!!fuelError)}
                min="0"
                step="0.01"
                disabled={!canEdit}
              />
              {fuelError && (
                <p className="mt-2 text-sm text-red-700 dark:text-red-200">{fuelError}</p>
              )}
            </div>

            {error && (
              <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-3">
                <p className="text-sm text-red-900 dark:text-red-100">{error}</p>
              </div>
            )}

            <div className="flex gap-3">
              {canEdit && (
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 rounded-lg bg-signal-600 hover:bg-signal-700 disabled:opacity-50 disabled:cursor-not-allowed px-6 py-2.5 font-medium text-white transition-colors"
                >
                  {isSubmitting ? t('saving') : t('saveChanges')}
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className={`${canEdit ? '' : 'flex-1'} px-6 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-600 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors disabled:opacity-50`}
              >
                {canEdit ? tCommon('cancel') : tCommon('close')}
              </button>
            </div>
          </form>
        </div>
      </div>

      {continuityWarning && (
        <ConfirmDialog
          title={tCommon('confirmationTitle')}
          message={continuityWarning.message}
          confirmLabel={tCommon('saveAnyway')}
          cancelLabel={tCommon('cancel')}
          onConfirm={handleConfirmSaveAnyway}
          onCancel={() => setContinuityWarning(null)}
        />
      )}
    </>
  );
};
