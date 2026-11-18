-- 016_crosssell_core.sql
-- Módulo Cross-Selling (Fase 1): motor de oportunidades de venta cruzada.
--
-- Todo es ADITIVO: no se modifica, borra ni reasigna ninguna tabla existente.
-- Cada fila pertenece a un workspace y se aísla con la misma política que 013
-- (workspace_id = current_workspace_id()). Se reutilizan las funciones de 013
-- (current_workspace_id, assign_workspace_id) y de 001 (update_updated_at).
--
-- Requiere 012 y 013 aplicadas (workspaces, current_workspace_id,
-- assign_workspace_id, UNIQUE(workspace_id,id) en clientes/ramos, roles).
--
-- No incluye seeds: las categorías y reglas de ejemplo se crean desde la
-- aplicación (bajo la sesión del usuario, para que el trigger asigne el
-- workspace correcto y funcione en entornos multi-workspace).

BEGIN;

-- ---------------------------------------------------------------------------
-- Categorías de cobertura normalizadas (editables por workspace).
-- ---------------------------------------------------------------------------
CREATE TABLE public.crosssell_categoria (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  nombre       text NOT NULL,
  -- Clave estable sin acentos (p. ej. 'automotor', 'hogar'). Identifica la
  -- categoría al sembrar y mapear; es única por workspace.
  slug         text NOT NULL,
  descripcion  text,
  activa       boolean NOT NULL DEFAULT true,
  orden        integer NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.crosssell_categoria ENABLE ROW LEVEL SECURITY;
-- Clave compuesta para FKs tenant-aware desde otras tablas del módulo.
ALTER TABLE public.crosssell_categoria ADD CONSTRAINT crosssell_categoria_ws_id_key UNIQUE (workspace_id, id);
CREATE UNIQUE INDEX ux_crosssell_categoria_slug ON public.crosssell_categoria (workspace_id, lower(slug));
CREATE TRIGGER tr_crosssell_categoria_updated_at BEFORE UPDATE ON public.crosssell_categoria
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_crosssell_categoria_workspace BEFORE INSERT ON public.crosssell_categoria
  FOR EACH ROW EXECUTE FUNCTION public.assign_workspace_id();
CREATE POLICY crosssell_categoria_workspace_isolation ON public.crosssell_categoria
  FOR ALL TO authenticated
  USING (workspace_id = (SELECT public.current_workspace_id()))
  WITH CHECK (workspace_id = (SELECT public.current_workspace_id()));

-- ---------------------------------------------------------------------------
-- Mapeo configurable ramo -> categoría (uno a uno por ramo). No toca `ramos`.
-- ---------------------------------------------------------------------------
CREATE TABLE public.crosssell_ramo_map (
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  ramo_id      uuid NOT NULL,
  categoria_id uuid NOT NULL,
  -- 'AUTO' = sugerido por heurística; 'MANUAL' = confirmado por el usuario.
  origen       text NOT NULL DEFAULT 'MANUAL' CHECK (origen IN ('AUTO', 'MANUAL')),
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, ramo_id),
  CONSTRAINT crosssell_ramo_map_ramo_fkey
    FOREIGN KEY (workspace_id, ramo_id)
    REFERENCES public.ramos (workspace_id, id) ON DELETE CASCADE,
  CONSTRAINT crosssell_ramo_map_categoria_fkey
    FOREIGN KEY (workspace_id, categoria_id)
    REFERENCES public.crosssell_categoria (workspace_id, id) ON DELETE CASCADE
);
ALTER TABLE public.crosssell_ramo_map ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_crosssell_ramo_map_categoria ON public.crosssell_ramo_map (workspace_id, categoria_id);
CREATE TRIGGER tr_crosssell_ramo_map_updated_at BEFORE UPDATE ON public.crosssell_ramo_map
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_crosssell_ramo_map_workspace BEFORE INSERT ON public.crosssell_ramo_map
  FOR EACH ROW EXECUTE FUNCTION public.assign_workspace_id();
CREATE POLICY crosssell_ramo_map_workspace_isolation ON public.crosssell_ramo_map
  FOR ALL TO authenticated
  USING (workspace_id = (SELECT public.current_workspace_id()))
  WITH CHECK (workspace_id = (SELECT public.current_workspace_id()));

