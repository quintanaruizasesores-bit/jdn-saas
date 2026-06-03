-- Add legacy_nombre for prototype migration deduplication
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS legacy_nombre TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_clientes_legacy_nombre
  ON clientes(legacy_nombre) WHERE legacy_nombre IS NOT NULL;
