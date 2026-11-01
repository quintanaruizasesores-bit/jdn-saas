-- 010_tareas_relaciones.sql
-- Permite relacionar una tarea con una póliza y/o un siniestro, además del cliente.
-- Espeja el patrón de siniestros.poliza_id (ON DELETE SET NULL): si se elimina la
-- póliza o el siniestro, la tarea se conserva y simplemente pierde ese vínculo.
-- No modifica RLS: la política tareas_auth sigue cubriendo todas las operaciones.

ALTER TABLE tareas
  ADD COLUMN poliza_id    UUID REFERENCES polizas(id)    ON DELETE SET NULL,
  ADD COLUMN siniestro_id UUID REFERENCES siniestros(id) ON DELETE SET NULL;

CREATE INDEX idx_tareas_poliza    ON tareas(poliza_id);
CREATE INDEX idx_tareas_siniestro ON tareas(siniestro_id);
