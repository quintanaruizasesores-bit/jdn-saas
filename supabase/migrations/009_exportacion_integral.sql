-- Solo lectura. Autorización adicional en el endpoint: sesión ADMIN + allowlist.
-- No aplica cambios a datos, tablas ni políticas existentes.
BEGIN;

CREATE FUNCTION public.exportacion_json_seguro(valor jsonb)
RETURNS jsonb LANGUAGE plpgsql IMMUTABLE SECURITY INVOKER SET search_path=pg_catalog AS $$
BEGIN
  IF jsonb_typeof(valor)='object' THEN
    RETURN (SELECT coalesce(jsonb_object_agg(key, CASE
      WHEN key ~* '(password|passwd|secret|token|private.?key|api.?key|credential|authorization|jwt|connection_string|database_url)'
      THEN '"[EXCLUIDO POR SEGURIDAD]"'::jsonb
      ELSE public.exportacion_json_seguro(value) END),'{}'::jsonb) FROM jsonb_each(valor));
  ELSIF jsonb_typeof(valor)='array' THEN
    RETURN (SELECT coalesce(jsonb_agg(public.exportacion_json_seguro(value) ORDER BY ord),'[]'::jsonb)
      FROM jsonb_array_elements(valor) WITH ORDINALITY AS a(value,ord));
  END IF;
  RETURN valor;
END;
$$;

CREATE FUNCTION public.exportacion_catalogo()
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog AS $$
DECLARE
  t record; n bigint; huella text; tablas jsonb := '[]'; columnas jsonb;
  conocidas text[] := ARRAY['profiles','clientes','companias','ramos','polizas',
    'poliza_historial','siniestros','tareas','actividad','app_settings'];
BEGIN
  FOR t IN SELECT c.relname, c.oid FROM pg_class c
    JOIN pg_namespace s ON s.oid=c.relnamespace
    WHERE s.nspname='public' AND c.relkind IN ('r','p') ORDER BY c.relname
  LOOP
    IF NOT t.relname = ANY(conocidas) THEN
      RAISE EXCEPTION 'Tabla sin revisar para exportación: %', t.relname;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_attribute a WHERE a.attrelid=t.oid
        AND a.attnum>0 AND NOT a.attisdropped
        AND a.attname=ANY(ARRAY['tenant_id','organization_id','workspace_id'])) THEN
      RAISE EXCEPTION 'El esquema incorpora aislamiento; revisar el alcance de exportación: %',t.relname;
    END IF;
    SELECT jsonb_agg(jsonb_build_object('nombre',a.attname,
      'tipo',format_type(a.atttypid,a.atttypmod),
      'nullable',NOT a.attnotnull,
      'excluida',a.attname ~* '(password|passwd|secret|token|private.?key|api.?key|credential|authorization|jwt|connection_string|database_url)')
      ORDER BY a.attnum)
    INTO columnas FROM pg_attribute a
    WHERE a.attrelid=t.oid AND a.attnum>0 AND NOT a.attisdropped;
    EXECUTE format('SELECT count(*), md5(coalesce(string_agg(h, %L ORDER BY h), %L))
      FROM (SELECT md5(to_jsonb(x)::text) h FROM public.%I x) s', '', '', t.relname)
      INTO n,huella;
    tablas := tablas || jsonb_build_array(jsonb_build_object('tabla',t.relname,
      'registros',n::text,'huella',huella,'columnas',columnas));
  END LOOP;
  RETURN jsonb_build_object('tablas',tablas,'relaciones',(
    SELECT jsonb_agg(jsonb_build_object('tabla',c.conrelid::regclass::text,
      'nombre',c.conname,'definicion',pg_get_constraintdef(c.oid)) ORDER BY c.conrelid::regclass::text,c.conname)
    FROM pg_constraint c JOIN pg_namespace s ON s.oid=c.connamespace
    WHERE s.nspname='public' AND c.contype IN ('p','f','u','c')));
END;
$$;

CREATE FUNCTION public.exportacion_lote(tabla text, despues text DEFAULT NULL, cantidad integer DEFAULT 500)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog AS $$
DECLARE clave text; columnas text; resultado jsonb; comparacion text; orden text;
BEGIN
  IF NOT tabla = ANY(ARRAY['profiles','clientes','companias','ramos','polizas',
      'poliza_historial','siniestros','tareas','actividad','app_settings'])
     OR cantidad NOT BETWEEN 1 AND 1000 THEN
    RAISE EXCEPTION 'Parámetros de exportación inválidos';
  END IF;
  clave := CASE WHEN tabla='app_settings' THEN 'key' ELSE 'id' END;
  -- UUID nativo conserva el orden léxico de su representación y permite usar
  -- el índice PK. Solo app_settings necesita colación C para su clave textual.
  comparacion := CASE WHEN tabla='app_settings'
    THEN '($1 IS NULL OR key::text COLLATE "C" > $1 COLLATE "C")'
    ELSE '($1 IS NULL OR id > $1::uuid)' END;
  orden := CASE WHEN tabla='app_settings' THEN 'key::text COLLATE "C"' ELSE 'id' END;
  -- Cada valor SQL se serializa como texto, incluidos numeric y JSONB: no pasa
  -- por double de JavaScript. NULL permanece NULL. Los secretos se excluyen.
  SELECT string_agg(CASE WHEN tabla='app_settings' AND a.attname='value'
    THEN format('%L, CASE WHEN x.key ~* %L THEN %L ELSE public.exportacion_json_seguro(x.%I::jsonb)::text END',a.attname,
      '(password|passwd|secret|token|private.?key|api.?key|credential|authorization|jwt|connection_string|database_url)',
      '"[EXCLUIDO POR SEGURIDAD]"',a.attname)
    WHEN a.atttypid IN ('json'::regtype,'jsonb'::regtype)
    THEN format('%L, public.exportacion_json_seguro(x.%I::jsonb)::text',a.attname,a.attname)
    ELSE format('%L, x.%I::text',a.attname,a.attname) END,', ' ORDER BY a.attnum)
    INTO columnas FROM pg_attribute a
    WHERE a.attrelid=format('public.%I',tabla)::regclass
      AND a.attnum>0 AND NOT a.attisdropped
      AND a.attname !~* '(password|passwd|secret|token|private.?key|api.?key|credential|authorization|jwt|connection_string|database_url)';
  EXECUTE format('SELECT coalesce(jsonb_agg(jsonb_build_object(%s) ORDER BY x.%I::text COLLATE "C"), ''[]''::jsonb)
    FROM (SELECT * FROM public.%I WHERE %s ORDER BY %s LIMIT $2) x',columnas,clave,tabla,comparacion,orden)
    USING despues,cantidad INTO resultado;
  RETURN resultado;
END;
$$;

REVOKE ALL ON FUNCTION public.exportacion_catalogo() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.exportacion_json_seguro(jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.exportacion_lote(text,text,integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.exportacion_catalogo() TO service_role;
GRANT EXECUTE ON FUNCTION public.exportacion_json_seguro(jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.exportacion_lote(text,text,integer) TO service_role;
COMMENT ON FUNCTION public.exportacion_catalogo() IS 'Inventario real y huellas para copia de datos Excel; solo servidor autorizado, no respaldo PostgreSQL restaurable.';
COMMIT;