-- ---------------------------------------------------------------------------
-- Reglas comerciales configurables: "tiene A (vigente) y no tiene B -> B".
-- ---------------------------------------------------------------------------
CREATE TABLE public.crosssell_regla (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id           uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  nombre                 text NOT NULL,
  descripcion            text,
  activa                 boolean NOT NULL DEFAULT true,
  -- Peso base de prioridad de las oportunidades que genera (0–100).
  prioridad              integer NOT NULL DEFAULT 50 CHECK (prioridad BETWEEN 0 AND 100),
  -- Categorías que el cliente debe tener (vigentes). Array de ids de categoría.
  categorias_requeridas  uuid[] NOT NULL DEFAULT '{}',
  -- ALL = debe tener todas; ANY = al menos una.
  modo                   text NOT NULL DEFAULT 'ANY' CHECK (modo IN ('ALL', 'ANY')),
  -- Categoría a ofrecer (la que el cliente NO tiene en nuestra cartera).
  categoria_objetivo_id  uuid NOT NULL,
  -- Condiciones extensibles: { min_polizas, provincia, prima_minima, ... }.
  condiciones            jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT crosssell_regla_objetivo_fkey
    FOREIGN KEY (workspace_id, categoria_objetivo_id)
    REFERENCES public.crosssell_categoria (workspace_id, id) ON DELETE CASCADE
);
ALTER TABLE public.crosssell_regla ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crosssell_regla ADD CONSTRAINT crosssell_regla_ws_id_key UNIQUE (workspace_id, id);
CREATE INDEX idx_crosssell_regla_activa ON public.crosssell_regla (workspace_id) WHERE activa;
CREATE TRIGGER tr_crosssell_regla_updated_at BEFORE UPDATE ON public.crosssell_regla
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_crosssell_regla_workspace BEFORE INSERT ON public.crosssell_regla
  FOR EACH ROW EXECUTE FUNCTION public.assign_workspace_id();
CREATE POLICY crosssell_regla_workspace_isolation ON public.crosssell_regla
  FOR ALL TO authenticated
  USING (workspace_id = (SELECT public.current_workspace_id()))
  WITH CHECK (workspace_id = (SELECT public.current_workspace_id()));

-- ---------------------------------------------------------------------------
-- Oportunidades detectadas (una abierta por cliente + categoría objetivo).
-- ---------------------------------------------------------------------------
CREATE TABLE public.crosssell_oportunidad (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id          uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  cliente_id            uuid NOT NULL,
  categoria_objetivo_id uuid NOT NULL,
  regla_id              uuid,
  estado                text NOT NULL DEFAULT 'NUEVA'
    CHECK (estado IN ('NUEVA','VISTA','CONTACTADA','EN_NEGOCIACION','CONVERTIDA','DESCARTADA','NO_APLICA')),
  prioridad_score       integer NOT NULL DEFAULT 0,
  -- Explicabilidad: qué coberturas/pólizas dispararon la oportunidad.
  motivo                jsonb NOT NULL DEFAULT '{}'::jsonb,
  nota                  text,
  detectada_at          timestamptz NOT NULL DEFAULT now(),
  ultima_deteccion_at   timestamptz NOT NULL DEFAULT now(),
  cerrada_at            timestamptz,
  cierre_motivo         text,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT crosssell_oportunidad_cliente_fkey
    FOREIGN KEY (workspace_id, cliente_id)
    REFERENCES public.clientes (workspace_id, id) ON DELETE CASCADE,
  CONSTRAINT crosssell_oportunidad_categoria_fkey
    FOREIGN KEY (workspace_id, categoria_objetivo_id)
    REFERENCES public.crosssell_categoria (workspace_id, id) ON DELETE CASCADE,
  CONSTRAINT crosssell_oportunidad_regla_fkey
    FOREIGN KEY (workspace_id, regla_id)
    REFERENCES public.crosssell_regla (workspace_id, id) ON DELETE SET NULL (regla_id)
);
ALTER TABLE public.crosssell_oportunidad ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crosssell_oportunidad ADD CONSTRAINT crosssell_oportunidad_ws_id_key UNIQUE (workspace_id, id);
-- Una única oportunidad por cliente + categoría objetivo (anti-duplicados).
CREATE UNIQUE INDEX ux_crosssell_oportunidad_unica
  ON public.crosssell_oportunidad (workspace_id, cliente_id, categoria_objetivo_id);
CREATE INDEX idx_crosssell_oportunidad_estado ON public.crosssell_oportunidad (workspace_id, estado);
CREATE INDEX idx_crosssell_oportunidad_categoria ON public.crosssell_oportunidad (workspace_id, categoria_objetivo_id);
CREATE INDEX idx_crosssell_oportunidad_cliente ON public.crosssell_oportunidad (workspace_id, cliente_id);
CREATE TRIGGER tr_crosssell_oportunidad_updated_at BEFORE UPDATE ON public.crosssell_oportunidad
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_crosssell_oportunidad_workspace BEFORE INSERT ON public.crosssell_oportunidad
  FOR EACH ROW EXECUTE FUNCTION public.assign_workspace_id();
