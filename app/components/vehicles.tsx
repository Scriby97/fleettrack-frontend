// ...existing code...
'use client';

import { useState, useEffect, type FC } from 'react';

interface Vehicle {
  id: string;
  name: string;
  plate: string;
}

interface VehicleItemProps {
  vehicle: Vehicle;
  onEdit: (vehicle: Vehicle) => void;
  onDelete: (id: string) => void;
  stats?: { hours: number; fuelLiters: number } | null;
}

const VehicleItem: FC<VehicleItemProps> = ({ vehicle, onEdit, onDelete, stats = null }) => (
  <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 p-4 hover:shadow-md transition-shadow flex justify-between items-start">
    <div className="flex-1">
      <h3 className="font-semibold text-zinc-900 dark:text-zinc-50 mb-2">
        {vehicle.name}
      </h3>
      <div className="text-sm text-zinc-600 dark:text-zinc-400">
        Kennzeichen: <span className="font-medium">{vehicle.plate}</span>
      </div>
      <div className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        <div>
          Arbeitsstunden:{' '}
          <span className="font-medium">
            {typeof stats?.hours === 'number' ? stats.hours.toFixed(2) : '—'}
          </span>
        </div>
        <div>Total getankt: <span className="font-medium">{stats?.fuelLiters ?? '—'} L</span></div>
      </div>
    </div>

    {/* Action Buttons */}
    <div className="flex gap-2 ml-4">
      <button
        onClick={() => onEdit(vehicle)}
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
          if (confirm(`Möchten Sie "${vehicle.name}" wirklich löschen?`)) {
            onDelete(vehicle.id);
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

const FlottenUebersicht: FC = () => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [statsMap, setStatsMap] = useState<Record<string, { hours: number; fuelLiters: number }>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Nur im Dev-Mode Backend auf localhost:3001 anfragen
    if (process.env.NODE_ENV !== 'development') return;

    const controller = new AbortController();
    const fetchStats = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const res = await fetch('http://localhost:3001/vehicles/stats', { signal: controller.signal });
        if (!res.ok) throw new Error(`Vehicles stats HTTP ${res.status}`);
        const statsData = await res.json();

        // Normalize into vehicles array and statsMap
        const vehiclesFromStats: Vehicle[] = [];
        const map: Record<string, { hours: number; fuelLiters: number }> = {};

        if (Array.isArray(statsData)) {
          // Expect items like { id|vehicleId, name, plate, totalHours, totalFuelLiters }
          statsData.forEach((s: any) => {
            const id = String(s.vehicleId ?? s.id ?? s.vehicleId ?? s.vehicle ?? s.vehicleId ?? '');
            const name = s.name ?? s.vehicleName ?? s.vehicle ?? `Fahrzeug ${id}`;
            const plate = s.plate ?? s.kennzeichen ?? s.registration ?? '';
            vehiclesFromStats.push({ id, name, plate });
            map[id] = {
              hours: Number(s.totalWorkHours ?? s.totalHours ?? s.hours ?? 0),
              fuelLiters: Number(s.totalFuelLiters ?? s.fuelLiters ?? s.fuel ?? 0),
            };
          });
        } else if (statsData && typeof statsData === 'object') {
          // object mapping: { vehicleId: { hours, fuelLiters, name?, plate? }, ... }
          Object.entries(statsData).forEach(([k, v]) => {
            const obj: any = v as any;
            const id = String(k);
            const name = obj.name ?? obj.vehicleName ?? `Fahrzeug ${id}`;
            const plate = obj.plate ?? obj.kennzeichen ?? '';
            vehiclesFromStats.push({ id, name, plate });
            map[id] = {
              hours: Number(obj.totalWorkHours ?? obj.totalHours ?? obj.hours ?? 0),
              fuelLiters: Number(obj.totalFuelLiters ?? obj.fuelLiters ?? obj.fuel ?? 0),
            };
          });
        } else {
          throw new Error('Unexpected stats response format');
        }

        setVehicles(vehiclesFromStats);
        setStatsMap(map);
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return;
        console.error('Fehler beim Laden der Fahrzeug-Stats:', err);
        setError('Fehler beim Laden der Fahrzeuge');
        // keep empty vehicles and statsMap
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();

    return () => controller.abort();
  }, []);

  const handleEdit = (vehicle: Vehicle) => {
    console.log('Edit:', vehicle);
    alert(`Bearbeite: ${vehicle.name}`);
  };

  const handleDelete = (id: string) => {
    setVehicles((prev) => prev.filter((vehicle) => vehicle.id !== id));
  };

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
          Flottenübersicht
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
          {vehicles.length} Fahrzeuge in der Flotte
        </p>
      </div>

      {isLoading && (
        <div className="rounded-lg border border-dashed border-zinc-300 dark:border-zinc-600 p-4 text-center">
          <p className="text-zinc-600 dark:text-zinc-400">Lade Fahrzeuge...</p>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4">
          <p className="text-sm text-red-900 dark:text-red-100">{error}</p>
        </div>
      )}

      {vehicles.length > 0 ? (
        <div className="grid gap-3">
          {vehicles.map((vehicle) => (
            <VehicleItem
              key={vehicle.id}
              vehicle={vehicle}
              onEdit={handleEdit}
              onDelete={handleDelete}
              stats={statsMap[vehicle.id] ?? null}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-zinc-300 dark:border-zinc-600 p-8 text-center">
          <p className="text-zinc-600 dark:text-zinc-400">
            Keine Fahrzeuge vorhanden
          </p>
        </div>
      )}
    </section>
  );
};

export default FlottenUebersicht;
// ...existing code...




// 'use client';

// import { useState, type FC } from 'react';

// interface Vehicle {
//   id: string;
//   name: string;
//   plate: string;
// }

// interface VehicleItemProps {
//   vehicle: Vehicle;
//   onEdit: (vehicle: Vehicle) => void;
//   onDelete: (id: string) => void;
// }

// const VehicleItem: FC<VehicleItemProps> = ({ vehicle, onEdit, onDelete }) => (
//   <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 p-4 hover:shadow-md transition-shadow flex justify-between items-start">
//     <div className="flex-1">
//       <h3 className="font-semibold text-zinc-900 dark:text-zinc-50 mb-2">
//         {vehicle.name}
//       </h3>
//       <div className="text-sm text-zinc-600 dark:text-zinc-400">
//         Kennzeichen: <span className="font-medium">{vehicle.plate}</span>
//       </div>
//     </div>

//     {/* Action Buttons */}
//     <div className="flex gap-2 ml-4">
//       <button
//         onClick={() => onEdit(vehicle)}
//         className="p-2 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 transition-colors"
//         title="Bearbeiten"
//       >
//         <svg
//           className="w-5 h-5"
//           fill="none"
//           stroke="currentColor"
//           viewBox="0 0 24 24"
//         >
//           <path
//             strokeLinecap="round"
//             strokeLinejoin="round"
//             strokeWidth={2}
//             d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
//           />
//         </svg>
//       </button>

//       <button
//         onClick={() => {
//           if (confirm(`Möchten Sie "${vehicle.name}" wirklich löschen?`)) {
//             onDelete(vehicle.id);
//           }
//         }}
//         className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 transition-colors"
//         title="Löschen"
//       >
//         <svg
//           className="w-5 h-5"
//           fill="none"
//           stroke="currentColor"
//           viewBox="0 0 24 24"
//         >
//           <path
//             strokeLinecap="round"
//             strokeLinejoin="round"
//             strokeWidth={2}
//             d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
//           />
//         </svg>
//       </button>
//     </div>
//   </div>
// );

// const FlottenUebersicht: FC = () => {
//   const [vehicles, setVehicles] = useState<Vehicle[]>([
//     { id: "1", name: "Toyota Corolla", plate: "ZH-123456" },
//     { id: "2", name: "VW Golf", plate: "ZH-789012" },
//   ]);

//   const handleEdit = (vehicle: Vehicle) => {
//     console.log('Edit:', vehicle);
//     // TODO: Modal oder Edit-View öffnen
//     alert(`Bearbeite: ${vehicle.name}`);
//   };

//   const handleDelete = (id: string) => {
//     setVehicles((prev) => prev.filter((vehicle) => vehicle.id !== id));
//   };

//   return (
//     <section className="space-y-6">
//       <div>
//         <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
//           Flottenübersicht
//         </h1>
//         <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
//           {vehicles.length} Fahrzeuge in der Flotte
//         </p>
//       </div>

//       {vehicles.length > 0 ? (
//         <div className="grid gap-3">
//           {vehicles.map((vehicle) => (
//             <VehicleItem
//               key={vehicle.id}
//               vehicle={vehicle}
//               onEdit={handleEdit}
//               onDelete={handleDelete}
//             />
//           ))}
//         </div>
//       ) : (
//         <div className="rounded-lg border border-dashed border-zinc-300 dark:border-zinc-600 p-8 text-center">
//           <p className="text-zinc-600 dark:text-zinc-400">
//             Keine Fahrzeuge vorhanden
//           </p>
//         </div>
//       )}
//     </section>
//   );
// };

// export default FlottenUebersicht;