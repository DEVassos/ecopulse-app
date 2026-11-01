/** bigint e numeric permanecem strings, sem alterar parsers globais do pg. */
export type DatabaseId = string;
export type ServiceStatus = 'ativo' | 'indisponivel' | 'sem_metricas' | 'removido';
export interface DiscoveredService {
  external_id: string; name: string; region_code: string | null;
  country: string | null; region: string | null; city: string | null;
  latitude: string | null; longitude: string | null;
}
export interface StoredService extends DiscoveredService {
  id: DatabaseId; status: ServiceStatus; first_seen_at: Date; last_seen_at: Date | null;
  created_at: Date; updated_at: Date;
}
interface CollectionBase {
  service_id: DatabaseId; collected_at: Date; region_code: string | null;
  metrics: Record<string, unknown>;
}
export type CalculationStatus = 'nao_calculado' | 'disponivel' | 'indisponivel';
type CalculationNotCalculated = {
  calculation_status: 'nao_calculado';
  carbon_intensity_gco2e_per_kwh: null; power_watts: null; energy_kwh: null;
  co2e_grams: null; calculation_error_message: null;
};
type CalculationAvailable = {
  calculation_status: 'disponivel';
  carbon_intensity_gco2e_per_kwh: string; power_watts: string; energy_kwh: string;
  co2e_grams: string; calculation_error_message: null;
};
type CalculationUnavailable = {
  calculation_status: 'indisponivel';
  carbon_intensity_gco2e_per_kwh: null; power_watts: null; energy_kwh: null;
  co2e_grams: null; calculation_error_message: string;
};
export type NewCollection = CollectionBase & (
  | ({ status: 'ok'; collection_interval_seconds: number; cpu_percent: string;
      memory_gb: string; disk_gb: string; network_gb: string; error_message: null }
      & (CalculationNotCalculated | CalculationAvailable | CalculationUnavailable))
  | ({ status: 'erro' | 'sem_metricas'; collection_interval_seconds: null; cpu_percent: null;
      memory_gb: null; disk_gb: null; network_gb: null; error_message: string | null }
      & CalculationNotCalculated)
);
export type StoredCollection = NewCollection & {
  id: DatabaseId; created_at: Date;
};
export interface StoredUser {
  id: DatabaseId; email: string; password_hash: string; created_at: Date; updated_at: Date;
}
