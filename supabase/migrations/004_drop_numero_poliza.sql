-- Elimina por completo numero_poliza de polizas.
-- La vista v_renovaciones_proximas la referencia, así que se recrea sin esa columna.
-- (No se usa CREATE OR REPLACE porque no permite quitar columnas de la salida de una vista.)

DROP VIEW IF EXISTS v_renovaciones_proximas;

ALTER TABLE polizas DROP COLUMN IF EXISTS numero_poliza;

CREATE VIEW v_renovaciones_proximas AS
SELECT
  p.id AS poliza_id,
  p.fecha_fin,
  (p.fecha_fin - CURRENT_DATE) AS dias_restantes,
  CASE
    WHEN p.fecha_fin - CURRENT_DATE <= 7 THEN '7'
    WHEN p.fecha_fin - CURRENT_DATE <= 15 THEN '15'
    ELSE '30'
  END AS alerta_nivel,
  cl.id AS cliente_id,
  cl.nombre || ' ' || cl.apellido AS cliente_nombre,
  c.nombre AS compania_nombre
FROM polizas p
JOIN clientes cl ON cl.id = p.cliente_id
LEFT JOIN companias c ON c.id = p.compania_id
WHERE p.estado = 'VIGENTE'
  AND p.fecha_fin IS NOT NULL
  AND p.fecha_fin BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
  AND cl.deleted_at IS NULL
ORDER BY p.fecha_fin ASC;

GRANT SELECT ON v_renovaciones_proximas TO authenticated;
