BEGIN;

-- Inicialização somente: não converter silenciosamente um banco da versão anterior.
DO $schema_guard$
BEGIN
    IF to_regclass('collections') IS NOT NULL AND (
        EXISTS (SELECT 1 FROM pg_attribute
            WHERE attrelid = to_regclass('collections') AND NOT attisdropped
                AND attname IN ('memory_bytes', 'disk_bytes', 'network_bytes'))
        OR NOT EXISTS (SELECT 1 FROM pg_attribute
            WHERE attrelid = to_regclass('collections') AND NOT attisdropped
                AND attname = 'calculation_status')
        OR EXISTS (SELECT 1 FROM pg_attribute
            WHERE attrelid = to_regclass('collections') AND NOT attisdropped
                AND ((attname = 'energy_kwh'
                    AND format_type(atttypid, atttypmod) <> 'numeric(20,12)')
                OR (attname = 'co2e_grams'
                    AND format_type(atttypid, atttypmod) <> 'numeric(24,12)')))
    ) THEN
        RAISE EXCEPTION 'Schema anterior detectado: exige migração documentada de unidades ou precisão; dados preservados';
    END IF;
END;
$schema_guard$;

CREATE TABLE IF NOT EXISTS services (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    external_id text NOT NULL,
    name text NOT NULL,
    status text NOT NULL DEFAULT 'ativo',
    region_code text,
    country text,
    region text,
    city text,
    latitude numeric(8,6),
    longitude numeric(9,6),
    first_seen_at timestamptz NOT NULL DEFAULT now(),
    last_seen_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT services_external_id_unique UNIQUE (external_id),
    CONSTRAINT services_region_code_valid CHECK (
        region_code IS NULL OR btrim(region_code) <> ''
    ),
    CONSTRAINT services_status_valid CHECK (
        status IN ('ativo', 'indisponivel', 'sem_metricas', 'removido')
    ),
    CONSTRAINT services_latitude_valid CHECK (
        latitude IS NULL OR latitude BETWEEN -90 AND 90
    ),
    CONSTRAINT services_longitude_valid CHECK (
        longitude IS NULL OR longitude BETWEEN -180 AND 180
    ),
    CONSTRAINT services_last_seen_after_first_seen CHECK (
        last_seen_at IS NULL OR last_seen_at >= first_seen_at
    )
);

CREATE TABLE IF NOT EXISTS users (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    email text NOT NULL,
    password_hash text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT users_email_format_valid CHECK (
        email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    ),
    CONSTRAINT users_password_hash_bcrypt_valid CHECK (
        password_hash ~ '^\$2[aby]\$[0-9]{2}\$' AND char_length(password_hash) = 60
    )
);

CREATE TABLE IF NOT EXISTS collections (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    service_id bigint NOT NULL,
    collected_at timestamptz NOT NULL DEFAULT now(),
    status text NOT NULL DEFAULT 'ok',
    collection_interval_seconds integer,
    region_code text,
    cpu_percent numeric(5,2),
    memory_gb numeric(20,9),
    disk_gb numeric(20,9),
    network_gb numeric(20,9),
    calculation_status text NOT NULL DEFAULT 'nao_calculado',
    carbon_intensity_gco2e_per_kwh numeric(14,6),
    power_watts numeric(14,6),
    energy_kwh numeric(20,12),
    co2e_grams numeric(24,12),
    metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
    error_message text,
    calculation_error_message text,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT collections_service_fk FOREIGN KEY (service_id)
        REFERENCES services (id) ON DELETE RESTRICT,
    CONSTRAINT collections_status_valid CHECK (
        status IN ('ok', 'erro', 'sem_metricas')
    ),
    CONSTRAINT collections_cpu_percent_valid CHECK (
        cpu_percent IS NULL OR cpu_percent BETWEEN 0 AND 100
    ),
    CONSTRAINT collections_memory_gb_valid CHECK (
        memory_gb IS NULL OR (memory_gb >= 0 AND memory_gb < 'Infinity'::numeric)
    ),
    CONSTRAINT collections_disk_gb_valid CHECK (
        disk_gb IS NULL OR (disk_gb >= 0 AND disk_gb < 'Infinity'::numeric)
    ),
    CONSTRAINT collections_network_gb_valid CHECK (
        network_gb IS NULL OR (network_gb >= 0 AND network_gb < 'Infinity'::numeric)
    ),
    CONSTRAINT collections_power_watts_valid CHECK (
        power_watts IS NULL OR (power_watts >= 0 AND power_watts < 'Infinity'::numeric)
    ),
    CONSTRAINT collections_energy_kwh_valid CHECK (
        energy_kwh IS NULL OR (energy_kwh >= 0 AND energy_kwh < 'Infinity'::numeric)
    ),
    CONSTRAINT collections_co2e_grams_valid CHECK (
        co2e_grams IS NULL OR (co2e_grams >= 0 AND co2e_grams < 'Infinity'::numeric)
    ),
    CONSTRAINT collections_carbon_intensity_valid CHECK (
        carbon_intensity_gco2e_per_kwh IS NULL OR (
            carbon_intensity_gco2e_per_kwh >= 0
            AND carbon_intensity_gco2e_per_kwh < 'Infinity'::numeric
        )
    ),
    CONSTRAINT collections_region_code_valid CHECK (
        region_code IS NULL OR btrim(region_code) <> ''
    ),
    CONSTRAINT collections_metrics_state_valid CHECK (
        (status = 'ok' AND collection_interval_seconds IS NOT NULL
            AND collection_interval_seconds > 0
            AND cpu_percent IS NOT NULL AND memory_gb IS NOT NULL
            AND disk_gb IS NOT NULL AND network_gb IS NOT NULL
            AND error_message IS NULL)
        OR (status IN ('erro', 'sem_metricas')
            AND collection_interval_seconds IS NULL AND cpu_percent IS NULL
            AND memory_gb IS NULL AND disk_gb IS NULL AND network_gb IS NULL
            AND calculation_status = 'nao_calculado'
            AND (status <> 'erro' OR (error_message IS NOT NULL
                AND btrim(error_message) <> '')))
    ),
    CONSTRAINT collections_calculation_state_valid CHECK (
        (calculation_status = 'nao_calculado'
            AND carbon_intensity_gco2e_per_kwh IS NULL
            AND power_watts IS NULL AND energy_kwh IS NULL AND co2e_grams IS NULL
            AND calculation_error_message IS NULL)
        OR (calculation_status = 'disponivel' AND status = 'ok'
            AND region_code IS NOT NULL
            AND carbon_intensity_gco2e_per_kwh IS NOT NULL
            AND power_watts IS NOT NULL AND energy_kwh IS NOT NULL
            AND co2e_grams IS NOT NULL AND calculation_error_message IS NULL)
        OR (calculation_status = 'indisponivel' AND status = 'ok'
            AND carbon_intensity_gco2e_per_kwh IS NULL AND co2e_grams IS NULL
            AND ((power_watts IS NULL AND energy_kwh IS NULL)
                OR (power_watts IS NOT NULL AND energy_kwh IS NOT NULL))
            AND calculation_error_message IS NOT NULL
            AND btrim(calculation_error_message) <> '')
    ),
    CONSTRAINT collections_metrics_object_valid CHECK (
        jsonb_typeof(metrics) = 'object'
    )
);

