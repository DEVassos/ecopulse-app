import { randomUUID } from 'node:crypto';
import type { QueryExecutor } from '../src/db/connection';

/**
 * Ids explícitos e aleatórios (#349): a suíte de integração compartilha o mesmo banco entre arquivos, e
 * `repositories.integration.test.ts` fixa a sequence de `services` em 9007199254740993. Inserindo com id próprio, este
 * teste não disputa a sequence nem colide com os serviços dos outros arquivos, e pode rodar em paralelo.
 */
export function periodServiceId(): string {
  return (1_000_000_000_000_000n + BigInt(Math.floor(Math.random() * 1_000_000))).toString();
}

export async function seedService(db: QueryExecutor, id: string, name: string): Promise<void> {
  await db.query(`INSERT INTO services (id, external_id, name, region_code, country, region, status)
    OVERRIDING SYSTEM VALUE
    VALUES ($1, $2, $3, 'br-sudeste', 'Brazil', 'Sudeste', 'ativo')`,
  [id, `period-${id}-${randomUUID()}`, name]);
}

export interface SeedReading {
  serviceId: string;
  collectedAt: Date;
  /** `disponivel` grava energia e CO₂e; `indisponivel` grava energia e potência mas nenhum CO₂e (schema). */
  calculationStatus: 'disponivel' | 'indisponivel';
  energyKwh: string | null;
  co2eGrams: string | null;
}

/** Coleta `ok` de 60 s com valores fixados pelo teste; a conta é conferida à mão, não vem do worker. */
export async function seedReading(db: QueryExecutor, reading: SeedReading): Promise<void> {
  const available = reading.calculationStatus === 'disponivel';
  await db.query(`INSERT INTO collections (service_id, collected_at, region_code, status,
      collection_interval_seconds, cpu_percent, memory_gb, disk_gb, network_gb, metrics, error_message,
      calculation_status, carbon_intensity_gco2e_per_kwh, power_watts, energy_kwh, co2e_grams, calculation_error_message)
    VALUES ($1, $2, 'br-sudeste', 'ok', 60, 10, 1, 1, 0.1, '{}'::jsonb, NULL, $3, $4, $5, $6, $7, $8)`,
  [reading.serviceId, reading.collectedAt, reading.calculationStatus,
    available ? '100' : null, '10', reading.energyKwh, reading.co2eGrams,
    available ? null : 'Fator de carbono indisponível']);
}

export interface ManualTotalsRow {
  id: string;
  collections: string;
  energy_kwh: string | null;
  co2e_grams: string | null;
}

/**
 * Oráculo do teste (#349): os totais por serviço escritos à mão aqui, sem passar pelo repository, para comparar com
 * `rankByPeriod`/`compareByIds`. Só os serviços deste teste entram, então os outros arquivos não interferem.
 */
export async function manualTotals(db: QueryExecutor, ids: string[], from: Date, to: Date): Promise<ManualTotalsRow[]> {
  return (await db.query<ManualTotalsRow>(`
    SELECT c.service_id::text AS id,
      COUNT(*)::text AS collections,
      (SUM(c.energy_kwh) FILTER (WHERE c.calculation_status = 'disponivel'))::text AS energy_kwh,
      (SUM(c.co2e_grams) FILTER (WHERE c.calculation_status = 'disponivel'))::text AS co2e_grams
    FROM collections AS c
    WHERE c.service_id = ANY($1::bigint[])
      AND c.collected_at >= $2 AND c.collected_at < $3
    GROUP BY c.service_id`, [ids, from, to])).rows;
}

/** Remove o que o teste criou: o banco é compartilhado e reaproveitado entre execuções. */
export async function clearPeriod(db: QueryExecutor, ids: string[]): Promise<void> {
  await db.query('DELETE FROM collections WHERE service_id = ANY($1::bigint[])', [ids]);
  await db.query('DELETE FROM services WHERE id = ANY($1::bigint[])', [ids]);
}
