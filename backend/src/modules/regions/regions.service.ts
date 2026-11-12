import type { CarbonApi } from '../../integrations/carbon-api';
import { ServiceRepository } from '../services/services.repository';

export interface RegionsResponse {
  regions: Array<{
    code: string; country: string; region: string; city: string | null;
    latitude: number; longitude: number; carbonIntensityGco2ePerKwh: number;
    renewableSharePercent: number; monitoredServices: number;
  }>;
  source: 'api' | 'cache';
  fetchedAt: string;
}

export async function getRegions(carbonApi: CarbonApi, services: ServiceRepository): Promise<RegionsResponse> {
  const result = await carbonApi.listRegions();
  const counts = new Map((await services.countMonitoredByRegion()).map(row => [row.region_code, Number(row.monitored_services)]));
  return {
    regions: result.regions.map(region => ({
      code: region.code, country: region.country, region: region.region, city: region.city,
      latitude: region.latitude, longitude: region.longitude,
      carbonIntensityGco2ePerKwh: region.intensityGco2ePerKwh,
      renewableSharePercent: region.renewableSharePercent,
      monitoredServices: counts.get(region.code) ?? 0,
    })),
    source: result.source,
    fetchedAt: new Date(result.fetchedAt).toISOString(),
  };
}
