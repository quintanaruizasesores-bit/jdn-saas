-- Dashboard views and helper functions

CREATE OR REPLACE VIEW v_dashboard_kpis AS
SELECT
  (SELECT COUNT(*) FROM clientes WHERE deleted_at IS NULL) AS total_clientes,
  (SELECT COUNT(*) FROM polizas) AS total_polizas,
  (SELECT COALESCE(SUM(prima), 0) FROM polizas WHERE estado = 'VIGENTE') AS prima_total,
  (
    SELECT COALESCE(SUM(prima), 0) FROM polizas
    WHERE estado = 'VIGENTE'
      AND fecha_inicio >= date_trunc('month', CURRENT_DATE)
  ) AS prima_mensual,
  (SELECT COUNT(*) FROM siniestros WHERE created_at >= CURRENT_DATE - INTERVAL '90 days') AS siniestros_recientes,
  (
    SELECT COUNT(*) FROM polizas
    WHERE estado = 'VIGENTE'
      AND fecha_fin IS NOT NULL
      AND fecha_fin BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
  ) AS renovaciones_proximas;

CREATE OR REPLACE VIEW v_polizas_por_compania AS
SELECT
  c.id AS compania_id,
  c.nombre AS compania_nombre,
  COUNT(p.id) AS total_polizas,
  COALESCE(SUM(p.prima), 0) AS prima_total
FROM companias c
LEFT JOIN polizas p ON p.compania_id = c.id AND p.estado = 'VIGENTE'
GROUP BY c.id, c.nombre
ORDER BY total_polizas DESC;

CREATE OR REPLACE VIEW v_polizas_por_ramo AS
SELECT
  r.id AS ramo_id,
  r.nombre AS ramo_nombre,
  COUNT(p.id) AS total_polizas,
  COALESCE(SUM(p.prima), 0) AS prima_total
FROM ramos r
LEFT JOIN polizas p ON p.ramo_id = r.id AND p.estado = 'VIGENTE'
GROUP BY r.id, r.nombre
ORDER BY total_polizas DESC;

CREATE OR REPLACE VIEW v_renovaciones_proximas AS
SELECT
  p.id AS poliza_id,
  p.numero_poliza,
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

CREATE OR REPLACE VIEW v_produccion_mensual AS
SELECT
  date_trunc('month', COALESCE(fecha_inicio, created_at::date)) AS mes,
  COUNT(*) AS polizas_count,
  COALESCE(SUM(prima), 0) AS prima_total
FROM polizas
WHERE fecha_inicio IS NOT NULL OR created_at IS NOT NULL
GROUP BY 1
ORDER BY mes DESC
LIMIT 24;

CREATE OR REPLACE VIEW v_clientes_top AS
SELECT
  cl.id AS cliente_id,
  cl.nombre || ' ' || cl.apellido AS cliente_nombre,
  COUNT(p.id) AS total_polizas,
  COALESCE(SUM(p.prima), 0) AS prima_total
FROM clientes cl
JOIN polizas p ON p.cliente_id = cl.id
WHERE cl.deleted_at IS NULL
GROUP BY cl.id, cl.nombre, cl.apellido
ORDER BY total_polizas DESC
LIMIT 20;

CREATE OR REPLACE VIEW v_siniestros_por_tipo AS
SELECT tipo, COUNT(*) AS total FROM siniestros GROUP BY tipo ORDER BY total DESC;

CREATE OR REPLACE VIEW v_siniestros_por_responsabilidad AS
SELECT responsabilidad, COUNT(*) AS total FROM siniestros GROUP BY responsabilidad;

-- Log activity helper
CREATE OR REPLACE FUNCTION log_actividad(
  p_accion TEXT,
  p_entidad actividad_entidad,
  p_entidad_id UUID,
  p_metadata JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO actividad (usuario_id, accion, entidad, entidad_id, metadata)
  VALUES (auth.uid(), p_accion, p_entidad, p_entidad_id, p_metadata)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT SELECT ON v_dashboard_kpis TO authenticated;
GRANT SELECT ON v_polizas_por_compania TO authenticated;
GRANT SELECT ON v_polizas_por_ramo TO authenticated;
GRANT SELECT ON v_renovaciones_proximas TO authenticated;
GRANT SELECT ON v_produccion_mensual TO authenticated;
GRANT SELECT ON v_clientes_top TO authenticated;
GRANT SELECT ON v_siniestros_por_tipo TO authenticated;
GRANT SELECT ON v_siniestros_por_responsabilidad TO authenticated;
