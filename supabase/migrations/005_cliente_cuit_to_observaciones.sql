-- Renombra cuit -> observaciones en clientes (campo de texto libre).
ALTER TABLE clientes RENAME COLUMN cuit TO observaciones;
