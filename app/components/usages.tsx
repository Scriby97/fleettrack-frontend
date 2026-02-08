'use client';

import { useState, useEffect, type FC, type FormEvent } from 'react';
import CalendarView from './CalendarView';
import { authenticatedFetch } from '@/lib/api/authenticatedFetch';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useOrganization } from '@/lib/contexts/OrganizationContext';
import { getUsagesWithVehicles, type UsageWithVehicle } from '@/lib/api/usages';
import { useToast } from '@/lib/hooks/useToast';
import { ToastContainer } from './Toast';

interface Report {
  id: number | string;
  vehicleId?: string;
  vehicle: string;
  startOperatingHours: number;
  endOperatingHours: number;
  fuel: number;
  usageDate?: string;
}

interface Vehicle {
  id: string;
  name: string;
  plate?: string;
}



interface ReportItemProps {
  report: Report;
  onEdit: (report: Report) => void;
  onDelete: (id: number | string) => void;
  isAdmin: boolean;
}

const ReportItem: FC<ReportItemProps> = ({ report, onEdit, onDelete, isAdmin }) => (
  <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 p-4 hover:shadow-md transition-shadow flex justify-between items-start">
    <div className="flex-1">
      <h3 className="font-semibold text-zinc-900 dark:text-zinc-50 mb-2">
        {report.vehicle}
      </h3>
      <div className="space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
        {report.usageDate && (
          <p>
            <span className="font-medium">Erfassungsdatum:</span> {new Date(report.usageDate).toLocaleDateString('de-DE')}
          </p>
        )}
        <p>
          <span className="font-medium">Betriebsstunden:</span> {report.startOperatingHours.toFixed(1)} h — {report.endOperatingHours.toFixed(1)} h{' '}
          <span className="font-medium">({(report.endOperatingHours - report.startOperatingHours).toFixed(1)} h Differenz)</span>
        </p>
        <p>
          <span className="font-medium">Treibstoff:</span> {report.fuel} L
        </p>
      </div>
    </div>

    {/* Action Buttons - nur für Admins sichtbar */}
    {isAdmin && (
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
    )}
  </div>
);

