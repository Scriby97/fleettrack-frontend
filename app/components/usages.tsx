 'use client';

import { useState, useEffect, type FC } from 'react';
import CalendarView from './CalendarView';
import { authenticatedFetch } from '@/lib/api/authenticatedFetch';

interface Report {
  id: number;
  vehicle: string;
  startOperatingHours: number;
  endOperatingHours: number;
  fuel: number;
  creationDate?: string;
}

interface Usage {
  id: number | string;
  vehicleId?: string;
  startOperatingHours?: number;
  endOperatingHours?: number;
  fuelLitersRefilled?: number;
  creationDate?: string;
}

interface Vehicle {
  id: string;
  name: string;
  plate?: string;
}



interface ReportItemProps {
  report: Report;
  onEdit: (report: Report) => void;
  onDelete: (id: number) => void;
}

const ReportItem: FC<ReportItemProps> = ({ report, onEdit, onDelete }) => (
  <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 p-4 hover:shadow-md transition-shadow flex justify-between items-start">
    <div className="flex-1">
      <h3 className="font-semibold text-zinc-900 dark:text-zinc-50 mb-2">
        {report.vehicle}
      </h3>
      <div className="space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
        {report.creationDate && (
          <p>
            <span className="font-medium">Erfassungsdatum:</span> {new Date(report.creationDate).toLocaleDateString('de-DE')}
          </p>
        )}
        <p>
          <span className="font-medium">Betriebsstunden:</span> {report.startOperatingHours} h — {report.endOperatingHours} h{' '}
          <span className="font-medium">({report.endOperatingHours - report.startOperatingHours} h Differenz)</span>
        </p>
        <p>
          <span className="font-medium">Treibstoff:</span> {report.fuel} L
        </p>
      </div>
    </div>

    {/* Action Buttons */}
    <div className="flex gap-2 ml-4">
      <button
        onClick={() => onEdit(report)}
        className="p-2 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 transition-colors"
        title="Bearbeiten"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
          />
        </svg>
      </button>

      <button
        onClick={() => {
          if (confirm('Möchten Sie diesen Eintrag wirklich löschen?')) {
            onDelete(report.id);
          }
        }}
        className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 transition-colors"
        title="Löschen"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
          />
        </svg>
      </button>
    </div>
  </div>
);

const UebersichtEintraege: FC = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'list' | 'calendar'>('list');

  const calendarEvents = reports
    .filter((r) => r.creationDate)
    .map((r) => ({
      id: r.id,
      title: `${r.vehicle}: ${r.endOperatingHours - r.startOperatingHours}h`,
      start: r.creationDate!,
      end: r.creationDate!,
    }));

  const handleEdit = (report: Report) => {
    console.log('Edit:', report);
    // TODO: Modal oder Edit-View öffnen
    alert(`Bearbeite: ${report.vehicle}`);
  };

  const handleDelete = (id: number) => {
    setReports((prev) => prev.filter((report) => report.id !== id));
  };

  useEffect(() => {
    console.log('[USAGES] useEffect gestartet');
    const apiUrl = process.env.NEXT_PUBLIC_API_URL
    console.log('[USAGES] API URL:', apiUrl);
    if (!apiUrl) {
      console.warn('NEXT_PUBLIC_API_URL nicht konfiguriert')
      return
    }

    const controller = new AbortController();
    const fetchData = async () => {
      console.log('[USAGES] fetchData wird aufgerufen');
      setIsLoading(true);
      setError(null);

      try {
        console.log('[USAGES] Versuche Requests zu senden...');
        const [usagesRes, vehiclesRes] = await Promise.all([
          authenticatedFetch(`${apiUrl}/usages`, { signal: controller.signal }),
          authenticatedFetch(`${apiUrl}/vehicles`, { signal: controller.signal }),
        ]);
        console.log('[USAGES] Requests erfolgreich, Status:', usagesRes.status, vehiclesRes.status);

        if (!usagesRes.ok) throw new Error(`Usages HTTP ${usagesRes.status}`);
        if (!vehiclesRes.ok) throw new Error(`Vehicles HTTP ${vehiclesRes.status}`);

        const usages: Usage[] = await usagesRes.json();
        const vehicles: Vehicle[] = await vehiclesRes.json();

        const vehicleMap = new Map<string, Vehicle>();
        vehicles.forEach((v) => vehicleMap.set(v.id, v));

        const mapped: Report[] = usages.map((u) => ({
          id: u.id,
          vehicle: vehicleMap.get(String(u.vehicleId))?.name ?? String(u.vehicleId ?? 'Unbekannt'),
          startOperatingHours: typeof u.startOperatingHours === 'number' ? u.startOperatingHours : Number(u.startOperatingHours ?? 0),
          endOperatingHours: typeof u.endOperatingHours === 'number' ? u.endOperatingHours : Number(u.endOperatingHours ?? 0),
          fuel: typeof u.fuelLitersRefilled === 'number' ? u.fuelLitersRefilled : Number(u.fuelLitersRefilled ?? 0),
          creationDate: u.creationDate,
        }));

        setReports(mapped);
        setError(null);
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return;
        console.error('[USAGES] Fehler beim Laden der Nutzungen:', err);
        console.error('[USAGES] Fehler Details:', err instanceof Error ? err.message : String(err));
        setError('Fehler beim Laden der Nutzungen');
      } finally {
        setIsLoading(false);
      }
    };

    console.log('[USAGES] Rufe fetchData auf');
    fetchData();

    return () => {
      console.log('[USAGES] useEffect cleanup');
      controller.abort();
    };
  }, []);

  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
          Übersicht Nutzungen
        </h1>
        <div className="flex items-center gap-4 mt-1">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {isLoading ? 'Lade Nutzungen...' : `${reports.length} Nutzungen gefunden`}
          </p>
          <div className="ml-auto flex gap-2">
            <button onClick={() => setView('list')} className={`px-3 py-1 rounded ${view === 'list' ? 'bg-zinc-200 dark:bg-zinc-700' : ''}`}>Liste</button>
            <button onClick={() => setView('calendar')} className={`px-3 py-1 rounded ${view === 'calendar' ? 'bg-zinc-200 dark:bg-zinc-700' : ''}`}>Kalender</button>
          </div>
        </div>
        {error && reports.length === 0 && (
          <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-3 mt-3">
            <p className="text-sm text-red-900 dark:text-red-100">{error}</p>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="rounded-lg border border-dashed border-zinc-300 dark:border-zinc-600 p-4 text-center">
          <p className="text-zinc-600 dark:text-zinc-400">Lade Nutzungen…</p>
        </div>
      ) : view === 'calendar' ? (
        <CalendarView events={calendarEvents} />
      ) : reports.length > 0 ? (
        <div className="grid gap-3">
          {reports.map((report) => (
            <ReportItem
              key={report.id}
              report={report}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-zinc-300 dark:border-zinc-600 p-8 text-center">
          <p className="text-zinc-600 dark:text-zinc-400">Keine Nutzungen vorhanden</p>
        </div>
      )}
    </section>
  );
};

export default UebersichtEintraege;