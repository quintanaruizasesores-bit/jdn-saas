-- Cartera JDN - Initial Schema
-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enums
CREATE TYPE user_role AS ENUM ('ADMIN', 'PRODUCTOR', 'OPERADOR');
CREATE TYPE poliza_estado AS ENUM ('VIGENTE', 'HISTORICA', 'BAJA');
CREATE TYPE siniestro_tipo AS ENUM ('CHOQUE', 'ROBO', 'INCENDIO', 'GRANIZO', 'OTROS');
CREATE TYPE responsabilidad AS ENUM ('RESPONSABLE', 'NO_RESPONSABLE', 'INDETERMINADA');
CREATE TYPE tarea_estado AS ENUM ('PENDIENTE', 'EN_PROCESO', 'FINALIZADA');
CREATE TYPE actividad_entidad AS ENUM ('CLIENTE', 'POLIZA', 'SINIESTRO', 'TAREA', 'COMPANIA', 'RAMO');
CREATE TYPE historial_tipo AS ENUM ('CREACION', 'ACTUALIZACION', 'RENOVACION', 'BAJA', 'PRIMA');
CREATE TYPE compania_estado AS ENUM ('ACTIVA', 'INACTIVA');

-- Profiles (linked to auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'ADMIN',
  nombre TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Clientes
CREATE TABLE clientes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre TEXT NOT NULL,
  apellido TEXT NOT NULL DEFAULT '',
  dni TEXT,
  cuit TEXT,
  email TEXT,
  telefono TEXT,
  direccion TEXT,
  localidad TEXT,
  provincia TEXT,
  fecha_nacimiento DATE,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_clientes_deleted ON clientes(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_clientes_nombre ON clientes(nombre, apellido);
CREATE INDEX idx_clientes_dni ON clientes(dni) WHERE dni IS NOT NULL;

-- Compañías
CREATE TABLE companias (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre TEXT NOT NULL,
  codigo TEXT,
  estado compania_estado NOT NULL DEFAULT 'ACTIVA',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_companias_nombre ON companias(LOWER(nombre));

-- Ramos
CREATE TABLE ramos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre TEXT NOT NULL,
  codigo TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_ramos_nombre ON ramos(LOWER(nombre));

-- Pólizas
CREATE TABLE polizas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE RESTRICT,
  compania_id UUID REFERENCES companias(id) ON DELETE SET NULL,
  ramo_id UUID REFERENCES ramos(id) ON DELETE SET NULL,
  numero_poliza TEXT NOT NULL,
  estado poliza_estado NOT NULL DEFAULT 'VIGENTE',
  fecha_inicio DATE,
  fecha_fin DATE,
  prima NUMERIC(14, 2) NOT NULL DEFAULT 0,
  detalle TEXT,
  legacy_id INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_polizas_cliente ON polizas(cliente_id);
CREATE INDEX idx_polizas_compania ON polizas(compania_id);
CREATE INDEX idx_polizas_ramo ON polizas(ramo_id);
CREATE INDEX idx_polizas_estado ON polizas(estado);
CREATE INDEX idx_polizas_fecha_fin ON polizas(fecha_fin) WHERE estado = 'VIGENTE';
CREATE INDEX idx_polizas_legacy ON polizas(legacy_id) WHERE legacy_id IS NOT NULL;

-- Historial de pólizas
CREATE TABLE poliza_historial (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  poliza_id UUID NOT NULL REFERENCES polizas(id) ON DELETE CASCADE,
  usuario_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  tipo historial_tipo NOT NULL,
  datos_anteriores JSONB,
  datos_nuevos JSONB,
  nota TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_poliza_historial_poliza ON poliza_historial(poliza_id);

-- Siniestros
CREATE TABLE siniestros (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE RESTRICT,
  poliza_id UUID REFERENCES polizas(id) ON DELETE SET NULL,
  tipo siniestro_tipo NOT NULL DEFAULT 'OTROS',
  fecha DATE,
  descripcion TEXT,
  descripcion_raw TEXT,
  responsabilidad responsabilidad DEFAULT 'INDETERMINADA',
  monto_estimado NUMERIC(14, 2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_siniestros_cliente ON siniestros(cliente_id);
CREATE INDEX idx_siniestros_poliza ON siniestros(poliza_id);
CREATE INDEX idx_siniestros_tipo ON siniestros(tipo);

-- Tareas (seguimiento comercial)
CREATE TABLE tareas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cliente_id UUID REFERENCES clientes(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  descripcion TEXT,
  fecha_vencimiento DATE,
  estado tarea_estado NOT NULL DEFAULT 'PENDIENTE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tareas_cliente ON tareas(cliente_id);
CREATE INDEX idx_tareas_estado ON tareas(estado);
CREATE INDEX idx_tareas_vencimiento ON tareas(fecha_vencimiento);

-- Actividad (audit log)
CREATE TABLE actividad (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  accion TEXT NOT NULL,
  entidad actividad_entidad NOT NULL,
  entidad_id UUID,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_actividad_entidad ON actividad(entidad, entidad_id);
CREATE INDEX idx_actividad_created ON actividad(created_at DESC);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_clientes_updated_at
  BEFORE UPDATE ON clientes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_polizas_updated_at
  BEFORE UPDATE ON polizas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_tareas_updated_at
  BEFORE UPDATE ON tareas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, nombre, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nombre', split_part(NEW.email, '@', 1)),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'ADMIN')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Poliza historial on update
CREATE OR REPLACE FUNCTION log_poliza_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF OLD.estado IS DISTINCT FROM NEW.estado THEN
      INSERT INTO poliza_historial (poliza_id, tipo, datos_anteriores, datos_nuevos, nota)
      VALUES (
        NEW.id,
        CASE WHEN NEW.estado = 'BAJA' THEN 'BAJA'::historial_tipo
             WHEN OLD.fecha_fin IS DISTINCT FROM NEW.fecha_fin AND NEW.estado = 'VIGENTE' THEN 'RENOVACION'::historial_tipo
             ELSE 'ACTUALIZACION'::historial_tipo END,
        jsonb_build_object('estado', OLD.estado, 'fecha_fin', OLD.fecha_fin, 'prima', OLD.prima),
        jsonb_build_object('estado', NEW.estado, 'fecha_fin', NEW.fecha_fin, 'prima', NEW.prima),
        'Cambio automático de estado'
      );
    ELSIF OLD.prima IS DISTINCT FROM NEW.prima THEN
      INSERT INTO poliza_historial (poliza_id, tipo, datos_anteriores, datos_nuevos, nota)
      VALUES (
        NEW.id, 'PRIMA'::historial_tipo,
        jsonb_build_object('prima', OLD.prima),
        jsonb_build_object('prima', NEW.prima),
        'Actualización de prima'
      );
    END IF;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO poliza_historial (poliza_id, tipo, datos_nuevos, nota)
    VALUES (NEW.id, 'CREACION'::historial_tipo, to_jsonb(NEW), 'Póliza creada');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER tr_poliza_historial
  AFTER INSERT OR UPDATE ON polizas
  FOR EACH ROW EXECUTE FUNCTION log_poliza_changes();

-- RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE companias ENABLE ROW LEVEL SECURITY;
ALTER TABLE ramos ENABLE ROW LEVEL SECURITY;
ALTER TABLE polizas ENABLE ROW LEVEL SECURITY;
ALTER TABLE poliza_historial ENABLE ROW LEVEL SECURITY;
ALTER TABLE siniestros ENABLE ROW LEVEL SECURITY;
ALTER TABLE tareas ENABLE ROW LEVEL SECURITY;
ALTER TABLE actividad ENABLE ROW LEVEL SECURITY;

CREATE POLICY profiles_select ON profiles FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY profiles_update ON profiles FOR UPDATE TO authenticated USING (id = auth.uid());

CREATE POLICY clientes_auth ON clientes FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY companias_auth ON companias FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY ramos_auth ON ramos FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY polizas_auth ON polizas FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY poliza_historial_auth ON poliza_historial FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY siniestros_auth ON siniestros FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY tareas_auth ON tareas FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY actividad_auth ON actividad FOR ALL TO authenticated USING (true) WITH CHECK (true);