const UebersichtEintraege: FC = () => {
  const { isAdmin, isSuperAdmin } = useAuth();
  const { organizations, selectedOrgId, setSelectedOrgId } = useOrganization();
  const { toasts, showToast, removeToast } = useToast();
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
    usageDate: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const calendarEvents = reports
    .filter((r) => r.usageDate)
    .map((r) => ({
      id: r.id,
      title: `${r.vehicle}: ${r.endOperatingHours - r.startOperatingHours}h`,
      start: r.usageDate!,
      end: r.usageDate!,
    }));

  const handleEdit = (report: Report) => {
    setEditingReport(report);
    
    // Konvertiere das usageDate in das Format YYYY-MM-DD für das Date Input
    let formattedDate = '';
    if (report.usageDate) {
      const date = new Date(report.usageDate);
      formattedDate = date.toISOString().split('T')[0];
    }
    
    setEditForm({
      vehicleId: report.vehicleId || '',
      startOperatingHours: String(report.startOperatingHours),
      endOperatingHours: String(report.endOperatingHours),
      fuel: String(report.fuel),
      usageDate: formattedDate,
    });
  };

  const handleEventClick = (eventId: string | number) => {
    const report = reports.find(r => String(r.id) === String(eventId));
    if (report) {
      handleEdit(report);
    }
  };

  const handleCancelEdit = () => {
    setEditingReport(null);
    setEditForm({
      vehicleId: '',
      startOperatingHours: '',
      endOperatingHours: '',
      fuel: '',
      usageDate: '',
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
        startOperatingHours: parseFloat(editForm.startOperatingHours),
        endOperatingHours: parseFloat(editForm.endOperatingHours),
        fuelLitersRefilled: parseFloat(editForm.fuel) || 0,
        usageDate: editForm.usageDate,
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
                usageDate: updatedUsage.usageDate,
              }
            : r
        )
      );

      handleCancelEdit();
      showToast('Nutzung erfolgreich aktualisiert', 'success');
    } catch (err) {
      console.error('Fehler beim Aktualisieren der Nutzung:', err);
      setError(err instanceof Error ? err.message : 'Fehler beim Aktualisieren');
      showToast('Fehler beim Aktualisieren der Nutzung', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number | string) => {
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
      showToast('Nutzung erfolgreich gelöscht', 'success');
    } catch (err) {
      console.error('Fehler beim Löschen der Nutzung:', err);
      showToast('Fehler beim Löschen der Nutzung', 'error');
    }
  };

  // Fetch usages data when organization is selected
  useEffect(() => {
    console.log('[USAGES] useEffect gestartet');
    const apiUrl = process.env.NEXT_PUBLIC_API_URL
    console.log('[USAGES] API URL:', apiUrl);
    if (!apiUrl) {
      console.warn('NEXT_PUBLIC_API_URL nicht konfiguriert')
      return
    }

    // Wait for organization to be selected
    if (!selectedOrgId) {
      console.log('[USAGES] Waiting for organization selection...');
      return;
    }

    const controller = new AbortController();
    const fetchData = async () => {
      console.log('[USAGES] fetchData wird aufgerufen');
      setIsLoading(true);
      setError(null);

      try {
        console.log('[USAGES] Versuche Request zu senden...');
        
        // Single optimized request to fetch usages with vehicle data
        const usagesWithVehicles = await getUsagesWithVehicles(
          isSuperAdmin ? selectedOrgId || undefined : undefined
        );
        
        console.log('[USAGES] Request erfolgreich, Anzahl:', usagesWithVehicles.length);

        // Extract unique vehicles from the response
        const vehicleMap = new Map<string, Vehicle>();
        usagesWithVehicles.forEach((u) => {
          if (u.vehicle && u.vehicleId) {
            vehicleMap.set(u.vehicleId, u.vehicle);
          }
        });

        // Map to Report format
        const mapped: Report[] = usagesWithVehicles.map((u) => ({
          id: u.id,
          vehicleId: u.vehicleId,
          vehicle: u.vehicle?.name ?? String(u.vehicleId ?? 'Unbekannt'),
          startOperatingHours: typeof u.startOperatingHours === 'number' ? u.startOperatingHours : Number(u.startOperatingHours ?? 0),
          endOperatingHours: typeof u.endOperatingHours === 'number' ? u.endOperatingHours : Number(u.endOperatingHours ?? 0),
          fuel: typeof u.fuelLitersRefilled === 'number' ? u.fuelLitersRefilled : Number(u.fuelLitersRefilled ?? 0),
          usageDate: u.usageDate,
        }));

        // Sortiere nach Erstellungsdatum, neueste zuerst
        const sorted = mapped.sort((a, b) => {
          if (!a.usageDate) return 1;
          if (!b.usageDate) return -1;
          return new Date(b.usageDate).getTime() - new Date(a.usageDate).getTime();
        });

        setReports(sorted);
        setVehicles(Array.from(vehicleMap.values()));
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
  }, [selectedOrgId, isSuperAdmin]);

  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-zinc-50">
          Übersicht Nutzungen
        </h1>
        <div className="flex flex-col gap-2 mt-2">
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
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              {isLoading ? 'Lade Nutzungen...' : `${reports.length} Nutzungen gefunden`}
            </p>
            <div className="flex gap-2">
              <button onClick={() => setView('list')} className={`px-2 sm:px-3 py-1 text-sm rounded ${view === 'list' ? 'bg-zinc-200 dark:bg-zinc-700' : ''}`}>Liste</button>
              <button onClick={() => setView('calendar')} className={`px-2 sm:px-3 py-1 text-sm rounded ${view === 'calendar' ? 'bg-zinc-200 dark:bg-zinc-700' : ''}`}>Kalender</button>
            </div>
          </div>
        </div>
        {error && reports.length === 0 && (
          <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-3 mt-3">
            <p className="text-sm text-red-900 dark:text-red-100">{error}</p>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editingReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-zinc-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                Nutzung {isAdmin ? 'bearbeiten' : 'anzeigen'}
              </h2>
              <button
                onClick={handleCancelEdit}
                className="text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-5">
              {/* Fahrzeug */}
              <div className="space-y-2">
                <label htmlFor="edit-vehicle" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Fahrzeug
                </label>
                <select
                  id="edit-vehicle"
                  value={editForm.vehicleId}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, vehicleId: e.target.value }))}
                  className="block w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-4 py-2 text-zinc-900 dark:text-zinc-50 focus:border-blue-500 focus:ring-blue-500"
                  required
                  disabled={!isAdmin}
                >
                  {vehicles.map((vehicle) => (
                    <option key={vehicle.id} value={vehicle.id}>
                      {vehicle.name} {vehicle.plate ? `(${vehicle.plate})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Erfassungsdatum */}
              <div className="space-y-2">
                <label htmlFor="edit-usageDate" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Erfassungsdatum
                </label>
                <input
                  id="edit-usageDate"
                  type="date"
                  value={editForm.usageDate}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, usageDate: e.target.value }))}
                  className="block w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-4 py-2 text-zinc-900 dark:text-zinc-50 focus:border-blue-500 focus:ring-blue-500 [&::-webkit-calendar-picker-indicator]:invert"
                  required
                  disabled={!isAdmin}
                />
              </div>

              {/* Start-Betriebsstunden */}
              <div className="space-y-2">
                <label htmlFor="edit-startOperatingHours" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Start-Betriebsstunden
                </label>
                <input
                  id="edit-startOperatingHours"
                  type="number"
                  value={editForm.startOperatingHours}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, startOperatingHours: e.target.value }))}
                  className="block w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-4 py-2 text-zinc-900 dark:text-zinc-50 focus:border-blue-500 focus:ring-blue-500"
                  min="0"
                  step="0.1"
                  required
                  disabled={!isAdmin}
                />
              </div>

              {/* End-Betriebsstunden */}
              <div className="space-y-2">
                <label htmlFor="edit-endOperatingHours" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  End-Betriebsstunden
                </label>
                <input
                  id="edit-endOperatingHours"
                  type="number"
                  value={editForm.endOperatingHours}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, endOperatingHours: e.target.value }))}
                  className="block w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-4 py-2 text-zinc-900 dark:text-zinc-50 focus:border-blue-500 focus:ring-blue-500"
                  min="0"
                  step="0.1"
                  required
                  disabled={!isAdmin}
                />
              </div>

              {/* Treibstoff */}
              <div className="space-y-2">
                <label htmlFor="edit-fuel" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Treibstoff (L)
                </label>
                <input
                  id="edit-fuel"
                  type="number"
                  value={editForm.fuel}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, fuel: e.target.value }))}
                  className="block w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-4 py-2 text-zinc-900 dark:text-zinc-50 focus:border-blue-500 focus:ring-blue-500"
                  min="0"
                  step="0.1"
                  disabled={!isAdmin}
                />
              </div>

              {/* Error Message */}
              {error && (
                <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-3">
                  <p className="text-sm text-red-900 dark:text-red-100">{error}</p>
                </div>
              )}

              {/* Buttons */}
              <div className="flex gap-3">
                {isAdmin && (
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed px-6 py-2.5 font-medium text-white transition-colors"
                  >
                    {isSubmitting ? 'Wird gespeichert...' : 'Änderungen speichern'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  disabled={isSubmitting}
                  className={`${isAdmin ? '' : 'flex-1'} px-6 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-600 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors disabled:opacity-50`}
                >
                  {isAdmin ? 'Abbrechen' : 'Schließen'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="rounded-lg border border-dashed border-zinc-300 dark:border-zinc-600 p-4 text-center">
          <p className="text-zinc-600 dark:text-zinc-400">Lade Nutzungen…</p>
        </div>
      ) : view === 'calendar' ? (
        <CalendarView events={calendarEvents} onEventClick={handleEventClick} />
      ) : reports.length > 0 ? (
        <div className="grid gap-3">
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
        <div className="rounded-lg border border-dashed border-zinc-300 dark:border-zinc-600 p-8 text-center">
          <p className="text-zinc-600 dark:text-zinc-400">Keine Nutzungen vorhanden</p>
        </div>
      )}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </section>
  );
};

export default UebersichtEintraege;