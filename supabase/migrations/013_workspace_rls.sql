-- Fase 2: aislamiento. Aplicar solo después de desplegar código que consulte
-- los datos mediante sesión autenticada y de validar el backfill de 012.
BEGIN;

CREATE OR REPLACE FUNCTION public.current_workspace_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = '' AS $$
  SELECT w.id FROM public.workspaces w WHERE w.owner_user_id=(SELECT auth.uid())
$$;
REVOKE ALL ON FUNCTION public.current_workspace_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_workspace_id() TO authenticated;

CREATE OR REPLACE FUNCTION public.assign_workspace_id()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE actual uuid;
BEGIN
  SELECT public.current_workspace_id() INTO actual;
  IF actual IS NULL THEN RAISE EXCEPTION 'No hay workspace para el usuario autenticado'; END IF;
  IF NEW.workspace_id IS NOT NULL AND NEW.workspace_id IS DISTINCT FROM actual THEN
    RAISE EXCEPTION 'workspace_id inválido';
  END IF;
  NEW.workspace_id := actual;
  RETURN NEW;
END $$;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['clientes','companias','ramos','polizas','poliza_historial','siniestros','tareas','actividad','app_settings'] LOOP
    EXECUTE format('CREATE TRIGGER %I BEFORE INSERT ON public.%I FOR EACH ROW EXECUTE FUNCTION public.assign_workspace_id()', 'trg_'||t||'_workspace',t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I',t||'_auth',t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (workspace_id=(SELECT public.current_workspace_id())) WITH CHECK (workspace_id=(SELECT public.current_workspace_id()))',t||'_workspace_isolation',t);
  END LOOP;
END $$;

-- Las referencias compuestas impiden asociar registros de workspaces distintos.
ALTER TABLE public.clientes ADD CONSTRAINT clientes_workspace_id_id_key UNIQUE(workspace_id,id);
ALTER TABLE public.companias ADD CONSTRAINT companias_workspace_id_id_key UNIQUE(workspace_id,id);
ALTER TABLE public.ramos ADD CONSTRAINT ramos_workspace_id_id_key UNIQUE(workspace_id,id);
ALTER TABLE public.polizas ADD CONSTRAINT polizas_workspace_id_id_key UNIQUE(workspace_id,id);
ALTER TABLE public.siniestros ADD CONSTRAINT siniestros_workspace_id_id_key UNIQUE(workspace_id,id);

ALTER TABLE public.polizas DROP CONSTRAINT polizas_cliente_id_fkey;
ALTER TABLE public.polizas ADD CONSTRAINT polizas_cliente_workspace_fkey FOREIGN KEY(workspace_id,cliente_id) REFERENCES public.clientes(workspace_id,id) ON DELETE RESTRICT;
ALTER TABLE public.polizas DROP CONSTRAINT polizas_compania_id_fkey;
ALTER TABLE public.polizas ADD CONSTRAINT polizas_compania_workspace_fkey FOREIGN KEY(workspace_id,compania_id) REFERENCES public.companias(workspace_id,id) ON DELETE SET NULL (compania_id);
ALTER TABLE public.polizas DROP CONSTRAINT polizas_ramo_id_fkey;
ALTER TABLE public.polizas ADD CONSTRAINT polizas_ramo_workspace_fkey FOREIGN KEY(workspace_id,ramo_id) REFERENCES public.ramos(workspace_id,id) ON DELETE SET NULL (ramo_id);
ALTER TABLE public.poliza_historial DROP CONSTRAINT poliza_historial_poliza_id_fkey;
ALTER TABLE public.poliza_historial ADD CONSTRAINT historial_poliza_workspace_fkey FOREIGN KEY(workspace_id,poliza_id) REFERENCES public.polizas(workspace_id,id) ON DELETE CASCADE;
ALTER TABLE public.siniestros DROP CONSTRAINT siniestros_cliente_id_fkey;
ALTER TABLE public.siniestros ADD CONSTRAINT siniestros_cliente_workspace_fkey FOREIGN KEY(workspace_id,cliente_id) REFERENCES public.clientes(workspace_id,id) ON DELETE RESTRICT;
ALTER TABLE public.siniestros DROP CONSTRAINT siniestros_poliza_id_fkey;
ALTER TABLE public.siniestros ADD CONSTRAINT siniestros_poliza_workspace_fkey FOREIGN KEY(workspace_id,poliza_id) REFERENCES public.polizas(workspace_id,id) ON DELETE SET NULL (poliza_id);
ALTER TABLE public.tareas DROP CONSTRAINT tareas_cliente_id_fkey;
ALTER TABLE public.tareas ADD CONSTRAINT tareas_cliente_workspace_fkey FOREIGN KEY(workspace_id,cliente_id) REFERENCES public.clientes(workspace_id,id) ON DELETE CASCADE;
ALTER TABLE public.tareas DROP CONSTRAINT tareas_poliza_id_fkey;
ALTER TABLE public.tareas ADD CONSTRAINT tareas_poliza_workspace_fkey FOREIGN KEY(workspace_id,poliza_id) REFERENCES public.polizas(workspace_id,id) ON DELETE SET NULL (poliza_id);
ALTER TABLE public.tareas DROP CONSTRAINT tareas_siniestro_id_fkey;
ALTER TABLE public.tareas ADD CONSTRAINT tareas_siniestro_workspace_fkey FOREIGN KEY(workspace_id,siniestro_id) REFERENCES public.siniestros(workspace_id,id) ON DELETE SET NULL (siniestro_id);

-- Vistas públicas deben ejecutar con permisos/RLS del invocante.
ALTER VIEW public.v_dashboard_kpis SET (security_invoker=true);
ALTER VIEW public.v_polizas_por_compania SET (security_invoker=true);
ALTER VIEW public.v_polizas_por_ramo SET (security_invoker=true);
ALTER VIEW public.v_renovaciones_proximas SET (security_invoker=true);
ALTER VIEW public.v_produccion_mensual SET (security_invoker=true);
ALTER VIEW public.v_clientes_top SET (security_invoker=true);
ALTER VIEW public.v_siniestros_por_tipo SET (security_invoker=true);
ALTER VIEW public.v_siniestros_por_responsabilidad SET (security_invoker=true);

-- RPC 009 es deliberadamente incompatible con workspace_id. Retirarla hasta
-- desplegar una exportación tenant-aware; nunca permitir lectura global service_role.
REVOKE EXECUTE ON FUNCTION public.exportacion_catalogo() FROM service_role;
REVOKE EXECUTE ON FUNCTION public.exportacion_lote(text,text,integer) FROM service_role;
COMMIT;