CREATE POLICY crosssell_oportunidad_workspace_isolation ON public.crosssell_oportunidad
  FOR ALL TO authenticated
  USING (workspace_id = (SELECT public.current_workspace_id()))
  WITH CHECK (workspace_id = (SELECT public.current_workspace_id()));

-- ---------------------------------------------------------------------------
-- Exclusiones: cliente excluido de todo (categoria_id NULL) o de una categoría.
-- ---------------------------------------------------------------------------
CREATE TABLE public.crosssell_exclusion (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  cliente_id   uuid NOT NULL,
  categoria_id uuid,
  motivo       text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT crosssell_exclusion_cliente_fkey
    FOREIGN KEY (workspace_id, cliente_id)
    REFERENCES public.clientes (workspace_id, id) ON DELETE CASCADE,
  CONSTRAINT crosssell_exclusion_categoria_fkey
    FOREIGN KEY (workspace_id, categoria_id)
    REFERENCES public.crosssell_categoria (workspace_id, id) ON DELETE CASCADE
);
ALTER TABLE public.crosssell_exclusion ENABLE ROW LEVEL SECURITY;
CREATE UNIQUE INDEX ux_crosssell_exclusion_global
  ON public.crosssell_exclusion (workspace_id, cliente_id) WHERE categoria_id IS NULL;
CREATE UNIQUE INDEX ux_crosssell_exclusion_categoria
  ON public.crosssell_exclusion (workspace_id, cliente_id, categoria_id) WHERE categoria_id IS NOT NULL;
CREATE TRIGGER trg_crosssell_exclusion_workspace BEFORE INSERT ON public.crosssell_exclusion
  FOR EACH ROW EXECUTE FUNCTION public.assign_workspace_id();
CREATE POLICY crosssell_exclusion_workspace_isolation ON public.crosssell_exclusion
  FOR ALL TO authenticated
  USING (workspace_id = (SELECT public.current_workspace_id()))
  WITH CHECK (workspace_id = (SELECT public.current_workspace_id()));

-- ---------------------------------------------------------------------------
-- Línea de tiempo comercial (append-only). correo_id se vincula en 017.
-- ---------------------------------------------------------------------------
CREATE TABLE public.crosssell_evento (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id   uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  cliente_id     uuid NOT NULL,
  oportunidad_id uuid,
  correo_id      uuid,
  tipo           text NOT NULL,
  detalle        jsonb NOT NULL DEFAULT '{}'::jsonb,
  actor_user_id  uuid,
  created_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT crosssell_evento_cliente_fkey
    FOREIGN KEY (workspace_id, cliente_id)
    REFERENCES public.clientes (workspace_id, id) ON DELETE CASCADE,
  CONSTRAINT crosssell_evento_oportunidad_fkey
    FOREIGN KEY (workspace_id, oportunidad_id)
    REFERENCES public.crosssell_oportunidad (workspace_id, id) ON DELETE SET NULL (oportunidad_id)
);
ALTER TABLE public.crosssell_evento ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_crosssell_evento_cliente ON public.crosssell_evento (workspace_id, cliente_id, created_at DESC);
CREATE INDEX idx_crosssell_evento_oportunidad ON public.crosssell_evento (workspace_id, oportunidad_id);
CREATE TRIGGER trg_crosssell_evento_workspace BEFORE INSERT ON public.crosssell_evento
  FOR EACH ROW EXECUTE FUNCTION public.assign_workspace_id();
CREATE POLICY crosssell_evento_workspace_isolation ON public.crosssell_evento
  FOR ALL TO authenticated
  USING (workspace_id = (SELECT public.current_workspace_id()))
  WITH CHECK (workspace_id = (SELECT public.current_workspace_id()));

COMMENT ON TABLE public.crosssell_categoria IS 'Categorías de cobertura normalizadas (Cross-Selling), editables por workspace.';
COMMENT ON TABLE public.crosssell_ramo_map IS 'Mapeo configurable ramo->categoría de cobertura. No modifica la tabla ramos.';
COMMENT ON TABLE public.crosssell_regla IS 'Reglas comerciales configurables de venta cruzada.';
COMMENT ON TABLE public.crosssell_oportunidad IS 'Oportunidades de venta cruzada detectadas; una por cliente + categoría objetivo.';
COMMENT ON TABLE public.crosssell_exclusion IS 'Clientes excluidos del cross-selling (global o por categoría).';
COMMENT ON TABLE public.crosssell_evento IS 'Historial comercial de cross-selling (append-only).';

COMMIT;
