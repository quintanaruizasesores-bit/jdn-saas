-- 015_notificaciones_email.sql
-- Recordatorios automáticos por email de tareas vencidas (resumen diario).
--
-- Modelo: igual que el resto de la cartera, cada fila pertenece a un workspace
-- (un usuario). Las preferencias y el registro de envíos se aíslan por
-- workspace con la misma política que 013 (workspace_id = current_workspace_id()).
-- El "responsable" de las tareas de un workspace es su propietario: no existe
-- una columna de asignación por tarea. Por eso el resumen se arma por workspace
-- y se envía a su propietario.
--
-- Requiere 012 y 013 aplicadas (workspaces, current_workspace_id,
-- assign_workspace_id, roles authenticated/service_role).

BEGIN;

-- ---------------------------------------------------------------------------
-- Preferencias de notificación por workspace (una fila por usuario).
-- ---------------------------------------------------------------------------
CREATE TABLE public.notificacion_email_prefs (
  workspace_id  uuid PRIMARY KEY REFERENCES public.workspaces(id) ON DELETE CASCADE,
  -- Recordatorios desactivados por defecto (opt-in explícito).
  activo        boolean NOT NULL DEFAULT false,
  -- Correo de destino del resumen. Es independiente del correo de acceso
  -- (auth.users.email): cambiarlo acá no modifica las credenciales de login.
  destinatario  text,
  -- Hora local (0–23) a la que se arma el resumen diario.
  hora_local    smallint NOT NULL DEFAULT 8 CHECK (hora_local BETWEEN 0 AND 23),
  -- Zona horaria IANA del usuario. Por defecto, la de la aplicación.
  zona_horaria  text NOT NULL DEFAULT 'America/Argentina/Buenos_Aires',
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notificacion_email_prefs ENABLE ROW LEVEL SECURITY;

-- Mantiene updated_at (reutiliza la función de 001).
CREATE TRIGGER tr_notif_prefs_updated_at
  BEFORE UPDATE ON public.notificacion_email_prefs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- El workspace_id se asigna desde la sesión (reutiliza la función de 013): el
-- cliente hace upsert sin workspace_id y el trigger lo fija al propio.
CREATE TRIGGER trg_notif_prefs_workspace
  BEFORE INSERT ON public.notificacion_email_prefs
  FOR EACH ROW EXECUTE FUNCTION public.assign_workspace_id();

-- Aislamiento por workspace: cada usuario solo ve/edita su propia fila.
CREATE POLICY notif_prefs_workspace_isolation ON public.notificacion_email_prefs
  FOR ALL TO authenticated
  USING (workspace_id = (SELECT public.current_workspace_id()))
  WITH CHECK (workspace_id = (SELECT public.current_workspace_id()));

-- ---------------------------------------------------------------------------
-- Registro de envíos (persistencia, idempotencia y estado de entrega).
-- ---------------------------------------------------------------------------
CREATE TABLE public.notificacion_email_envios (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  -- 'RESUMEN_DIARIO' | 'PRUEBA'
  tipo          text NOT NULL CHECK (tipo IN ('RESUMEN_DIARIO', 'PRUEBA')),
  -- Fecha civil local del usuario; base de la restricción anti-duplicados.
  fecha_local   date NOT NULL,
  -- 'ENVIANDO' | 'ENVIADO' | 'ERROR'
  estado        text NOT NULL CHECK (estado IN ('ENVIANDO', 'ENVIADO', 'ERROR')),
  -- Identificador del proveedor (Resend). Nunca se guardan secretos ni el
  -- contenido del correo: solo metadatos mínimos de entrega.
  provider_id   text,
  error         text,
  total_tareas  integer,
  intentos      integer NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER tr_notif_envios_updated_at
  BEFORE UPDATE ON public.notificacion_email_envios
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Un único resumen diario por usuario y fecha local. El tipo 'PRUEBA' queda
-- fuera de esta restricción (se limita por frecuencia en la aplicación).
CREATE UNIQUE INDEX ux_notif_envio_resumen_diario
  ON public.notificacion_email_envios (workspace_id, fecha_local)
  WHERE tipo = 'RESUMEN_DIARIO';

CREATE INDEX idx_notif_envios_workspace
  ON public.notificacion_email_envios (workspace_id, created_at DESC);

ALTER TABLE public.notificacion_email_envios ENABLE ROW LEVEL SECURITY;

-- Aislamiento por workspace. El envío del correo de prueba corre con la sesión
-- del usuario (debe fijar workspace_id al propio, que la política verifica). El
-- resumen diario corre con service_role desde el cron y saltea RLS.
CREATE POLICY notif_envios_workspace_isolation ON public.notificacion_email_envios
  FOR ALL TO authenticated
  USING (workspace_id = (SELECT public.current_workspace_id()))
  WITH CHECK (workspace_id = (SELECT public.current_workspace_id()));

-- ---------------------------------------------------------------------------
-- Reclamo atómico del resumen diario (concurrencia + reintentos controlados).
-- ---------------------------------------------------------------------------
-- Devuelve el id de la fila si este proceso obtiene el "derecho" a enviar, o
-- NULL si ya fue enviado, está en curso, o se agotaron los reintentos. La
-- unicidad parcial evita duplicados ante ejecuciones concurrentes; una fila en
-- ERROR (hasta p_max_intentos) o una 'ENVIANDO' estancada se puede reclamar de
-- nuevo. Solo el cron (service_role) la ejecuta.
CREATE OR REPLACE FUNCTION public.reclamar_resumen_diario(
  p_workspace_id uuid,
  p_fecha_local  date,
  p_max_intentos integer DEFAULT 3
)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  INSERT INTO public.notificacion_email_envios
    (workspace_id, tipo, fecha_local, estado, intentos)
  VALUES (p_workspace_id, 'RESUMEN_DIARIO', p_fecha_local, 'ENVIANDO', 1)
  ON CONFLICT (workspace_id, fecha_local) WHERE tipo = 'RESUMEN_DIARIO'
  DO UPDATE SET estado = 'ENVIANDO',
                intentos = public.notificacion_email_envios.intentos + 1,
                updated_at = now()
  WHERE (public.notificacion_email_envios.estado = 'ERROR'
           AND public.notificacion_email_envios.intentos < p_max_intentos)
     OR (public.notificacion_email_envios.estado = 'ENVIANDO'
           AND public.notificacion_email_envios.updated_at < now() - interval '15 minutes')
  RETURNING id;
$$;

REVOKE ALL ON FUNCTION public.reclamar_resumen_diario(uuid, date, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reclamar_resumen_diario(uuid, date, integer) TO service_role;

COMMENT ON TABLE public.notificacion_email_prefs IS
  'Preferencias de recordatorios por email, una fila por workspace/usuario.';
COMMENT ON TABLE public.notificacion_email_envios IS
  'Bitácora de envíos de email: estado de entrega e id del proveedor, sin secretos ni contenido.';

COMMIT;
