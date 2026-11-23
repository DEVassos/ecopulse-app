-- #346: executar explicitamente em janela de manutenção; não remove coletas.
BEGIN;
SET LOCAL lock_timeout = '5s';
LOCK TABLE public.collections IN SHARE MODE;

DO $last_reading_index$
DECLARE
    current_definition text := pg_get_indexdef(to_regclass('public.collections_service_collected_at_idx'));
    old_definition constant text := 'CREATE INDEX collections_service_collected_at_idx ON public.collections USING btree (service_id, collected_at DESC)';
    new_definition constant text := 'CREATE INDEX collections_service_collected_at_idx ON public.collections USING btree (service_id, collected_at DESC, id DESC)';
BEGIN
    IF current_definition = new_definition THEN
        RETURN;
    END IF;
    IF current_definition IS NOT NULL AND current_definition <> old_definition THEN
        RAISE EXCEPTION 'Índice incompatível: inspecione collections_service_collected_at_idx; nenhuma alteração aplicada';
    END IF;
    IF current_definition = old_definition THEN
        DROP INDEX public.collections_service_collected_at_idx;
    END IF;
    CREATE INDEX collections_service_collected_at_idx
        ON public.collections (service_id, collected_at DESC, id DESC);
END;
$last_reading_index$;

COMMIT;
