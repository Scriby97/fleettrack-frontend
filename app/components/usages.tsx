'use client';

import { useState, useEffect, type FC, type FormEvent } from 'react';
import CalendarView from './CalendarView';
import { authenticatedFetch } from '@/lib/api/authenticatedFetch';
import { useAuth } from '@/lib/auth/AuthProvider';

interface Report {
  id: number;
  vehicleId?: string;
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
  isAdmin: boolean;
}

const ReportItem: FC<ReportItemProps> = ({ report, onEdit, onDelete, isAdmin }) => (
  <div className="bg-[var(--card-bg)] rounded-2xl p-5 hover:bg-[var(--hover)] transition-colors">
    <div className="flex items-start gap-4">
      <div className="w-12 h-12 rounded-xl bg-[var(--primary)] flex items-center justify-center flex-shrink-0">
        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      </div>
      
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-[var(--foreground)] text-lg mb-1 truncate">
          {report.vehicle}
        </h3>
        {report.creationDate && (
          <p className="text-sm text-[var(--secondary)] mb-4">
            {new Date(report.creationDate).toLocaleDateString('de-DE', { 
              day: '2-digit', 
              month: 'short', 
              year: 'numeric' 
            })}
          </p>
        )}
        
        <div className="flex gap-6 text-sm">
          <div>
            <span className="text-[var(--secondary)]">Stunden: </span>
            <span className="font-semibold text-[var(--foreground)]">
              {report.startOperatingHours}h → {report.endOperatingHours}h
            </span>
          </div>
          <div>
            <span className="text-[var(--secondary)]">Differenz: </span>
            <span className="font-semibold text-[var(--foreground)]">
              {report.endOperatingHours - report.startOperatingHours}h
            </span>
          </div>
          <div>
            <span className="text-[var(--secondary)]">Treibstoff: </span>
            <span className="font-semibold text-[var(--foreground)]">
              {report.fuel} L
            </span>
          </div>
        </div>
      </div>

      {isAdmin && (
        <div className="flex gap-2 flex-shrink-0">
          <button
            onClick={() => onEdit(report)}
            className="p-2.5 text-[var(--primary)] hover:bg-[var(--background)] rounded-xl transition-colors"
            title="Bearbeiten"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>

          <button
            onClick={() => {
              if (confirm('Möchten Sie diesen Eintrag wirklich löschen?')) {
                onDelete(report.id);
              }
            }}
            className="p-2.5 text-[var(--danger)] hover:bg-[var(--background)] rounded-xl transition-colors"
            title="Löschen"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      )}
    </div>
  </div>
);

