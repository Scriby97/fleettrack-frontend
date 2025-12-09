'use client';

import { useState, type FC } from 'react';

interface Report {
  id: number;
  vehicle: string;
  start: string;
  end: string;
  fuel: number;
}

const calculateHours = (start: string, end: string): number => {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const diffMs = endDate.getTime() - startDate.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  return Math.round(diffHours * 10) / 10;
};

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
        <p>
          <span className="font-medium">Zeitraum:</span> {report.start} — {report.end}{' '}
          <span className="font-medium">({calculateHours(report.start, report.end)} h)</span>
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
  const [reports, setReports] = useState<Report[]>([
    { id: 1, vehicle: "Toyota Corolla", start: "2025-12-08 08:00", end: "2025-12-08 12:00", fuel: 8.5 },
    { id: 2, vehicle: "VW Golf", start: "2025-12-07 09:30", end: "2025-12-07 11:00", fuel: 4.2 },
    { id: 3, vehicle: "Mercedes Sprinter", start: "2025-12-07 22:00", end: "2025-12-08 06:30", fuel: 15.8 },
  ]);

  const handleEdit = (report: Report) => {
    console.log('Edit:', report);
    // TODO: Modal oder Edit-View öffnen
    alert(`Bearbeite: ${report.vehicle}`);
  };

  const handleDelete = (id: number) => {
    setReports((prev) => prev.filter((report) => report.id !== id));
  };

  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
          Übersicht Einträge
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
          {reports.length} Einträge gefunden
        </p>
      </div>

      {reports.length > 0 ? (
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
          <p className="text-zinc-600 dark:text-zinc-400">Keine Einträge vorhanden</p>
        </div>
      )}
    </section>
  );
};

export default UebersichtEintraege;