-- 017_crosssell_correos.sql
-- Cross-Selling (Fase 2): correo individual asistido (plantillas, borradores,
-- historial de envíos y lista de supresión comercial).
--
-- Aditivo: no modifica ninguna tabla existente. Mismo aislamiento por workspace
-- que 013/016. Requiere 012, 013 y 016 aplicadas.
--
-- El envío real es individual y supervisado (un correo por cliente), con el
-- endpoint /emails de Resend (plan gratuito). No hay envío masivo ni cron.

BEGIN;

-- ---------------------------------------------------------------------------
-- Plantillas reutilizables de correo.
-- ---------------------------------------------------------------------------
CREATE TABLE public.crosssell_plantilla (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  nombre       text NOT NULL,
  asunto       text NOT NULL DEFAULT '',
  cuerpo       text NOT NULL DEFAULT '',
  variables    jsonb NOT NULL DEFAULT '{}'::jsonb,
  activa       boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.crosssell_plantilla ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crosssell_plantilla ADD CONSTRAINT crosssell_plantilla_ws_id_key UNIQUE (workspace_id, id);
CREATE TRIGGER tr_crosssell_plantilla_updated_at BEFORE UPDATE ON public.crosssell_plantilla
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_crosssell_plantilla_workspace BEFORE INSERT ON public.crosssell_plantilla
  FOR EACH ROW EXECUTE FUNCTION public.assign_workspace_id();
CREATE POLICY crosssell_plantilla_workspace_isolation ON public.crosssell_plantilla
  FOR ALL TO authenticated
  USING (workspace_id = (SELECT public.current_workspace_id()))
  WITH CHECK (workspace_id = (SELECT public.current_workspace_id()));

-- ---------------------------------------------------------------------------
-- Correos individuales: borrador + historial de contenido efectivamente enviado.
-- ---------------------------------------------------------------------------
CREATE TABLE public.crosssell_correo (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id          uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  oportunidad_id        uuid,
  cliente_id            uuid NOT NULL,
  categoria_objetivo_id uuid,
  plantilla_id          uuid,
  estado                text NOT NULL DEFAULT 'BORRADOR'
    CHECK (estado IN ('BORRADOR', 'ENVIANDO', 'ENVIADO', 'FALLIDO')),
  asunto                text NOT NULL DEFAULT '',
  cuerpo_html           text NOT NULL DEFAULT '',
  cuerpo_text           text NOT NULL DEFAULT '',
  destinatario_email    text NOT NULL DEFAULT '',
  resend_email_id       text,
  error                 text,
  intentos              integer NOT NULL DEFAULT 0,
  preparado_at          timestamptz,
  enviado_at            timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT crosssell_correo_cliente_fkey
    FOREIGN KEY (workspace_id, cliente_id)
    REFERENCES public.clientes (workspace_id, id) ON DELETE CASCADE,
  CONSTRAINT crosssell_correo_oportunidad_fkey
    FOREIGN KEY (workspace_id, oportunidad_id)
    REFERENCES public.crosssell_oportunidad (workspace_id, id) ON DELETE SET NULL (oportunidad_id),
  CONSTRAINT crosssell_correo_categoria_fkey
    FOREIGN KEY (workspace_id, categoria_objetivo_id)
    REFERENCES public.crosssell_categoria (workspace_id, id) ON DELETE SET NULL (categoria_objetivo_id),
  CONSTRAINT crosssell_correo_plantilla_fkey
    FOREIGN KEY (workspace_id, plantilla_id)
    REFERENCES public.crosssell_plantilla (workspace_id, id) ON DELETE SET NULL (plantilla_id)
);
ALTER TABLE public.crosssell_correo ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_crosssell_correo_oportunidad ON public.crosssell_correo (workspace_id, oportunidad_id);
CREATE INDEX idx_crosssell_correo_cliente ON public.crosssell_correo (workspace_id, cliente_id, created_at DESC);
-- Historial de envíos por cliente+categoría (para advertir reenvíos).
CREATE INDEX idx_crosssell_correo_enviado
  ON public.crosssell_correo (workspace_id, cliente_id, categoria_objetivo_id)
  WHERE estado = 'ENVIADO';
CREATE TRIGGER tr_crosssell_correo_updated_at BEFORE UPDATE ON public.crosssell_correo
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_crosssell_correo_workspace BEFORE INSERT ON public.crosssell_correo
  FOR EACH ROW EXECUTE FUNCTION public.assign_workspace_id();
CREATE POLICY crosssell_correo_workspace_isolation ON public.crosssell_correo
  FOR ALL TO authenticated
  USING (workspace_id = (SELECT public.current_workspace_id()))
  WITH CHECK (workspace_id = (SELECT public.current_workspace_id()));

-- ---------------------------------------------------------------------------
-- Lista de supresión comercial (bajas, rebotes, quejas, manual).
-- ---------------------------------------------------------------------------
CREATE TABLE public.crosssell_supresion (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  email        text NOT NULL,
  motivo       text NOT NULL CHECK (motivo IN ('BAJA', 'REBOTE', 'QUEJA', 'MANUAL')),
  origen       text,
  created_at   timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.crosssell_supresion ENABLE ROW LEVEL SECURITY;
CREATE UNIQUE INDEX ux_crosssell_supresion_email
  ON public.crosssell_supresion (workspace_id, lower(email));
-- Sin trigger assign_workspace_id: la baja desde el enlace del correo ocurre sin
-- sesión, y ese trigger exige sesión. El workspace se fija vía la RPC de abajo.
CREATE POLICY crosssell_supresion_workspace_isolation ON public.crosssell_supresion
  FOR ALL TO authenticated
  USING (workspace_id = (SELECT public.current_workspace_id()))
  WITH CHECK (workspace_id = (SELECT public.current_workspace_id()));

-- Registro de supresión. Con sesión (UI/manual) deriva el workspace de la
-- sesión e ignora un p_workspace_id ajeno. Sin sesión (baja desde el enlace del
-- correo, ejecutada por service_role) usa el workspace firmado del token.
CREATE OR REPLACE FUNCTION public.crosssell_suprimir(
  p_email        text,
  p_motivo       text DEFAULT 'MANUAL',
  p_origen       text DEFAULT NULL,
  p_workspace_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE ws uuid;
BEGIN
  ws := public.current_workspace_id();
  IF ws IS NOT NULL THEN
    IF p_workspace_id IS NOT NULL AND p_workspace_id <> ws THEN
      RAISE EXCEPTION 'workspace_id inválido';
    END IF;
  ELSE
    ws := p_workspace_id;
  END IF;
  IF ws IS NULL THEN RAISE EXCEPTION 'Falta workspace'; END IF;
  IF p_motivo NOT IN ('BAJA', 'REBOTE', 'QUEJA', 'MANUAL') THEN
    RAISE EXCEPTION 'motivo inválido';
  END IF;
  INSERT INTO public.crosssell_supresion (workspace_id, email, motivo, origen)
  VALUES (ws, lower(trim(p_email)), p_motivo, p_origen)
  ON CONFLICT (workspace_id, lower(email)) DO NOTHING;
END $$;

REVOKE ALL ON FUNCTION public.crosssell_suprimir(text, text, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.crosssell_suprimir(text, text, text, uuid) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Reclamo atómico de envío de un correo individual (anti doble-envío).
-- ---------------------------------------------------------------------------
-- Devuelve el id si este proceso obtiene el derecho a enviar, o NULL si ya fue
-- enviado, está en curso (<15 min) o agotó los reintentos. A diferencia del
-- resumen diario, lo ejecuta la sesión del usuario: la función valida que el
-- correo pertenezca al workspace del llamante.
CREATE OR REPLACE FUNCTION public.crosssell_reclamar_correo(
  p_correo_id    uuid,
  p_max_intentos integer DEFAULT 3
)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  UPDATE public.crosssell_correo
     SET estado = 'ENVIANDO',
         intentos = intentos + 1,
         updated_at = now()
   WHERE id = p_correo_id
     AND workspace_id = public.current_workspace_id()
     AND intentos < p_max_intentos
     AND (
       estado IN ('BORRADOR', 'FALLIDO')
       OR (estado = 'ENVIANDO' AND updated_at < now() - interval '15 minutes')
     )
  RETURNING id;
$$;

REVOKE ALL ON FUNCTION public.crosssell_reclamar_correo(uuid, integer) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.crosssell_reclamar_correo(uuid, integer) TO authenticated;

COMMENT ON TABLE public.crosssell_plantilla IS 'Plantillas reutilizables de correo de cross-selling.';
COMMENT ON TABLE public.crosssell_correo IS 'Correos individuales de cross-selling: borrador + historial enviado.';
COMMENT ON TABLE public.crosssell_supresion IS 'Supresión comercial por email (bajas/rebotes/quejas).';

COMMIT;
