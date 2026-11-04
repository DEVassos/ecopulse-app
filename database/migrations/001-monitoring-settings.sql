-- #250: evolução aditiva; sem registro inicial para preservar updatedAt=null antes do primeiro PUT.
BEGIN;

DO $monitoring_settings_guard$
DECLARE
    target regclass := to_regclass('public.monitoring_settings');
    columns_signature text[];
BEGIN
    IF target IS NOT NULL THEN
        SELECT array_agg(attname || ':' || format_type(atttypid, atttypmod) || ':' || attnotnull ORDER BY attnum)
          INTO columns_signature FROM pg_attribute
          WHERE attrelid = target AND attnum > 0 AND NOT attisdropped;
        IF (SELECT relkind FROM pg_class WHERE oid = target) <> 'r'
            OR columns_signature IS DISTINCT FROM ARRAY[
                'id:smallint:true', 'refresh_interval_seconds:integer:true', 'updated_at:timestamp with time zone:true']
            OR EXISTS (SELECT 1 FROM pg_attribute WHERE attrelid = target AND (attidentity <> '' OR attgenerated <> ''))
            OR (SELECT count(*) FROM pg_attrdef WHERE adrelid = target) <> 1
            OR NOT EXISTS (SELECT 1 FROM pg_attrdef d JOIN pg_attribute a
                ON a.attrelid = d.adrelid AND a.attnum = d.adnum
                WHERE d.adrelid = target AND a.attname = 'updated_at' AND pg_get_expr(d.adbin, d.adrelid) = 'now()')
            OR (SELECT count(*) FROM pg_constraint WHERE conrelid = target) <> 3
            OR NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = target AND contype = 'p' AND NOT condeferrable AND conkey = ARRAY[1]::smallint[])
            OR NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = target AND contype = 'c' AND convalidated
                AND regexp_replace(pg_get_expr(conbin, conrelid), '[[:space:]()]', '', 'g') = 'id=1')
            OR NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = target AND contype = 'c' AND convalidated
                AND regexp_replace(pg_get_expr(conbin, conrelid), '[[:space:]()]', '', 'g') = 'refresh_interval_seconds=ANYARRAY[15,30,60]') THEN
            RAISE EXCEPTION 'monitoring_settings incompatível: inspecione a estrutura existente; dados preservados';
        END IF;
    END IF;
END;
$monitoring_settings_guard$;

CREATE TABLE IF NOT EXISTS public.monitoring_settings (
    id smallint PRIMARY KEY,
    refresh_interval_seconds integer NOT NULL,
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT monitoring_settings_singleton CHECK (id = 1),
    CONSTRAINT monitoring_settings_interval_valid CHECK (refresh_interval_seconds IN (15, 30, 60))
);

COMMIT;
