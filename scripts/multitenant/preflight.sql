-- SOLO LECTURA. Ejecutar en el proyecto correcto con acceso administrativo.
-- No copiar resultados con PII al repositorio. Confirmar project ref fuera de SQL.

SELECT current_database() AS database_name, current_setting('server_version') AS postgres_version;

-- Identificación de cuentas: no decide a quién pertenece la cartera.
SELECT u.id AS auth_user_id, u.created_at AS auth_created_at,
       u.last_sign_in_at, p.id AS profile_id, p.role, p.created_at AS profile_created_at
FROM auth.users u LEFT JOIN public.profiles p ON p.id = u.id
ORDER BY u.created_at, u.id;

SELECT n.nspname AS schema_name, c.relname AS object_name, c.relkind,
       c.relrowsecurity, c.relforcerowsecurity
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname IN ('public','storage') AND c.relkind IN ('r','p','v','m')
ORDER BY n.nspname, c.relname;

SELECT table_name, column_name, data_type, is_nullable, column_default
FROM information_schema.columns WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;

SELECT schemaname, tablename, policyname, roles, cmd, qual, with_check
FROM pg_policies WHERE schemaname IN ('public','storage')
ORDER BY schemaname, tablename, policyname;

SELECT n.nspname, c.relname AS view_name,
       c.reloptions, pg_get_viewdef(c.oid, true) AS definition
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind = 'v'
ORDER BY c.relname;

SELECT c.conrelid::regclass::text AS table_name, c.conname, c.contype,
       pg_get_constraintdef(c.oid) AS definition
FROM pg_constraint c JOIN pg_namespace n ON n.oid = c.connamespace
WHERE n.nspname = 'public' ORDER BY table_name, c.conname;

SELECT t.tgrelid::regclass::text AS table_name, t.tgname,
       pg_get_triggerdef(t.oid) AS definition
FROM pg_trigger t
JOIN pg_class c ON c.oid = t.tgrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE NOT t.tgisinternal AND n.nspname = 'public'
ORDER BY table_name, t.tgname;

SELECT n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) AS arguments,
       p.prosecdef AS security_definer, p.proconfig AS settings,
       pg_get_functiondef(p.oid) AS definition
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' ORDER BY p.proname;

SELECT tablename, indexname, indexdef FROM pg_indexes WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- Conteos sin valores comerciales. Si falla una tabla, el esquema remoto difiere
-- y debe inventariarse antes de escribir la migración.
SELECT 'clientes' AS tabla, count(*) AS total,
       count(*) FILTER (WHERE deleted_at IS NULL) AS activos,
       count(*) FILTER (WHERE deleted_at IS NOT NULL) AS inactivos
FROM public.clientes
UNION ALL SELECT 'companias', count(*), count(*) FILTER (WHERE estado = 'ACTIVA'),
       count(*) FILTER (WHERE estado <> 'ACTIVA') FROM public.companias
UNION ALL SELECT 'ramos', count(*), NULL, NULL FROM public.ramos
UNION ALL SELECT 'polizas', count(*), count(*) FILTER (WHERE estado = 'VIGENTE'),
       count(*) FILTER (WHERE estado <> 'VIGENTE') FROM public.polizas
UNION ALL SELECT 'poliza_historial', count(*), NULL, NULL FROM public.poliza_historial
UNION ALL SELECT 'siniestros', count(*), NULL, NULL FROM public.siniestros
UNION ALL SELECT 'tareas', count(*), count(*) FILTER (WHERE estado <> 'FINALIZADA'),
       count(*) FILTER (WHERE estado = 'FINALIZADA') FROM public.tareas
UNION ALL SELECT 'actividad', count(*), NULL, NULL FROM public.actividad
UNION ALL SELECT 'app_settings', count(*), NULL, NULL FROM public.app_settings
UNION ALL SELECT 'profiles', count(*), NULL, NULL FROM public.profiles;

-- En Dashboard SQL Editor, comprobar Storage antes de usar storage.buckets.
SELECT to_regclass('storage.buckets') AS buckets_table,
       to_regclass('storage.objects') AS objects_table;
