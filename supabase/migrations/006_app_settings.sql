-- Configuración general de la aplicación (clave/valor en JSONB).
-- Usada, por ahora, para la plantilla del mensaje de cumpleaños y el nombre de
-- la empresa. Se guarda un único registro por clave (p. ej. key = 'birthday').

CREATE TABLE app_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Reutiliza la función update_updated_at() creada en 001_initial_schema.sql.
CREATE TRIGGER tr_app_settings_updated_at
  BEFORE UPDATE ON app_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS: mismo criterio que el resto de la cartera (acceso para autenticados).
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY app_settings_auth ON app_settings
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
