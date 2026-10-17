-- Los colores iniciales se conservan en la paleta compartida. NULL restaura
-- ese valor; no hay backfill ni se modifica la identidad de las compañías.
BEGIN;
ALTER TABLE public.companias ADD COLUMN color TEXT;
ALTER TABLE public.companias ADD CONSTRAINT companias_color_hex
  CHECK (color IS NULL OR color ~ '^#[0-9a-fA-F]{6}$');

CREATE OR REPLACE VIEW public.v_polizas_por_compania AS
SELECT c.id AS compania_id,
       c.nombre AS compania_nombre,
       COUNT(p.id) AS total_polizas,
       COALESCE(SUM(p.prima), 0) AS prima_total,
       c.color
FROM public.companias c
LEFT JOIN public.polizas p ON p.compania_id = c.id AND p.estado = 'VIGENTE'
GROUP BY c.id, c.nombre, c.color
ORDER BY total_polizas DESC;
COMMIT;
