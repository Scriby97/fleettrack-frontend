'use client';

import { useState, useCallback, useEffect, useRef, type FC, type FormEvent } from 'react';
import { useTranslations } from 'next-intl';
import { authenticatedFetch } from '@/lib/api/authenticatedFetch';
import { buildApiUrl, getApiBaseUrlOrNull } from '@/lib/api/url';
import { ApiError, throwApiError } from '@/lib/api/ApiError';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useOrganization } from '@/lib/contexts/OrganizationContext';
import { useToast } from '@/lib/hooks/useToast';
import { useApiErrorMessage } from '@/lib/i18n/useApiErrorMessage';
import { appendSecondaryContinuityIssue } from '@/lib/i18n/continuityWarning';
import { vehicleUsesKm } from '@/lib/vehicles/metric';
import { toDatetimeLocalValue } from '@/lib/dates/rangeDefaults';
import { ToastContainer } from './Toast';
import { ConfirmDialog } from './ConfirmDialog';
import { DateTimePicker } from './DateTimePicker';
import { NotificationPermissionPrompt } from './NotificationPermissionPrompt';

// Backend-Fehlercodes, die eine Lücke/Überschneidung der Betriebsstunden zum
// benachbarten Eintrag desselben Fahrzeugs melden (siehe UsagesService.
// checkHoursContinuity) - blockieren das Speichern nicht endgültig, sondern
// werden als Bestätigungsdialog angezeigt (siehe handleSubmit/continuityWarning).
const HOURS_CONTINUITY_ERROR_CODES = new Set(['USAGE_HOURS_GAP', 'USAGE_HOURS_OVERLAP']);

