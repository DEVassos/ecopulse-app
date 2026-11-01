# Verificação reproduzível do schema

Roteiro usado na revisão da integração do schema (#5/#28/#44, PR #77, 08/10/2026), antes de existirem backend e worker. Use exclusivamente PostgreSQL descartável. Não executar estes dados de teste em banco do usuário. As consultas abaixo são fixtures de verificação do DDL, não DML da aplicação; a DML futura ficará nos repositories parametrizados.

## Ambiente e execução

PostgreSQL 16 em Docker, sem portas/rede e com volume anônimo removido junto com o container criado pelo roteiro. Bash abaixo deve rodar em uma única sessão WSL para manter o Docker ativo; os checks do Agilekit continuam no Git Bash do Windows. O script só para o container cujo ID ele criou; não altera postgres-aula, volumes existentes ou configurações globais.

Os scripts `tests/run-validation.sh` e `tests/schema-validation.sql` não estão versionados no repositório: são extraídos dos blocos abaixo, que os reproduzem por inteiro. Em Git Bash no Windows, na raiz extraída do pacote, execute:

```bash
review_windows_path="$(pwd -W)"
review_wsl_path="$(wsl --exec wslpath -u "$review_windows_path" | tr -d '\r')"
wsl --exec bash "$review_wsl_path/tests/run-validation.sh" "$review_wsl_path/database/schema.sql" "$review_wsl_path/tests/schema-validation.sql"
```

Pré-requisitos: Docker no WSL ativo e imagem postgres:16 disponível. Sem Docker Desktop neste ambiente. Saída esperada: PASS para cenários, 27 rejeições esperadas, energia pequena preservada, agregações, precisão, nove índices e recusa da escala anterior. Um erro do guard na simulação da escala antiga é esperado; não é falha do roteiro.

## Executor isolado

```bash
#!/usr/bin/env bash
set -euo pipefail
schema="${1:?Informe caminho do schema}"
tests="${2:?Informe caminho do teste}"
container_name="ecopulse-final-review-$$-$(date +%s)"
container_id=""
cleanup() {
  if [ -n "$container_id" ]; then docker stop "$container_id" >/dev/null 2>&1 || true; fi
}
trap cleanup EXIT
container_id=$(docker run --detach --rm --name "$container_name" --network none -e POSTGRES_HOST_AUTH_METHOD=trust postgres:16)
ready=0
for attempt in $(seq 1 60); do
  if docker exec "$container_id" pg_isready -U postgres >/dev/null 2>&1; then ready=1; break; fi
  sleep 1
done
if [ "$ready" -ne 1 ]; then docker logs "$container_id"; exit 1; fi
docker exec "$container_id" psql -U postgres -At -c 'SELECT version();'
docker exec -i "$container_id" psql -U postgres -v ON_ERROR_STOP=1 < "$schema"
docker exec -i "$container_id" psql -U postgres -q -v ON_ERROR_STOP=1 < "$tests"
docker exec "$container_id" psql -U postgres -v ON_ERROR_STOP=1 -c "INSERT INTO services(external_id,name) VALUES ('reapply-test','Reapply test');"
docker exec -i "$container_id" psql -U postgres -q -v ON_ERROR_STOP=1 < "$schema"
docker exec "$container_id" psql -U postgres -v ON_ERROR_STOP=1 -c "DO \$\$ BEGIN IF (SELECT count(*) FROM services WHERE external_id='reapply-test') <> 1 THEN RAISE EXCEPTION 'Reapplication lost data'; END IF; END \$\$;"
docker exec "$container_id" createdb -U postgres prior_scale
# Simula a revisão em GB com escala seis, somente no container isolado.
sed -e 's/energy_kwh numeric(20,12)/energy_kwh numeric(14,6)/' -e 's/co2e_grams numeric(24,12)/co2e_grams numeric(14,6)/' "$schema" | docker exec -i "$container_id" psql -U postgres -d prior_scale -q -v ON_ERROR_STOP=1
if docker exec -i "$container_id" psql -U postgres -d prior_scale -q -v ON_ERROR_STOP=1 < "$schema"; then
  echo 'FAIL: guard accepted prior scale'; exit 1
fi
docker exec "$container_id" psql -U postgres -d prior_scale -v ON_ERROR_STOP=1 -c "DO \$\$ BEGIN IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='collections' AND column_name='energy_kwh' AND numeric_precision=14 AND numeric_scale=6) THEN RAISE EXCEPTION 'Prior schema changed unexpectedly'; END IF; END \$\$;"
docker exec "$container_id" psql -U postgres -c "SELECT t.relname AS table_name, idx.relname AS index_name, COALESCE(c.contype::text,'explicit') AS origin FROM pg_index i JOIN pg_class t ON t.oid=i.indrelid JOIN pg_class idx ON idx.oid=i.indexrelid LEFT JOIN pg_constraint c ON c.conindid=i.indexrelid AND c.contype IN ('p','u') WHERE t.relnamespace='public'::regnamespace ORDER BY table_name,index_name;"
echo 'PASS: same-schema reapplication and prior-scale refusal; disposable container cleanup follows'
```

## Casos de teste SQL

O teste usa transação com rollback; sete cenários válidos e 25 inconsistências estruturais do schema, mais dois overflows, esperam SQLSTATE específico. Acrescenta 1.000 coletas pequenas por fator regional e 1.000 coletas do exemplo oficial. Confira cada asserção no script; não são testes de autenticação, deduplicação de entrada ou precisão universal.

```sql
BEGIN;
CREATE FUNCTION pg_temp.insert_reading(changes jsonb DEFAULT '{}'::jsonb)
RETURNS bigint LANGUAGE plpgsql AS $$
DECLARE reading collections; inserted bigint;
BEGIN
 SELECT * INTO reading FROM jsonb_populate_record(NULL::collections,
 '{"status":"ok","collection_interval_seconds":27,"cpu_percent":62.67,"memory_gb":3.17,"disk_gb":19.26,"network_gb":0.45,"region_code":"br-sudeste","calculation_status":"nao_calculado","metrics":{}}'::jsonb || changes);
 INSERT INTO collections (service_id,status,collection_interval_seconds,region_code,cpu_percent,memory_gb,disk_gb,network_gb,calculation_status,carbon_intensity_gco2e_per_kwh,power_watts,energy_kwh,co2e_grams,metrics,error_message,calculation_error_message)
 VALUES (COALESCE(reading.service_id,current_setting('test.service_id')::bigint),reading.status,reading.collection_interval_seconds,reading.region_code,reading.cpu_percent,reading.memory_gb,reading.disk_gb,reading.network_gb,reading.calculation_status,reading.carbon_intensity_gco2e_per_kwh,reading.power_watts,reading.energy_kwh,reading.co2e_grams,reading.metrics,reading.error_message,reading.calculation_error_message) RETURNING id INTO inserted;
 RETURN inserted;
END $$;
CREATE FUNCTION pg_temp.expect_failure(query text, expected_state text)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE observed text;
BEGIN
 BEGIN EXECUTE query; EXCEPTION WHEN OTHERS THEN GET STACKED DIAGNOSTICS observed = RETURNED_SQLSTATE; END;
 IF observed IS DISTINCT FROM expected_state THEN RAISE EXCEPTION 'Expected SQLSTATE %, got % for %', expected_state, observed, query; END IF;
 PERFORM set_config('test.failure_count',(current_setting('test.failure_count')::integer + 1)::text,true);
END $$;
INSERT INTO services(external_id,name,region_code) VALUES ('validation-only','Validation','br-sudeste');
SELECT set_config('test.service_id',(SELECT id::text FROM services WHERE external_id='validation-only'),true);
SELECT set_config('test.failure_count','0',true);
SELECT pg_temp.insert_reading();
SELECT pg_temp.insert_reading('{"calculation_status":"disponivel","carbon_intensity_gco2e_per_kwh":85,"power_watts":64.06035,"energy_kwh":0.000480452625,"co2e_grams":0.040838473125}');
SELECT pg_temp.insert_reading('{"calculation_status":"indisponivel","calculation_error_message":"carbon unavailable"}');
SELECT pg_temp.insert_reading('{"calculation_status":"indisponivel","calculation_error_message":"carbon unavailable","power_watts":64.06035,"energy_kwh":0.000480452625}');
SELECT pg_temp.insert_reading('{"cpu_percent":0,"memory_gb":0,"disk_gb":0,"network_gb":0}');
SELECT pg_temp.insert_reading('{"status":"erro","error_message":"metrics unavailable","cpu_percent":null,"memory_gb":null,"disk_gb":null,"network_gb":null,"collection_interval_seconds":null}');
SELECT pg_temp.insert_reading('{"status":"sem_metricas","cpu_percent":null,"memory_gb":null,"disk_gb":null,"network_gb":null,"collection_interval_seconds":null}');
SELECT pg_temp.expect_failure($q$SELECT pg_temp.insert_reading('{"cpu_percent":null}')$q$,'23514');
SELECT pg_temp.expect_failure($q$SELECT pg_temp.insert_reading('{"memory_gb":null}')$q$,'23514');
SELECT pg_temp.expect_failure($q$SELECT pg_temp.insert_reading('{"collection_interval_seconds":null}')$q$,'23514');
SELECT pg_temp.expect_failure($q$SELECT pg_temp.insert_reading('{"collection_interval_seconds":0}')$q$,'23514');
SELECT pg_temp.expect_failure($q$SELECT pg_temp.insert_reading('{"collection_interval_seconds":-1}')$q$,'23514');
SELECT pg_temp.expect_failure($q$SELECT pg_temp.insert_reading('{"cpu_percent":101}')$q$,'23514');
SELECT pg_temp.expect_failure($q$SELECT pg_temp.insert_reading('{"memory_gb":-1}')$q$,'23514');
SELECT pg_temp.expect_failure($q$SELECT pg_temp.insert_reading('{"memory_gb":"NaN"}')$q$,'23514');
SELECT pg_temp.expect_failure($q$SELECT pg_temp.insert_reading('{"calculation_status":"unexpected"}')$q$,'23514');
SELECT pg_temp.expect_failure($q$SELECT pg_temp.insert_reading('{"co2e_grams":0}')$q$,'23514');
SELECT pg_temp.expect_failure($q$SELECT pg_temp.insert_reading('{"calculation_status":"disponivel"}')$q$,'23514');
SELECT pg_temp.expect_failure($q$SELECT pg_temp.insert_reading('{"calculation_status":"indisponivel"}')$q$,'23514');
SELECT pg_temp.expect_failure($q$SELECT pg_temp.insert_reading('{"calculation_status":"indisponivel","calculation_error_message":"carbon unavailable","power_watts":1}')$q$,'23514');
SELECT pg_temp.expect_failure($q$SELECT pg_temp.insert_reading('{"calculation_status":"indisponivel","calculation_error_message":"carbon unavailable","co2e_grams":0}')$q$,'23514');
SELECT pg_temp.expect_failure($q$SELECT pg_temp.insert_reading('{"error_message":"unexpected metrics error"}')$q$,'23514');
SELECT pg_temp.expect_failure($q$SELECT pg_temp.insert_reading('{"status":"erro","cpu_percent":null,"memory_gb":null,"disk_gb":null,"network_gb":null,"collection_interval_seconds":null}')$q$,'23514');
SELECT pg_temp.expect_failure($q$SELECT pg_temp.insert_reading('{"status":"sem_metricas"}')$q$,'23514');
SELECT pg_temp.expect_failure($q$SELECT pg_temp.insert_reading('{"metrics":[]}')$q$,'23514');
SELECT pg_temp.expect_failure($q$SELECT pg_temp.insert_reading('{"service_id":9223372036854775807}')$q$,'23503');
SELECT pg_temp.expect_failure($q$DELETE FROM services WHERE external_id='validation-only'$q$,'23503');
SELECT pg_temp.expect_failure($q$INSERT INTO services(external_id,name) VALUES('validation-only','duplicate')$q$,'23505');
SELECT pg_temp.expect_failure($q$INSERT INTO services(external_id,name,latitude) VALUES('invalid-latitude','bad',91)$q$,'23514');
SELECT pg_temp.expect_failure($q$INSERT INTO services(external_id,name,region_code) VALUES('invalid-region','bad',' ')$q$,'23514');
INSERT INTO access_entries(ip_address) VALUES ('127.0.0.1'),('::1');
SELECT pg_temp.expect_failure($q$INSERT INTO access_entries(ip_address) VALUES(NULL)$q$,'23502');
SELECT pg_temp.expect_failure($q$INSERT INTO access_entries(ip_address) VALUES('not-an-ip')$q$,'22P02');
DO $$ DECLARE emission numeric; BEGIN
 SELECT co2e_grams INTO emission FROM collections WHERE calculation_status='disponivel';
 IF emission IS DISTINCT FROM 0.040838473125::numeric THEN RAISE EXCEPTION 'Emission precision mismatch'; END IF;
 IF (SELECT energy_kwh FROM collections WHERE calculation_status='disponivel') IS DISTINCT FROM 0.000480452625::numeric THEN RAISE EXCEPTION 'Energy precision mismatch'; END IF;
 IF (50.87::numeric*60/3600000)::numeric(20,12) <> 0.000847833333 THEN RAISE EXCEPTION 'Official example precision mismatch'; END IF;
 IF (0.02::numeric*27/3600000)::numeric(20,12) <> 0.000000150000 THEN RAISE EXCEPTION 'Small load precision mismatch'; END IF;
 IF (SELECT count(*) FROM collections) <> 7 THEN RAISE EXCEPTION 'Positive row count mismatch'; END IF;
 IF EXISTS(SELECT 1 FROM access_entries WHERE entered_at IS NULL) THEN RAISE EXCEPTION 'Server time missing'; END IF;
END $$;
UPDATE services SET region_code='eu-west' WHERE external_id='validation-only';
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM collections WHERE region_code IS DISTINCT FROM 'br-sudeste') THEN RAISE EXCEPTION 'Historical region lost'; END IF;
END $$;

DO $$ DECLARE i integer; actual_energy numeric; actual_emission numeric; BEGIN
 FOR i IN 1..1000 LOOP
  PERFORM pg_temp.insert_reading('{"cpu_percent":0,"memory_gb":0,"disk_gb":0,"network_gb":1,"calculation_status":"disponivel","carbon_intensity_gco2e_per_kwh":85,"power_watts":0.02,"energy_kwh":0.00000015,"co2e_grams":0.00001275}');
  PERFORM pg_temp.insert_reading('{"cpu_percent":0,"memory_gb":0,"disk_gb":0,"network_gb":1,"calculation_status":"disponivel","carbon_intensity_gco2e_per_kwh":0.1,"power_watts":0.02,"energy_kwh":0.00000015,"co2e_grams":0.000000015}');
  PERFORM pg_temp.insert_reading(jsonb_build_object('cpu_percent',50,'memory_gb',2,'disk_gb',10,'network_gb',1,'collection_interval_seconds',60,'calculation_status','disponivel','carbon_intensity_gco2e_per_kwh',85,'power_watts',50.87,'energy_kwh',50.87::numeric*60/3600000,'co2e_grams',50.87::numeric*60/3600000*85));
 END LOOP;
 SELECT sum(energy_kwh),sum(co2e_grams) INTO actual_energy,actual_emission
 FROM collections WHERE cpu_percent=0 AND network_gb=1 AND carbon_intensity_gco2e_per_kwh=85;
 IF actual_energy IS DISTINCT FROM 0.00015::numeric OR actual_emission IS DISTINCT FROM 0.01275::numeric THEN RAISE EXCEPTION 'Small-load aggregation mismatch'; END IF;
 SELECT sum(energy_kwh),sum(co2e_grams) INTO actual_energy,actual_emission
 FROM collections WHERE cpu_percent=0 AND network_gb=1 AND carbon_intensity_gco2e_per_kwh=0.1;
 IF actual_energy IS DISTINCT FROM 0.00015::numeric OR actual_emission IS DISTINCT FROM 0.000015::numeric THEN RAISE EXCEPTION 'Low-carbon aggregation mismatch'; END IF;
 SELECT sum(energy_kwh) INTO actual_energy FROM collections WHERE cpu_percent=50;
 IF actual_energy IS DISTINCT FROM 0.847833333::numeric THEN RAISE EXCEPTION 'Periodic aggregation mismatch'; END IF;
 IF abs(actual_energy - 1000*(50.87::numeric*60/3600000)) > 1000*0.0000000000005 THEN RAISE EXCEPTION 'Storage error exceeds bound'; END IF;
 IF (SELECT count(*) FROM collections) <> 3007 THEN RAISE EXCEPTION 'Unexpected final row count'; END IF;
 IF 0.000000000001::numeric(20,12) <> 0.000000000001 THEN RAISE EXCEPTION 'Energy resolution mismatch'; END IF;
 IF 0.000000000001::numeric(24,12) <> 0.000000000001 THEN RAISE EXCEPTION 'Emission resolution mismatch'; END IF;
 IF 99999999.999999999999::numeric(20,12) <> 99999999.999999999999 THEN RAISE EXCEPTION 'Energy upper bound mismatch'; END IF;
 IF 999999999999.999999999999::numeric(24,12) <> 999999999999.999999999999 THEN RAISE EXCEPTION 'Emission upper bound mismatch'; END IF;
END $$;
SELECT pg_temp.expect_failure('SELECT 100000000::numeric(20,12)','22003');
SELECT pg_temp.expect_failure('SELECT 1000000000000::numeric(24,12)','22003');
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='collections' AND column_name='energy_kwh' AND numeric_precision=20 AND numeric_scale=12) THEN RAISE EXCEPTION 'Energy schema type mismatch'; END IF;
 IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='collections' AND column_name='co2e_grams' AND numeric_precision=24 AND numeric_scale=12) THEN RAISE EXCEPTION 'Emission schema type mismatch'; END IF;
 IF (SELECT count(*) FROM pg_index i JOIN pg_class t ON t.oid=i.indrelid WHERE t.relnamespace='public'::regnamespace AND t.relname IN ('services','collections','users','access_entries')) <> 9 THEN RAISE EXCEPTION 'Total index count mismatch'; END IF;
 IF (SELECT count(*) FROM pg_index i JOIN pg_class t ON t.oid=i.indrelid LEFT JOIN pg_constraint c ON c.conindid=i.indexrelid AND c.contype IN ('p','u') WHERE t.relnamespace='public'::regnamespace AND t.relname IN ('services','collections','users','access_entries') AND c.oid IS NULL) <> 4 THEN RAISE EXCEPTION 'Explicit index count mismatch'; END IF;
END $$;
SELECT carbon_intensity_gco2e_per_kwh, count(*) AS samples, min(energy_kwh) AS smallest_energy, sum(energy_kwh) AS total_kwh, sum(co2e_grams) AS total_grams
FROM collections WHERE cpu_percent=0 AND network_gb=1 AND calculation_status='disponivel' GROUP BY carbon_intensity_gco2e_per_kwh ORDER BY carbon_intensity_gco2e_per_kwh;
SELECT 'PASS: 7 valid scenarios + 3000 small/periodic samples; 27 expected rejections; preserved positive energy/emission; bounds and 9 indexes (4 explicit + 5 automatic)' AS result;
SELECT current_setting('test.failure_count') AS verified_negative_cases;

ROLLBACK;
```