CREATE TABLE IF NOT EXISTS access_entries (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ip_address inet NOT NULL,
    entered_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_unique
    ON users (lower(email));

CREATE INDEX IF NOT EXISTS collections_service_collected_at_idx
    ON collections (service_id, collected_at DESC);

CREATE INDEX IF NOT EXISTS collections_collected_at_idx
    ON collections (collected_at DESC);

CREATE INDEX IF NOT EXISTS access_entries_entered_at_idx
    ON access_entries (entered_at DESC);

COMMENT ON TABLE services IS 'Serviços descobertos no agregador de métricas.';
COMMENT ON COLUMN services.external_id IS 'Identificador estável recebido da API externa.';
COMMENT ON COLUMN services.status IS 'Estado atual do monitoramento do serviço.';
COMMENT ON COLUMN services.region_code IS 'Código regional recebido na descoberta; usado na consulta de carbono.';
COMMENT ON TABLE collections IS 'Histórico de coletas; política de somente inserção nos futuros repositories.';
COMMENT ON COLUMN collections.status IS 'Estado das métricas, independente da disponibilidade do cálculo.';
COMMENT ON COLUMN collections.calculation_status IS 'Cálculo não executado, disponível ou indisponível; não substitui o estado das métricas.';
COMMENT ON COLUMN collections.region_code IS 'Região da coleta preservada independentemente do cadastro atual do serviço.';
COMMENT ON COLUMN collections.collection_interval_seconds IS 'Intervalo positivo informado na resposta de métricas, em segundos.';
COMMENT ON COLUMN collections.carbon_intensity_gco2e_per_kwh IS 'Intensidade regional efetivamente utilizada, em gCO2e/kWh.';
COMMENT ON COLUMN collections.energy_kwh IS 'Energia em kWh com resolução de 1e-12; preservar intermediários completos antes da persistência.';
COMMENT ON COLUMN collections.co2e_grams IS 'Emissão em gCO2e com resolução de 1e-12; desconhecido permanece NULL.';
COMMENT ON COLUMN collections.metrics IS 'Resposta bruta de /metrics como objeto JSON; sem duplicação manual de resultados ou fatores.';
COMMENT ON COLUMN collections.memory_gb IS 'Memória em GB conforme contrato externo; não convertida para bytes ou GiB.';
COMMENT ON COLUMN collections.disk_gb IS 'Disco em GB conforme contrato externo.';
COMMENT ON COLUMN collections.network_gb IS 'Rede em GB conforme contrato externo; não presumir taxa por segundo.';
COMMENT ON TABLE users IS 'Usuários autorizados da área de configuração.';
COMMENT ON COLUMN users.password_hash IS 'Hash bcrypt da senha; nunca armazena senha em texto puro.';
COMMENT ON TABLE access_entries IS 'IP e instante de entrada por sessão de navegação em uma aba; fluxo ainda não implementado.';
COMMENT ON COLUMN access_entries.ip_address IS 'IP observado pelo backend considerando somente proxies confiáveis.';
COMMENT ON COLUMN access_entries.entered_at IS 'Instante definido pelo servidor; polling e worker não representam entradas.';

COMMIT;