interface Vehicle {
  id: string;
  name: string;
  plate: string;
  snowsatNumber?: string;
  vehicleType?: string;
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

interface CreateUsageProps {
  onNavigateToAddVehicle?: () => void;
}

const CreateUsage: FC<CreateUsageProps> = ({ onNavigateToAddVehicle }) => {
  const { isAdmin } = useAuth();
  const { organizations, selectedOrgId, setSelectedOrgId, canManageSelectedOrganization } = useOrganization();
  const { toasts, showToast, removeToast } = useToast();
  const t = useTranslations('createUsage');
  const tCommon = useTranslations('common');
  const tErrors = useTranslations('errors');
  const getApiErrorMessage = useApiErrorMessage();

  // Datum UND Zeit (nicht nur Datum) - sonst kann das System bei mehreren
  // Nutzungen am selben Tag (z.B. Nacht- und Abendschicht) die tatsaechliche
  // Reihenfolge nicht mehr sicher bestimmen (siehe UsagesService.
  // checkHoursContinuity, das usageDate als primaeres Sortierkriterium nutzt).
  const getNowDateTime = () => toDatetimeLocalValue(new Date());

  const [formData, setFormData] = useState<FormState>({
    vehicleId: '',
    startOperatingHours: '',
    endOperatingHours: '',
    fuel: '',
    usageDate: getNowDateTime(),
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
  // Fuer welche Organisation formData gerade den geladenen Entwurf enthaelt -
  // wird zusammen mit formData im selben Batch gesetzt (siehe Restore-Effekt),
  // damit der Persistierungs-Effekt formData nie unter der falschen bzw. noch
  // nicht wiederhergestellten Organisation abspeichert.
  const [activeDraftOrgId, setActiveDraftOrgId] = useState<string | null>(null);
  // Erst nach der ersten erfolgreich gespeicherten Nutzung nach der
  // Benachrichtigungs-Berechtigung fragen (siehe handleSubmit) - nicht schon
  // beim blossen Oeffnen des Dashboards, wo der User noch keinen Nutzen der
  // App gesehen hat. Bleibt danach fuer den Rest der Sitzung gemountet; die
  // Komponente selbst blendet sich aus, sobald sie einmal beantwortet wurde
  // (siehe NotificationPermissionPrompt).
  const [showNotificationPrompt, setShowNotificationPrompt] = useState(false);
  // Hinweis-Dialog, wenn die Organisation noch keine Fahrzeuge hat (sonst
  // steht man vor einem Formular, dessen Fahrzeug-Auswahl leer ist, ohne zu
  // wissen warum). Schliessen gilt nur fuer die aktuelle Organisation - beim
  // Wechsel (siehe Entwurf-Lade-Effekt oben) wird wieder neu geprueft.
  const [dismissedNoVehiclesDialog, setDismissedNoVehiclesDialog] = useState(false);
  const showNoVehiclesDialog =
    !vehiclesLoading && !vehiclesError && vehicles.length === 0 && !!selectedOrgId && !dismissedNoVehiclesDialog;
  // Lücken-/Überschneidungswarnung vom Server (siehe HOURS_CONTINUITY_ERROR_CODES) -
  // haelt das Payload fest, damit "Trotzdem speichern" denselben Request mit
  // confirmDespiteWarning=true wiederholen kann, ohne das Formular neu zu bauen.
  const [continuityWarning, setContinuityWarning] = useState<{ message: string; payload: Record<string, unknown> } | null>(null);

  // Pistenfahrzeuge erfassen Betriebsstunden, alle anderen Typen Kilometer.
  const usesKm = vehicleUsesKm(
    vehicles.find((v) => v.id === formData.vehicleId)?.vehicleType,
  );
  const counterStep = usesKm ? '1' : '0.1';
  const startLabel = usesKm ? t('startKmLabel') : t('startHoursLabel');
  const endLabel = usesKm ? t('endKmLabel') : t('endHoursLabel');

  // Entwurf laden, sobald (und jedes Mal wenn) die ausgewaehlte Organisation
  // bekannt ist bzw. wechselt.
  useEffect(() => {
    if (!selectedOrgId) return;

    setDismissedNoVehiclesDialog(false);

    const draft = loadDraft(selectedOrgId);
    currentVehicleIdRef.current = draft?.vehicleId ?? '';

    setFormData({
      vehicleId: draft?.vehicleId ?? '',
      startOperatingHours: draft?.startOperatingHours ?? '',
      endOperatingHours: draft?.endOperatingHours ?? '',
      fuel: draft?.fuel ?? '',
      usageDate: draft?.usageDate ?? getNowDateTime(),
    });
    setCalculatedHours(
      draft ? calculateHoursDifference(draft.startOperatingHours ?? '', draft.endOperatingHours ?? '') : null
    );
    setActiveDraftOrgId(selectedOrgId);
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

  // Setzt startOperatingHours UND berechnet die Differenz-Anzeige (Dauer/Strecke)
  // neu anhand des jeweils aktuellen endOperatingHours - sonst bliebe die
  // Anzeige z.B. nach einem wiederhergestellten Entwurf auf der alten,
  // draft-basierten Differenz stehen, obwohl der Start gerade frisch vom
  // Server ueberschrieben wurde (siehe fetchVehicleEndOperatingHours).
  const setStartOperatingHoursAndRecalc = useCallback((value: string) => {
    setFormData((prev) => {
      setCalculatedHours(calculateHoursDifference(value, prev.endOperatingHours));
      return { ...prev, startOperatingHours: value };
    });
  }, []);

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
        setStartOperatingHoursAndRecalc('0');
        return;
      }
      const data = await res.json();
      if (data.endOperatingHours !== undefined && data.endOperatingHours !== null) {
        setStartOperatingHoursAndRecalc(String(data.endOperatingHours));
      } else {
        setStartOperatingHoursAndRecalc('0');
      }
    } catch (err) {
      // Echter Netzwerkfehler (z.B. offline) - anders als bei einer regulaeren
      // Server-Antwort (siehe !res.ok oben, dort ist "0" die korrekte, fuer
      // dieses Fahrzeug tatsaechlich fehlende Angabe) wissen wir hier gar nicht,
      // was der echte Wert waere - den bestehenden (z.B. aus einem Entwurf
      // wiederhergestellten) Stand daher unangetastet lassen statt ihn
      // faelschlich auf 0 zu setzen.
      console.error('Fehler beim Laden der letzten Betriebsstunden:', err);
    } finally {
      setLoadingOperatingHours(false);
    }
  }, [selectedOrgId, setStartOperatingHoursAndRecalc]);

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
        setTimeError(usesKm ? t('endKmValidation') : t('endHoursValidation'));
      } else {
        setTimeError(null);
      }
    } else {
      setTimeError(null);
    }
  };

  const postUsage = async (payload: Record<string, unknown>) => {
    const res = await authenticatedFetch(buildApiUrl('/usages'), {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      await throwApiError(res, `API-Fehler ${res.status}`);
    }
    return res.json();
  };

  const handleSaveSuccess = (vehicleId: string) => {
    // Zuletzt gewaehltes Fahrzeug bleibt fuer die naechste Erfassung
    // voreingestellt (statt auf das erste Fahrzeug der Liste zurueckzufallen) -
    // Start-Zaehlerstand wird dafuer frisch vom Server nachgeladen, da sich
    // dieser durch die soeben gespeicherte Nutzung veraendert hat.
    setFormData({ vehicleId, startOperatingHours: '', endOperatingHours: '', fuel: '', usageDate: getNowDateTime() });
    setCalculatedHours(null);
    showToast(t('saveSuccess'), 'success');
    if (vehicleId) {
      fetchVehicleEndOperatingHours(vehicleId);
    }
    setShowNotificationPrompt(true);
  };

  const handleSaveError = (err: unknown) => {
    console.error('Fehler beim Speichern der Nutzung:', err);

    if (isLikelyOfflineError(err)) {
      // Eingaben bewusst NICHT zuruecksetzen - sie bleiben im Formular und
      // werden (siehe Persistierungs-Effekt) weiterhin zwischengespeichert,
      // damit der Fahrer es spaeter mit Empfang erneut versuchen kann, ohne
      // alles nochmals eingeben zu muessen.
      const message = t('offlineErrorMessage');
      setError(message);
      showToast(message, 'error');
    } else {
      setError(getApiErrorMessage(err, t('saveErrorGeneric')));
      showToast(t('saveErrorToast'), 'error');
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    // Ausserhalb des try deklariert, damit der catch-Block bei einer
    // Kontinuitaetswarnung denselben Payload fuer den Retry uebernehmen kann.
    let payload: Record<string, unknown> | undefined;

    try {
      if (!formData.vehicleId) throw new Error(t('selectVehicleError'));
      if (!formData.startOperatingHours || !formData.endOperatingHours) {
        throw new Error(usesKm ? t('kmRequiredError') : t('hoursRequiredError'));
      }

      const parsedStart = parseFloat(formData.startOperatingHours);
      const parsedEnd = parseFloat(formData.endOperatingHours);
      if (Number.isNaN(parsedStart) || Number.isNaN(parsedEnd)) throw new Error(t('invalidNumberError'));
      if (parsedEnd <= parsedStart) {
        throw new Error(usesKm ? t('endKmMustBeGreaterError') : t('endMustBeGreaterError'));
      }

      const parsedFuel = formData.fuel.trim() === '' ? NaN : parseFloat(formData.fuel);
      const fuelLitersRefilled = Number.isNaN(parsedFuel) ? 0 : parsedFuel;

      payload = {
        vehicleId: formData.vehicleId,
        startOperatingHours: parsedStart,
        endOperatingHours: parsedEnd,
        fuelLitersRefilled,
        // formData.usageDate ist ein datetime-local-Wert ohne Zeitzonenangabe -
        // new Date(...) interpretiert den als lokale Zeit, .toISOString() macht
        // daraus den vollen Zeitstempel, den das Backend erwartet.
        usageDate: new Date(formData.usageDate).toISOString(),
      };

      await postUsage(payload);
      handleSaveSuccess(formData.vehicleId);
    } catch (err) {
      if (payload && err instanceof ApiError && err.code && HOURS_CONTINUITY_ERROR_CODES.has(err.code)) {
        // Nicht blockieren - Bestaetigungsdialog zeigen, "Trotzdem speichern"
        // wiederholt denselben Request mit confirmDespiteWarning=true.
        setContinuityWarning({
          message: appendSecondaryContinuityIssue(
            err,
            getApiErrorMessage(err, t('saveErrorGeneric')),
            tErrors
          ),
          payload,
        });
      } else {
        handleSaveError(err);
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
      await postUsage({ ...payload, confirmDespiteWarning: true });
      handleSaveSuccess(String(payload.vehicleId ?? ''));
    } catch (err) {
      handleSaveError(err);
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

          setFormData((prev) => ({ ...prev, vehicleId: selectedVehicleId }));
          currentVehicleIdRef.current = selectedVehicleId;

          // Immer frisch vom Server laden, nie einen (moeglicherweise laengst
          // veralteten) Entwurfswert stehen lassen - die Start-Betriebsstunden
          // muessen zuverlaessig den End-Betriebsstunden der zuletzt erfassten
          // Nutzung entsprechen. fetchVehicleEndOperatingHours() selbst behaelt
          // bei einem echten Netzwerkfehler (offline) den aktuellen Wert bei,
          // ueberschreibt also nicht faelschlich mit 0 (siehe dort).
          if (selectedVehicleId) {
            fetchVehicleEndOperatingHours(selectedVehicleId);
          }
        } else {
          throw new Error('Unexpected response format');
        }
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return;
        console.error('Fehler beim Laden der Fahrzeuge:', err);
        setVehiclesError(t('vehiclesLoadError'));
      } finally {
        setVehiclesLoading(false);
      }
    };

    fetchVehicles();

    return () => {
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchVehicleEndOperatingHours, selectedOrgId]);

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-zinc-50">
          {t('title')}
        </h1>
        {isAdmin && organizations.length > 0 && (
          <div className="flex items-center gap-2 mt-2">
            <label htmlFor="createUsageOrgSelect" className="text-sm text-zinc-600 dark:text-zinc-400">
              {tCommon('organizationLabel')}:
            </label>
            <select
              id="createUsageOrgSelect"
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
              {t('vehicleLabel')}
            </label>
            <select
              id="vehicle"
              value={formData.vehicleId}
              onChange={(e) => handleVehicleChange(e.target.value)}
              className="block w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-4 py-2 text-zinc-900 dark:text-zinc-50 focus:border-blue-500 focus:ring-blue-500"
            >
              {vehiclesLoading ? (
                <option value="" disabled>{t('loadingVehicles')}</option>
              ) : vehiclesError ? (
                <option value="" disabled>{vehiclesError}</option>
              ) : vehicles.length === 0 ? (
                <option value="" disabled>{t('noVehiclesAvailable')}</option>
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
            {t('usageDateLabel')}
          </label>
          <DateTimePicker
            id="usageDate"
            value={formData.usageDate}
            onChange={(value) => setFormData((prev) => ({ ...prev, usageDate: value }))}
            required
            nowLabel={t('nowButton')}
          />
        </div>

        {/* Start-Zählerstand (Betriebsstunden oder Kilometer) */}
        <div className="space-y-2">
          <label htmlFor="startOperatingHours" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            {startLabel}
            {loadingOperatingHours && <span className="ml-2 text-xs text-zinc-500">{t('loadingHours')}</span>}
          </label>
          <input
            id="startOperatingHours"
            type="number"
            value={formData.startOperatingHours}
            onChange={(e) => handleOperatingHoursChange('startOperatingHours', e.target.value)}
            className="block w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-4 py-2 text-zinc-900 dark:text-zinc-50 focus:border-blue-500 focus:ring-blue-500"
            min="0"
            step={counterStep}
            required
            disabled={loadingOperatingHours}
          />
        </div>

        {/* End-Zählerstand */}
        <div className="space-y-2">
          <label htmlFor="endOperatingHours" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            {endLabel}
          </label>
          <input
            id="endOperatingHours"
            type="number"
            value={formData.endOperatingHours}
            onChange={(e) => handleOperatingHoursChange('endOperatingHours', e.target.value)}
            className="block w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-4 py-2 text-zinc-900 dark:text-zinc-50 focus:border-blue-500 focus:ring-blue-500"
            min="0"
            step={counterStep}
            required
          />
          {timeError && (
            <p className="mt-2 text-sm text-red-700 dark:text-red-200">{timeError}</p>
          )}
        </div>

        {/* Differenz-Anzeige (Dauer bzw. gefahrene Strecke) */}
        {calculatedHours !== null && (
          <div className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 p-4">
            <p className="text-sm text-blue-900 dark:text-blue-100">
              <span className="font-semibold">
                {usesKm
                  ? t('totalDistance', { km: calculatedHours.toFixed(0) })
                  : t('totalDuration', { hours: calculatedHours.toFixed(1) })}
              </span>
            </p>
          </div>
        )}

        {/* Treibstoff */}
        <div className="space-y-2">
          <label htmlFor="fuel" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            {t('fuelLabel')}
          </label>
          <input
            id="fuel"
            type="number"
            value={formData.fuel}
            onChange={(e) => setFormData((prev) => ({ ...prev, fuel: e.target.value }))}
            className="block w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-4 py-2 text-zinc-900 dark:text-zinc-50 focus:border-blue-500 focus:ring-blue-500"
            min="0"
            step="0.01"
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting || !!timeError}
          className="w-full rounded-lg bg-signal-600 hover:bg-signal-700 disabled:opacity-50 disabled:cursor-not-allowed px-6 py-2.5 font-medium text-white transition-colors"
        >
          {isSubmitting ? t('submitting') : t('submitButton')}
        </button>
      </form>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      {showNotificationPrompt && <NotificationPermissionPrompt />}

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

      {showNoVehiclesDialog && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="no-vehicles-dialog-title"
        >
          <div className="bg-white dark:bg-zinc-800 rounded-lg p-6 max-w-sm w-full shadow-xl space-y-4">
            <h3 id="no-vehicles-dialog-title" className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
              {t('noVehiclesDialogTitle')}
            </h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              {canManageSelectedOrganization ? t('noVehiclesDialogAdminMessage') : t('noVehiclesDialogEmployeeMessage')}
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDismissedNoVehiclesDialog(true)}
                className="px-4 py-2 text-sm rounded-lg border border-zinc-300 dark:border-zinc-600 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors"
              >
                {tCommon('close')}
              </button>
              {canManageSelectedOrganization && onNavigateToAddVehicle && (
                <button
                  onClick={() => {
                    setDismissedNoVehiclesDialog(true);
                    onNavigateToAddVehicle();
                  }}
                  className="px-4 py-2 text-sm rounded-lg bg-signal-600 hover:bg-signal-700 text-white font-medium transition-colors"
                >
                  {t('noVehiclesDialogAddVehicleButton')}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default CreateUsage;