import { authenticatedRequest } from './auth-api';

export interface LocationItem {
  code: string;
  name: string;
}

export function getProvinces(signal?: AbortSignal): Promise<LocationItem[]> {
  return authenticatedRequest<LocationItem[]>('/locations/provinces', { signal });
}

export function getCities(provinceCode: string, signal?: AbortSignal): Promise<LocationItem[]> {
  return authenticatedRequest<LocationItem[]>(
    `/locations/provinces/${encodeURIComponent(provinceCode)}/cities-municipalities`, { signal },
  );
}

export function getBarangays(municipalityCode: string, signal?: AbortSignal): Promise<LocationItem[]> {
  return authenticatedRequest<LocationItem[]>(
    `/locations/cities-municipalities/${encodeURIComponent(municipalityCode)}/barangays`, { signal },
  );
}