const UebersichtEintraege: FC = () => {
  const { isAdmin } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'list' | 'calendar'>('list');
  const [editingReport, setEditingReport] = useState<Report | null>(null);
  const [editForm, setEditForm] = useState({
    vehicleId: '',
    startOperatingHours: '',
    endOperatingHours: '',
    fuel: '',
    creationDate: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const calendarEvents = reports
    .filter((r) => r.creationDate)
    .map((r) => ({
      id: r.id,
      title: `${r.vehicle}: ${r.endOperatingHours - r.startOperatingHours}h`,
      start: r.creationDate!,
      end: r.creationDate!,
    }));

  const handleEdit = (report: Report) => {
    setEditingReport(report);
    setEditForm({
      vehicleId: report.vehicleId || '',
      startOperatingHours: String(report.startOperatingHours),
      endOperatingHours: String(report.endOperatingHours),
      fuel: String(report.fuel),
      creationDate: report.creationDate || '',
    });
  };

  const handleCancelEdit = () => {
    setEditingReport(null);
    setEditForm({
      vehicleId: '',
      startOperatingHours: '',
      endOperatingHours: '',
      fuel: '',
      creationDate: '',
    });
  };

  const handleSaveEdit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingReport) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      if (!apiUrl) throw new Error('API URL nicht konfiguriert');

      const payload = {
        vehicleId: editForm.vehicleId,
        startOperatingHours: parseInt(editForm.startOperatingHours, 10),
        endOperatingHours: parseInt(editForm.endOperatingHours, 10),
        fuelLitersRefilled: parseFloat(editForm.fuel) || 0,
        creationDate: editForm.creationDate,
      };

      const res = await authenticatedFetch(`${apiUrl}/usages/${editingReport.id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`API error ${res.status}: ${text}`);
      }

      // Aktualisiere die Liste
      const updatedUsage = await res.json();
      const vehicleMap = new Map<string, Vehicle>();
      vehicles.forEach((v) => vehicleMap.set(v.id, v));

      setReports((prev) =>
        prev.map((r) =>
          r.id === editingReport.id
            ? {
                id: updatedUsage.id,
                vehicleId: updatedUsage.vehicleId,
                vehicle: vehicleMap.get(String(updatedUsage.vehicleId))?.name ?? 'Unbekannt',
                startOperatingHours: updatedUsage.startOperatingHours,
                endOperatingHours: updatedUsage.endOperatingHours,
                fuel: updatedUsage.fuelLitersRefilled,
                creationDate: updatedUsage.creationDate,
              }
            : r
        )
      );

      handleCancelEdit();
      alert('Nutzung erfolgreich aktualisiert');
    } catch (err) {
      console.error('Fehler beim Aktualisieren der Nutzung:', err);
      setError(err instanceof Error ? err.message : 'Fehler beim Aktualisieren');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!apiUrl) {
      setReports((prev) => prev.filter((report) => report.id !== id));
      return;
    }

    try {
      const res = await authenticatedFetch(`${apiUrl}/usages/${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        throw new Error(`Fehler beim Löschen: ${res.status}`);
      }

      setReports((prev) => prev.filter((report) => report.id !== id));
      alert('Nutzung erfolgreich gelöscht');
    } catch (err) {
      console.error('Fehler beim Löschen der Nutzung:', err);
      alert('Fehler beim Löschen der Nutzung');
    }
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
          id: typeof u.id === 'number' ? u.id : Number(u.id),
          vehicleId: u.vehicleId,
          vehicle: vehicleMap.get(String(u.vehicleId))?.name ?? String(u.vehicleId ?? 'Unbekannt'),
          startOperatingHours: typeof u.startOperatingHours === 'number' ? u.startOperatingHours : Number(u.startOperatingHours ?? 0),
          endOperatingHours: typeof u.endOperatingHours === 'number' ? u.endOperatingHours : Number(u.endOperatingHours ?? 0),
          fuel: typeof u.fuelLitersRefilled === 'number' ? u.fuelLitersRefilled : Number(u.fuelLitersRefilled ?? 0),
          creationDate: u.creationDate,
        }));

        setReports(mapped);
        setVehicles(vehicles);
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
    <section className="space-y-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4 px-1">
        <div>
          <h1 className="text-3xl font-bold text-[var(--foreground)]">Übersicht Nutzungen</h1>
          <p className="text-sm text-[var(--secondary)] mt-2">
            {isLoading ? 'Lade Nutzungen...' : `${reports.length} ${reports.length === 1 ? 'Nutzung' : 'Nutzungen'} gefunden`}
          </p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setView('list')} 
            className={`px-5 py-3 rounded-xl text-base font-medium transition-all ${
              view === 'list' 
                ? 'bg-[var(--primary)] text-white shadow-lg' 
                : 'bg-[var(--card-bg)] text-[var(--secondary)] hover:bg-[var(--hover)]'
            }`}
          >
            Liste
          </button>
          <button 
            onClick={() => setView('calendar')} 
            className={`px-5 py-3 rounded-xl text-base font-medium transition-all ${
              view === 'calendar' 
                ? 'bg-[var(--primary)] text-white shadow-lg' 
                : 'bg-[var(--card-bg)] text-[var(--secondary)] hover:bg-[var(--hover)]'
            }`}
          >
            Kalender
          </button>
        </div>
      </div>
      
      {error && reports.length === 0 && (
        <div className="rounded-xl bg-red-900/20 border border-red-800 p-4 mx-1">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Edit Modal */}
      {editingReport && isAdmin && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-zinc-900 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 border border-[var(--border)]">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-xl font-bold text-[var(--foreground)]">
                Nutzung bearbeiten
              </h2>
              <button
                onClick={handleCancelEdit}
                className="text-[var(--secondary)] hover:text-[var(--danger)] transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label htmlFor="edit-vehicle" className="block text-sm font-medium text-[var(--foreground)] mb-2">
                  Fahrzeug
                </label>
                <select
                  id="edit-vehicle"
                  value={editForm.vehicleId}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, vehicleId: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
                  required
                >
                  {vehicles.map((vehicle) => (
                    <option key={vehicle.id} value={vehicle.id}>
                      {vehicle.name} {vehicle.plate ? `(${vehicle.plate})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="edit-creationDate" className="block text-sm font-medium text-[var(--foreground)] mb-2">
                  Erfassungsdatum
                </label>
                <input
                  id="edit-creationDate"
                  type="date"
                  value={editForm.creationDate}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, creationDate: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label htmlFor="edit-startOperatingHours" className="block text-sm font-medium text-[var(--foreground)] mb-2">
                  Start-Betriebsstunden
                </label>
                <input
                  id="edit-startOperatingHours"
                  type="number"
                  value={editForm.startOperatingHours}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, startOperatingHours: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
                  min="0"
                  step="1"
                  required
                />
              </div>

              <div>
                <label htmlFor="edit-endOperatingHours" className="block text-sm font-medium text-[var(--foreground)] mb-2">
                  End-Betriebsstunden
                </label>
                <input
                  id="edit-endOperatingHours"
                  type="number"
                  value={editForm.endOperatingHours}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, endOperatingHours: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
                  min="0"
                  step="1"
                  required
                />
              </div>

              <div>
                <label htmlFor="edit-fuel" className="block text-sm font-medium text-[var(--foreground)] mb-2">
                  Treibstoff (L)
                </label>
                <input
                  id="edit-fuel"
                  type="number"
                  value={editForm.fuel}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, fuel: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
                  min="0"
                  step="0.1"
                />
              </div>

              {error && (
                <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4">
                  <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white font-medium py-3 rounded-lg disabled:opacity-50 transition-colors"
                >
                  { isSubmitting ? 'Änderungen werden gespeichert...' : 'Änderungen speichern'}
                </button>
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  disabled={isSubmitting}
                  className="px-6 py-3 rounded-lg border border-[var(--border)] hover:bg-[var(--hover)] transition-colors disabled:opacity-50 text-[var(--foreground)]"
                >
                  Abbrechen
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="border border-dashed border-[var(--border)] rounded-lg p-8 text-center mx-1">
          <div className="animate-spin w-8 h-8 border-4 border-[var(--primary)] border-t-transparent rounded-full mx-auto mb-3"></div>
          <p className="text-sm text-[var(--secondary)]">Lade Nutzungen…</p>
        </div>
      ) : view === 'calendar' ? (
        <div className="px-1">
          <CalendarView events={calendarEvents} />
        </div>
      ) : reports.length > 0 ? (
        <div className="space-y-3 px-1">
          {reports.map((report) => (
            <ReportItem
              key={report.id}
              report={report}
              onEdit={handleEdit}
              onDelete={handleDelete}
              isAdmin={isAdmin}
            />
          ))}
        </div>
      ) : (
        <div className="border border-dashed border-[var(--border)] rounded-lg p-8 text-center mx-1">
          <p className="text-[var(--secondary)]">Keine Nutzungen vorhanden</p>
        </div>
      )}
    </section>
  );
};

export default UebersichtEintraege;