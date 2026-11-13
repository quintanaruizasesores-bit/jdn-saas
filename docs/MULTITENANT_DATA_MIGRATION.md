# Migración de datos de la cartera existente

**Estado:** procedimiento propuesto, NO ejecutado. La URL pública no identifica al propietario ni proporciona conexión SQL o backup. Nunca sustituir el UUID por una inferencia basada en orden de creación, rol o último login.

1. Obtener acceso de lectura al proyecto correcto. Inventariar `auth.users`, `public.profiles`, tablas, políticas, funciones, triggers, vistas, FK, índices, Storage y migraciones reales. Confirmar con el responsable el mapeo `owner_user_id` ↔ cartera histórica; registrar ambos UUID en un acta privada, fuera de Git.
2. Establecer ventana sin escrituras y backup técnico PostgreSQL completo, incluyendo esquema, datos y roles/policies necesarios. Probar restauración en proyecto aislado y registrar hora, tamaño, checksum, versión PostgreSQL y resultado. El XLSX de la app no sirve para este fin. Los [backups de base de Supabase](https://supabase.com/docs/guides/platform/backups) no incluyen el contenido de objetos de Storage; respaldarlos aparte si existen.
3. Tomar fotografía privada anterior al cambio: `id`, todas las columnas comerciales e históricas, relaciones, cantidades, activos/inactivos, nulos, suma exacta de `prima`/`monto_estimado`, huella SHA-256 por fila y agregada en orden estable. Comparar también indicadores/reportes para un corte fijo. No subir fotografías ni PII al repo.
4. Ensayar migraciones nuevas sobre copia representativa. La preparación puede agregar columnas técnicas nullable e índices sin backfill; no permitir tráfico nuevo en esta fase. Antes del backfill verificar que el owner existe y que cada tabla conserva el conteo fotografiado.
5. Crear workspace del mismo `auth.users.id`. Asociar filas existentes con `UPDATE`, nunca reinserción. Proteger `updated_at` y triggers financieros: revisar cada trigger y, si es indispensable, usar una condición de migración restringida a transacción/rol para omitir solo efectos secundarios de `workspace_id`. Registrar tablas e IDs afectados.
6. Comparar huellas excluyendo únicamente columnas técnicas nuevas, FK, cantidades, totales y resultados financieros. Exigir cero filas sin workspace y cero relaciones cruzadas. Solo después activar `NOT NULL`, FK compuestas, índices scoped, vistas `security_invoker`, RLS restrictiva y exportación tenant-aware en una transición cerrada al tráfico.
7. Probar conexiones autenticadas reales de A/B/C; conservar el registro público cerrado hasta que seguridad y aislamiento pasen. Abrir tráfico solo con backend/frontend compatibles. Ver `MULTITENANT_VALIDATION.md`.

No aplicar ningún SQL de backfill en producción si el propietario o backup no están confirmados. No modificar migraciones 001–011. Ver `MULTITENANT_ROLLBACK.md`.

## Migraciones 012 y 013 de esta rama

- `012_workspaces_expand.sql` crea un workspace para el propietario verificado y agrega/backfillea `workspace_id` sin recrear filas. Aborta si no coincide el único usuario esperado. Conserva IDs, valores comerciales e `updated_at` de clientes/pólizas/tareas/configuración. Mantiene las tablas y relaciones existentes.
- `013_workspace_rls.sql` activa RLS por workspace, asigna workspace automáticamente en inserts, agrega FKs compuestas y convierte las vistas a `security_invoker`. También revoca las RPC globales de exportación 009; el endpoint de respaldo queda deshabilitado hasta publicar una versión que filtre por workspace.
- Ejecutar ambas en mantenimiento, en orden, únicamente luego de backup técnico restaurado y fotografía comparativa. El esquema de producción debe coincidir con 001–011; si alguna no está aplicada, detenerse y reconciliar antes.
- La app actual no debe desplegarse con 013 todavía: el cliente de respaldo debe adaptarse antes de volver a habilitarlo. Las consultas de negocio normales quedan acotadas por RLS y los inserts reciben workspace en trigger.
