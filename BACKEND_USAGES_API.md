# Backend API-Anforderung: Optimierter Usages Endpoint

## Übersicht
Um die Performance beim Laden von Nutzungen zu optimieren, wird ein neuer kombinierter API-Endpoint benötigt, der Nutzungen mit den zugehörigen Fahrzeugdaten in einer einzelnen Anfrage zurückgibt.

## Neuer Endpoint

### GET `/usages/with-vehicles`

Dieser Endpoint ersetzt die bisherige Notwendigkeit, zwei separate Requests (`/usages` und `/vehicles`) durchzuführen.

## Request

### Headers
- `Authorization: Bearer <token>` (erforderlich)
- `X-Organization-Id: <organizationId>` (optional, für Super-Admins)

### Query Parameter
Keine

## Response

### Erfolgreiche Antwort (200 OK)

```json
{
  "usages": [
    {
      "id": 1,
      "vehicleId": "vehicle-uuid-123",
      "startOperatingHours": 100,
      "endOperatingHours": 108,
      "fuelLitersRefilled": 45.5,
      "creationDate": "2026-01-20T10:30:00Z",
      "vehicle": {
        "id": "vehicle-uuid-123",
        "name": "Traktor 1",
        "plate": "AB-123"
      }
    },
    {
      "id": 2,
      "vehicleId": "vehicle-uuid-456",
      "startOperatingHours": 50,
      "endOperatingHours": 55,
      "fuelLitersRefilled": 30.0,
      "creationDate": "2026-01-21T14:15:00Z",
      "vehicle": {
        "id": "vehicle-uuid-456",
        "name": "Schneepflug 2",
        "plate": "CD-456"
      }
    }
  ]
}
```

### Fehlerantworten
- `401 Unauthorized` - Fehlende oder ungültige Authentifizierung
- `403 Forbidden` - Keine Berechtigung für die angeforderte Organisation
- `500 Internal Server Error` - Server-Fehler

## Backend-Implementierung

### Datenbankabfrage (Beispiel SQL)

```sql
SELECT 
    u.id,
    u.vehicle_id as "vehicleId",
    u.start_operating_hours as "startOperatingHours",
    u.end_operating_hours as "endOperatingHours",
    u.fuel_liters_refilled as "fuelLitersRefilled",
    u.creation_date as "creationDate",
    v.id as "vehicle.id",
    v.name as "vehicle.name",
    v.plate as "vehicle.plate"
FROM usages u
INNER JOIN vehicles v ON u.vehicle_id = v.id
WHERE u.organization_id = $1
ORDER BY u.creation_date DESC;
```

### Wichtige Anforderungen

1. **JOIN Operation**: Die Fahrzeugdaten müssen per JOIN mit den Nutzungsdaten verknüpft werden
2. **Nested Object**: Die Fahrzeugdaten sollen als verschachteltes `vehicle`-Objekt zurückgegeben werden
3. **Organization Filter**: Berücksichtigung des `X-Organization-Id` Headers für Super-Admins
4. **Authentifizierung**: Validierung des JWT-Tokens und Zugriffsberechtigung
5. **Performance**: Index auf `vehicle_id` in der `usages`-Tabelle empfohlen

### Pseudo-Code (Node.js/Express Beispiel)

```javascript
router.get('/usages/with-vehicles', authenticateToken, async (req, res) => {
  try {
    const organizationId = req.headers['x-organization-id'] || req.user.organizationId;
    
    // Validate access rights
    if (req.user.role !== 'SUPER_ADMIN' && organizationId !== req.user.organizationId) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    
    // Query database with JOIN
    const usages = await db.query(`
      SELECT 
        u.id,
        u.vehicle_id,
        u.start_operating_hours,
        u.end_operating_hours,
        u.fuel_liters_refilled,
        u.creation_date,
        json_build_object(
          'id', v.id,
          'name', v.name,
          'plate', v.plate
        ) as vehicle
      FROM usages u
      INNER JOIN vehicles v ON u.vehicle_id = v.id
      WHERE u.organization_id = $1
      ORDER BY u.creation_date DESC
    `, [organizationId]);
    
    // Transform to camelCase if needed
    const formattedUsages = usages.rows.map(row => ({
      id: row.id,
      vehicleId: row.vehicle_id,
      startOperatingHours: row.start_operating_hours,
      endOperatingHours: row.end_operating_hours,
      fuelLitersRefilled: row.fuel_liters_refilled,
      creationDate: row.creation_date,
      vehicle: row.vehicle
    }));
    
    res.json({ usages: formattedUsages });
    
  } catch (error) {
    console.error('Error fetching usages with vehicles:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

## Vorteile der Optimierung

1. **Performance**: Nur ein Netzwerk-Request statt zwei
2. **Konsistenz**: Garantierte Daten-Konsistenz durch JOIN
3. **Weniger Code**: Einfachere Frontend-Logik
4. **Weniger Latenz**: Halbierte Anzahl an Round-Trips zum Server
5. **Atomarität**: Alle Daten aus einer Transaktion

## Migration

Die alten Endpoints `/usages` und `/vehicles` können parallel weiter existieren, da sie möglicherweise noch von anderen Komponenten verwendet werden (z.B. vehicles.tsx für die Fahrzeugübersicht).

## Testing

Beispiel-Request mit curl:

```bash
curl -X GET "http://localhost:3001/usages/with-vehicles" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "X-Organization-Id: org-uuid-123"
```

Erwartetes Resultat: JSON mit `usages` Array, wobei jede Usage ein verschachteltes `vehicle`-Objekt enthält.
