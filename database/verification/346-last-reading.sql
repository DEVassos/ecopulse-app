\set ON_ERROR_STOP on
-- #346: execução manual; entrypoint não percorre verification/.
-- Somente banco exclusivo ecopulse_346, inicializado com schema.sql e sem serviços.
-- DDL e massa são revertidos; sequências IDENTITY podem avançar mesmo após ROLLBACK.
BEGIN;
DO $guard$
BEGIN
    IF current_database() <> 'ecopulse_346' OR EXISTS (SELECT 1 FROM services) THEN
        RAISE EXCEPTION 'Use banco isolado ecopulse_346 sem serviços; nenhum banco compartilhado';
    END IF;
END;
$guard$;
SELECT version();
SHOW enable_seqscan;
SHOW enable_indexscan;
SHOW enable_bitmapscan;
SHOW enable_incremental_sort;
INSERT INTO services (external_id, name)
SELECT 'verify-346-' || g, 'Serviço ' || g FROM generate_series(1, 8) AS g;
INSERT INTO collections (service_id, collected_at, status, collection_interval_seconds,
                         cpu_percent, memory_gb, disk_gb, network_gb)
SELECT s.id, timestamptz '2026-11-16T12:00:00Z' - g * interval '30 seconds',
       'ok', 30, 10.00, 100, 100, 100
FROM services AS s CROSS JOIN generate_series(1, 25000) AS g;
SELECT count(*) AS services FROM services;
SELECT count(*) AS collections, min(collected_at), max(collected_at) FROM collections;
SELECT service_id, count(*) FROM collections GROUP BY service_id ORDER BY service_id;
ANALYZE services;
ANALYZE collections;
-- SQL integral de ServiceRepository.findAllWithLastReading, sem parâmetros de período.
PREPARE last_reading_346 AS
SELECT s.id, s.name, s.status, s.country, s.region, s.city, s.region_code,
  latest.collected_at AS last_reading_at, latest.cpu_percent, latest.energy_kwh, latest.co2e_grams, latest.error_message,
  latest.collection_interval_seconds, latest.memory_gb, latest.disk_gb, latest.network_gb,
  latest.power_watts, latest.carbon_intensity_gco2e_per_kwh
FROM services AS s
LEFT JOIN LATERAL (
  SELECT collected_at, cpu_percent, energy_kwh, co2e_grams, error_message,
    collection_interval_seconds, memory_gb, disk_gb, network_gb, power_watts, carbon_intensity_gco2e_per_kwh
  FROM collections
  WHERE service_id = s.id
  ORDER BY collected_at DESC, id DESC
  LIMIT 1
) AS latest ON true
ORDER BY s.name ASC, s.id ASC;
\echo ANTES
-- Recriar a definição anterior permite repetir o protocolo depois da migração.
DROP INDEX public.collections_service_collected_at_idx;
CREATE INDEX collections_service_collected_at_idx ON public.collections (service_id, collected_at DESC);
SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'collections' ORDER BY indexname;
EXPLAIN (ANALYZE, BUFFERS) EXECUTE last_reading_346;
CREATE TEMP TABLE last_reading_before ON COMMIT DROP AS EXECUTE last_reading_346;
\echo DEPOIS
DROP INDEX public.collections_service_collected_at_idx;
CREATE INDEX collections_service_collected_at_idx ON public.collections (service_id, collected_at DESC, id DESC);
SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'collections' ORDER BY indexname;
EXPLAIN (ANALYZE, BUFFERS) EXECUTE last_reading_346;
CREATE TEMP TABLE last_reading_after ON COMMIT DROP AS EXECUTE last_reading_346;
DO $same_results$
BEGIN
    IF EXISTS ((TABLE last_reading_before EXCEPT ALL TABLE last_reading_after)
        UNION ALL (TABLE last_reading_after EXCEPT ALL TABLE last_reading_before)) THEN
        RAISE EXCEPTION 'O resultado mudou após substituir o índice';
    END IF;
END;
$same_results$;
-- Casos funcionais adicionais, fora da massa usada para medir os planos.
INSERT INTO services (external_id, name)
SELECT 'case-346-' || g, 'Caso 346 ' || g FROM generate_series(1, 4) AS g;
INSERT INTO collections (service_id, collected_at, status, collection_interval_seconds,
                         cpu_percent, memory_gb, disk_gb, network_gb)
SELECT s.id, v.at, 'ok', 30, v.cpu, 1, 1, 1
FROM (VALUES
    ('case-346-1', timestamptz '2026-11-16 12:00:00Z', 11),
    ('case-346-2', timestamptz '2026-11-16 11:00:00Z', 12),
    ('case-346-2', timestamptz '2026-11-16 12:00:00Z', 22),
    ('case-346-3', timestamptz '2026-11-16 12:00:00Z', 13),
    ('case-346-3', timestamptz '2026-11-16 12:00:00Z', 23)) AS v(code, at, cpu)
JOIN services s ON s.external_id = v.code
ORDER BY v.code, v.cpu;
CREATE TEMP TABLE last_reading_cases ON COMMIT DROP AS EXECUTE last_reading_346;
-- Conferir os mesmos casos com a definição antiga, além da massa medida.
DROP INDEX public.collections_service_collected_at_idx;
CREATE INDEX collections_service_collected_at_idx ON public.collections (service_id, collected_at DESC);
CREATE TEMP TABLE last_reading_cases_old ON COMMIT DROP AS EXECUTE last_reading_346;
DO $functional$
BEGIN
    IF EXISTS ((TABLE last_reading_cases EXCEPT ALL TABLE last_reading_cases_old)
        UNION ALL (TABLE last_reading_cases_old EXCEPT ALL TABLE last_reading_cases)) THEN
        RAISE EXCEPTION 'Os casos funcionais mudaram entre as definições do índice';
    END IF;
    IF (SELECT count(*) FROM last_reading_cases) <> 12
        OR (SELECT cpu_percent FROM last_reading_cases WHERE name = 'Caso 346 1') IS DISTINCT FROM 11
        OR (SELECT cpu_percent FROM last_reading_cases WHERE name = 'Caso 346 2') IS DISTINCT FROM 22
        OR (SELECT cpu_percent FROM last_reading_cases WHERE name = 'Caso 346 3') IS DISTINCT FROM 23
        OR NOT EXISTS (SELECT 1 FROM last_reading_cases WHERE name = 'Caso 346 4'
            AND last_reading_at IS NULL AND cpu_percent IS NULL AND energy_kwh IS NULL AND co2e_grams IS NULL) THEN
        RAISE EXCEPTION 'Falha: coleta única, última data, desempate por ID ou serviço sem coleta';
    END IF;
END;
$functional$;
\echo RESULTADOS_IGUAIS_E_CASOS_FUNCIONAIS_OK
DEALLOCATE last_reading_346;
ROLLBACK;
SELECT count(*) AS services_after_rollback FROM services;
SELECT count(*) AS collections_after_rollback FROM collections;
