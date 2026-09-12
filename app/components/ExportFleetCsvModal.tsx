'use client';

import { useState, type FC } from 'react';
import { useTranslations } from 'next-intl';
import { getVehicleUsageHistory } from '@/lib/api/vehicles';
import { vehicleUsesKm } from '@/lib/vehicles/metric';
import { useToast } from '@/lib/hooks/useToast';
import { ToastContainer } from './Toast';
import { typeRank, VEHICLE_GROUPS, type Vehicle } from './vehicles';

interface ExportFleetCsvModalProps {
  vehicles: Vehicle[];
  organizationName?: string;
  initialRangeStart: string;
  initialRangeEnd: string;
  onClose: () => void;
}

// Eine CSV-Zelle: in Anführungszeichen, falls sie Trennzeichen/Anführungszeichen/
// Zeilenumbrüche enthält; enthaltene Anführungszeichen werden verdoppelt.
const csvCell = (value: string): string => {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
};

const csvRow = (cells: Array<string | number>): string =>
  cells.map((c) => csvCell(String(c))).join(',');

// Sanitized Datumsteil eines datetime-local-Werts ("YYYY-MM-DDTHH:mm" -> "YYYY-MM-DD") für den Dateinamen.
const datePart = (value: string): string => value.slice(0, 10);

const ExportFleetCsvModal: FC<ExportFleetCsvModalProps> = ({
  vehicles,
  organizationName,
  initialRangeStart,
  initialRangeEnd,
  onClose,
}) => {
  const t = useTranslations('fleetOverview');
  const tCommon = useTranslations('common');
  const { toasts, showToast, removeToast } = useToast();

  const [rangeStart, setRangeStart] = useState(initialRangeStart);
  const [rangeEnd, setRangeEnd] = useState(initialRangeEnd);
  const [selectedRanks, setSelectedRanks] = useState<Set<number>>(
    () => new Set(VEHICLE_GROUPS.map((g) => g.rank)),
  );
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rangeInvalid =
    Boolean(rangeStart) && Boolean(rangeEnd) && new Date(rangeStart) > new Date(rangeEnd);

  const toggleRank = (rank: number) => {
    setSelectedRanks((prev) => {
      const next = new Set(prev);
      if (next.has(rank)) {
        next.delete(rank);
      } else {
        next.add(rank);
      }
      return next;
    });
  };

  const localizedType = (value?: string | null) => {
    if (value === 'Pistenfahrzeug') return t('vehicleTypeGroomer');
    if (value === 'Skidoo') return t('vehicleTypeSkidoo');
    if (value === 'Quad') return t('vehicleTypeQuad');
    return value || '—';
  };

  const handleExport = async () => {
    setError(null);
    const selected = vehicles.filter((v) => selectedRanks.has(typeRank(v.vehicleType)));
    if (selected.length === 0) {
      setError(t('exportNoVehiclesError'));
      return;
    }

    setIsExporting(true);
    try {
      const startIso = new Date(rangeStart).toISOString();
      const endIso = new Date(rangeEnd).toISOString();

      const results = await Promise.allSettled(
        selected.map((vehicle) =>
          getVehicleUsageHistory(vehicle.id, { startDate: startIso, endDate: endIso }),
        ),
      );

      const header = csvRow([
        t('exportColName'),
        t('exportColType'),
        t('snowsatLabel'),
        t('plateLabel'),
        t('exportColStatus'),
        t('exportColHours'),
        t('exportColKm'),
        t('exportColFuel'),
        t('usageCountLabel'),
      ]);

      let failedCount = 0;
      const rows = selected.map((vehicle, index) => {
        const result = results[index];
        const usesKm = vehicleUsesKm(vehicle.vehicleType);
        const status = vehicle.isRetired ? t('exportColStatusRetired') : t('exportColStatusActive');

        if (result.status === 'rejected') {
          failedCount += 1;
          return csvRow([
            vehicle.name,
            localizedType(vehicle.vehicleType),
            vehicle.snowsatNumber ?? '',
            vehicle.plate,
            status,
            '',
            '',
            '',
            '',
          ]);
        }

        const totals = result.value.totals;
        const counterValue = usesKm ? Math.round(totals.operatingHours) : Number(totals.operatingHours.toFixed(1));

        return csvRow([
          vehicle.name,
          localizedType(vehicle.vehicleType),
          vehicle.snowsatNumber ?? '',
          vehicle.plate,
          status,
          usesKm ? '' : counterValue,
          usesKm ? counterValue : '',
          Math.round(totals.fuelLiters),
          totals.usageCount,
        ]);
      });

      const csvContent = [header, ...rows].join('\r\n');
      // BOM, damit Excel Umlaute (ä/ö/ü) korrekt als UTF-8 erkennt.
      const blob = new Blob(['﻿' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const orgSlug = (organizationName ?? 'Flotte').replace(/[^a-zA-Z0-9_-]+/g, '_');
      const filename = `${orgSlug}_${datePart(rangeStart)}_bis_${datePart(rangeEnd)}.csv`;

      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      if (failedCount > 0) {
        showToast(t('exportPartialErrorToast', { count: failedCount }), 'error');
      } else {
        showToast(t('exportSuccessToast'), 'success');
      }
      onClose();
    } catch (err) {
      console.error('Fehler beim Erstellen des Flotten-Exports:', err);
      setError(t('exportErrorGeneric'));
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      <div className="bg-white dark:bg-zinc-800 rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">{t('exportModalTitle')}</h2>
          <button
            onClick={onClose}
            disabled={isExporting}
            className="text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 disabled:opacity-50"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-5">
          {/* Fahrzeugtypen */}
          <div>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 mb-2">
              {t('exportTypesTitle')}
            </h3>
            <div className="space-y-2">
              {VEHICLE_GROUPS.map((group) => (
                <label key={group.rank} className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                  <input
                    type="checkbox"
                    checked={selectedRanks.has(group.rank)}
                    onChange={() => toggleRank(group.rank)}
                    className="rounded border-zinc-300 dark:border-zinc-600 text-blue-600 focus:ring-blue-500"
                  />
                  {t(group.labelKey)}
                </label>
              ))}
            </div>
          </div>

          {/* Zeitraum */}
          <div>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 mb-2">
              {t('filterSectionTitle')}
            </h3>
            <div className="flex flex-col sm:flex-row sm:items-end gap-3">
              <div className="flex-1 space-y-1">
                <label htmlFor="exportRangeStart" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  {t('filterStartLabel')}
                </label>
                <input
                  id="exportRangeStart"
                  type="datetime-local"
                  value={rangeStart}
                  onChange={(e) => setRangeStart(e.target.value)}
                  className="block w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-50 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div className="flex-1 space-y-1">
                <label htmlFor="exportRangeEnd" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  {t('filterEndLabel')}
                </label>
                <input
                  id="exportRangeEnd"
                  type="datetime-local"
                  value={rangeEnd}
                  onChange={(e) => setRangeEnd(e.target.value)}
                  className="block w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-50 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>
            {rangeInvalid && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{t('invalidRangeError')}</p>}
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-3">
              <p className="text-sm text-red-900 dark:text-red-100">{error}</p>
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleExport}
              disabled={isExporting || rangeInvalid || selectedRanks.size === 0}
              className="flex-1 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed px-6 py-2.5 font-medium text-white transition-colors"
            >
              {isExporting ? t('exportGenerating') : t('exportSubmitButton')}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={isExporting}
              className="px-6 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-600 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors disabled:opacity-50"
            >
              {tCommon('cancel')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExportFleetCsvModal;
