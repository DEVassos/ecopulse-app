/** Contrato de GET /regions/{code}/carbon-intensity (OpenAPI UniLaunch). */
export interface RawCarbonIntensity {
  region_code: string;
  country: string;
  region: string;
  city?: string | null;
  carbon_intensity_gco2e_per_kwh: number;
  renewable_share_percent: number;
}

export interface CarbonIntensity {
  regionCode: string;
  intensityGco2ePerKwh: number;
  renewableSharePercent: number;
}

export type CarbonIntensityResult =
  | { status: 'ok'; factor: CarbonIntensity; source: 'api' | 'cache'; fetchedAt: number; expiresAt: number }
  | { status: 'region_not_found'; regionCode: string };
