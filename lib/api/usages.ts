import { authenticatedFetch } from './authenticatedFetch';

export interface Usage {
  id: number | string;
  vehicleId?: string;
  startOperatingHours?: number;
  endOperatingHours?: number;
  fuelLitersRefilled?: number;
  usageDate?: string;
}

export interface Vehicle {
  id: string;
  name: string;
  plate?: string;
}

export interface UsageWithVehicle extends Usage {
  vehicle: Vehicle;
}

export interface GetUsagesWithVehiclesResponse {
  usages: UsageWithVehicle[];
}

/**
 * Fetch usages with vehicle data included in a single request.
 * This optimizes the previous approach of making two separate requests.
 * 
 * @param organizationId - Optional organization ID for filtering (used by super admins)
 * @returns Promise with usages including vehicle information
 */
export async function getUsagesWithVehicles(
  organizationId?: string
): Promise<UsageWithVehicle[]> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl) {
    throw new Error('API URL nicht konfiguriert');
  }

  const headers: HeadersInit = {};
  if (organizationId) {
    headers['X-Organization-Id'] = organizationId;
  }

  const response = await authenticatedFetch(`${apiUrl}/usages/with-vehicles`, {
    headers,
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${await response.text()}`);
  }

  const data: GetUsagesWithVehiclesResponse = await response.json();
  return data.usages;
}
