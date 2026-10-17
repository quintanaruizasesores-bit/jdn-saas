-- Comisión recurrente: los importes existentes son MENSUALES, confirmado por
-- el usuario. No se modifican primas, vigencias, estados ni historiales legacy.
BEGIN;

ALTER TABLE public.polizas
  ADD COLUMN fecha_baja DATE,
  ADD COLUMN comision_desde DATE;
ALTER TABLE public.poliza_historial
  ADD COLUMN fecha_efecto DATE,
  ADD COLUMN version_orden BIGINT GENERATED ALWAYS AS IDENTITY,
  ADD COLUMN completo BOOLEAN NOT NULL DEFAULT FALSE;

-- Foto observada desde hoy. No es una reconstrucción de meses anteriores.
-- El importador antiguo copió fechaBaja a fecha_fin: no acreditar ese dato sin
-- revisión cuando la póliza legacy todavía figura vigente.
UPDATE public.polizas
SET comision_desde = (CURRENT_TIMESTAMP AT TIME ZONE 'America/Argentina/Cordoba')::date
WHERE NOT (legacy_id IS NOT NULL AND fecha_fin IS NOT NULL AND estado = 'VIGENTE');

INSERT INTO public.poliza_historial
  (poliza_id, tipo, datos_nuevos, fecha_efecto, completo, nota)
SELECT id, 'ACTUALIZACION',
       to_jsonb(p) || jsonb_build_object('prima_periodicidad', 'MENSUAL'),
       comision_desde, TRUE, 'Foto inicial de comisiones; no acredita períodos anteriores'
FROM public.polizas p;

CREATE OR REPLACE FUNCTION public.preparar_version_comision()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  hoy DATE := (CURRENT_TIMESTAMP AT TIME ZONE 'America/Argentina/Cordoba')::date;
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.comision_desde := COALESCE(NEW.comision_desde, hoy);
  ELSIF ROW(OLD.estado, OLD.fecha_inicio, OLD.fecha_fin, OLD.prima, OLD.fecha_baja, OLD.comision_desde)
        IS DISTINCT FROM ROW(NEW.estado, NEW.fecha_inicio, NEW.fecha_fin, NEW.prima, NEW.fecha_baja, NEW.comision_desde) THEN
    IF NEW.comision_desde IS NULL OR (NEW.comision_desde IS NOT DISTINCT FROM OLD.comision_desde AND NEW.comision_desde <= hoy) THEN
      IF OLD.estado IS DISTINCT FROM NEW.estado AND NEW.estado = 'BAJA' AND NEW.fecha_baja IS NOT NULL THEN
        NEW.comision_desde := NEW.fecha_baja;
      ELSIF NEW.estado = 'VIGENTE' AND NEW.fecha_inicio > OLD.fecha_inicio THEN
        NEW.comision_desde := NEW.fecha_inicio;
      ELSE
        NEW.comision_desde := hoy;
      END IF;
    END IF;
    IF OLD.comision_desde IS NOT NULL AND NEW.comision_desde < OLD.comision_desde THEN
      RAISE EXCEPTION 'La fecha de efecto no puede ser anterior a la última versión financiera (%)', OLD.comision_desde;
    END IF;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.estado IS DISTINCT FROM NEW.estado AND NEW.estado = 'BAJA'
     AND NEW.fecha_baja IS NOT NULL AND NEW.comision_desde > NEW.fecha_baja THEN
    RAISE EXCEPTION 'La baja debe registrarse con efecto desde su fecha efectiva';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER tr_polizas_version_comision
  BEFORE INSERT OR UPDATE ON public.polizas
  FOR EACH ROW EXECUTE FUNCTION public.preparar_version_comision();

-- Sustituye la función del trigger existente. Conserva los eventos antiguos y
-- captura simultáneamente prima, fechas y estado, incluso al renovar VIGENTE.
CREATE OR REPLACE FUNCTION public.log_poliza_changes()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  evento historial_tipo;
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.poliza_historial
      (poliza_id, usuario_id, tipo, datos_nuevos, fecha_efecto, completo, nota)
    VALUES (NEW.id, auth.uid(), 'CREACION',
      to_jsonb(NEW) || jsonb_build_object('prima_periodicidad', 'MENSUAL'),
      NEW.comision_desde, TRUE, 'Versión financiera completa');
  ELSIF ROW(OLD.estado, OLD.fecha_inicio, OLD.fecha_fin, OLD.prima, OLD.fecha_baja, OLD.comision_desde)
        IS DISTINCT FROM ROW(NEW.estado, NEW.fecha_inicio, NEW.fecha_fin, NEW.prima, NEW.fecha_baja, NEW.comision_desde) THEN
    evento := CASE
      WHEN OLD.estado IS DISTINCT FROM NEW.estado AND NEW.estado = 'BAJA' THEN 'BAJA'::historial_tipo
      WHEN NEW.estado = 'VIGENTE' AND NEW.fecha_inicio > OLD.fecha_inicio THEN 'RENOVACION'::historial_tipo
      WHEN OLD.prima IS DISTINCT FROM NEW.prima THEN 'PRIMA'::historial_tipo
      ELSE 'ACTUALIZACION'::historial_tipo END;
    INSERT INTO public.poliza_historial
      (poliza_id, usuario_id, tipo, datos_anteriores, datos_nuevos, fecha_efecto, completo, nota)
    VALUES (NEW.id, auth.uid(), evento,
      to_jsonb(OLD) || jsonb_build_object('prima_periodicidad', 'MENSUAL'),
      to_jsonb(NEW) || jsonb_build_object('prima_periodicidad', 'MENSUAL'),
      NEW.comision_desde, TRUE, 'Versión financiera completa');
  END IF;
  RETURN NEW;
END;
$$;

CREATE INDEX idx_poliza_historial_comision ON public.poliza_historial(poliza_id, fecha_efecto) WHERE completo;
COMMENT ON COLUMN public.polizas.prima IS 'Premio mensual registrado (periodicidad confirmada por el usuario); comisión estimada actual 14%, no contractual ni cobrada.';
COMMENT ON COLUMN public.polizas.comision_desde IS 'Fecha de efecto de la versión financiera; la foto inicial sólo acredita datos desde su observación.';
COMMENT ON COLUMN public.polizas.fecha_baja IS 'Primer día en que la póliza deja de aportar por baja; no confundir con vencimiento inclusivo.';
COMMIT;
