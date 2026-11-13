-- Fase 1 de multi-tenancy: crear workspace y asociar la cartera existente.
-- Ejecutar como una sola migración, en ventana sin escrituras y solo después de
-- backup/restauración ensayados. No activa RLS tenant-aware: 013 lo hace tras
-- desplegar la aplicación compatible.
BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = '91774808-af9f-453d-8279-02a28e93b1b2')
     OR NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = '91774808-af9f-453d-8279-02a28e93b1b2') THEN
    RAISE EXCEPTION 'Propietario histórico no coincide con auth.users y profiles; abortando';
  END IF;
  IF (SELECT count(*) FROM auth.users) <> 1 THEN
    RAISE EXCEPTION 'Cambió el inventario de usuarios; revisar el mapeo antes de continuar';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name IN
      ('clientes','companias','ramos','polizas','poliza_historial','siniestros','tareas','actividad','app_settings')
      AND column_name IN ('workspace_id','tenant_id','organization_id')) THEN
    RAISE EXCEPTION 'Ya hay columnas de tenant/workspace; revisar el esquema antes de continuar';
  END IF;
END $$;

CREATE TABLE public.workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE RESTRICT,
  nombre text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
CREATE POLICY workspaces_owner_read ON public.workspaces FOR SELECT TO authenticated
  USING (owner_user_id = (SELECT auth.uid()));

INSERT INTO public.workspaces(owner_user_id,nombre)
SELECT id, COALESCE(NULLIF(nombre,''),'Mi cartera') FROM public.profiles
WHERE id='91774808-af9f-453d-8279-02a28e93b1b2';

CREATE OR REPLACE FUNCTION public.create_user_workspace()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  INSERT INTO public.workspaces(owner_user_id,nombre)
  VALUES (NEW.id,COALESCE(NULLIF(NEW.nombre,''),'Mi cartera'))
  ON CONFLICT(owner_user_id) DO NOTHING;
  RETURN NEW;
END $$;
CREATE TRIGGER tr_profile_create_workspace AFTER INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.create_user_workspace();

ALTER TABLE public.clientes ADD COLUMN workspace_id uuid;
ALTER TABLE public.companias ADD COLUMN workspace_id uuid;
ALTER TABLE public.ramos ADD COLUMN workspace_id uuid;
ALTER TABLE public.polizas ADD COLUMN workspace_id uuid;
ALTER TABLE public.poliza_historial ADD COLUMN workspace_id uuid;
ALTER TABLE public.siniestros ADD COLUMN workspace_id uuid;
ALTER TABLE public.tareas ADD COLUMN workspace_id uuid;
ALTER TABLE public.actividad ADD COLUMN workspace_id uuid;
ALTER TABLE public.app_settings ADD COLUMN workspace_id uuid;

-- Desactivar solo los triggers de updated_at de las tablas cuyo timestamp debe
-- permanecer literalmente igual durante el backfill; la transacción garantiza
-- que cualquier fallo los vuelve a habilitar al rollback.
ALTER TABLE public.clientes DISABLE TRIGGER tr_clientes_updated_at;
ALTER TABLE public.polizas DISABLE TRIGGER tr_polizas_updated_at;
ALTER TABLE public.tareas DISABLE TRIGGER tr_tareas_updated_at;
ALTER TABLE public.app_settings DISABLE TRIGGER tr_app_settings_updated_at;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['clientes','companias','ramos','polizas','poliza_historial','siniestros','tareas','actividad','app_settings'] LOOP
    EXECUTE format('UPDATE public.%I SET workspace_id=(SELECT id FROM public.workspaces WHERE owner_user_id=%L::uuid) WHERE workspace_id IS NULL', t, '91774808-af9f-453d-8279-02a28e93b1b2');
    EXECUTE format('ALTER TABLE public.%I ENABLE TRIGGER USER', t);
  END LOOP;
END $$;

ALTER TABLE public.workspaces ADD CONSTRAINT workspaces_id_owner_unique UNIQUE(id,owner_user_id);
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['clientes','companias','ramos','polizas','poliza_historial','siniestros','tareas','actividad','app_settings'] LOOP
    EXECUTE format('ALTER TABLE public.%I ALTER COLUMN workspace_id SET NOT NULL',t);
    EXECUTE format('ALTER TABLE public.%I ADD CONSTRAINT %I FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE',t,t||'_workspace_id_fkey');
    EXECUTE format('CREATE INDEX %I ON public.%I(workspace_id)', 'idx_'||t||'_workspace_id',t);
  END LOOP;
END $$;

-- Settings become unique per workspace. Existing birthday key and value stay intact.
ALTER TABLE public.app_settings DROP CONSTRAINT app_settings_pkey;
ALTER TABLE public.app_settings ADD CONSTRAINT app_settings_pkey PRIMARY KEY(workspace_id,key);

-- Names are tenant-local; preserve all existing IDs and rows.
DROP INDEX public.idx_companias_nombre;
DROP INDEX public.idx_ramos_nombre;
CREATE UNIQUE INDEX idx_companias_workspace_nombre ON public.companias(workspace_id,lower(nombre));
CREATE UNIQUE INDEX idx_ramos_workspace_nombre ON public.ramos(workspace_id,lower(nombre));

COMMENT ON TABLE public.workspaces IS 'Workspace privado, uno por usuario en la etapa actual.';
COMMENT ON COLUMN public.clientes.workspace_id IS 'Tenant de la fila; asignado al propietario histórico en migración 012.';
COMMIT;
