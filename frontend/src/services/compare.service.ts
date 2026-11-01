import { apiRequest } from './api';
import type { ServicesComparison } from './compare.types';
import { demoComparison } from './emissions.demo';
import { isDemoMode } from './services.service';

/** Compara de 2 a 10 serviços no período [from, to) (ISO 8601, até 31 dias). */
export async function fetchComparison(ids: string[], from: string, to: string, signal?: AbortSignal): Promise<ServicesComparison> {
  if (isDemoMode) return demoComparison(ids, from, to);
  const query = new URLSearchParams({ ids: ids.join(','), from, to });
  return apiRequest<ServicesComparison>(`/services/compare?${query}`, { signal });
}
