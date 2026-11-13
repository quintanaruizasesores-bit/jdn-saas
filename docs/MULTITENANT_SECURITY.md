# Controles de seguridad multi-tenant

**Estado:** diseño y lista de verificación, no certificación de producción.

- RLS en todas las tablas privadas, `workspaces` y `app_settings`, con `USING` y `WITH CHECK` vinculados a `auth.uid()`. Un usuario autenticado no puede elegir `workspace_id`; la base lo deriva. Las FK compuestas evitan referencias cruzadas incluso con IDs conocidos.
- Recrear todas las vistas `v_*` como `security_invoker=true` si el PostgreSQL remoto es 15+ y verificar su comportamiento con usuarios A/B/C. Revisar grants a `anon`, `authenticated`, `PUBLIC` y `service_role` sobre tablas, vistas y RPC. Las funciones `SECURITY DEFINER` requieren `search_path` fijo, permisos mínimos y verificación del workspace destino. Referencias: [RLS y vistas](https://supabase.com/docs/guides/database/postgres/row-level-security), [funciones](https://supabase.com/docs/guides/database/functions).
- `/api/inteligencia` debe usar sesión autenticada y RLS; no aceptar workspace del request. `/api/respaldo` no puede usar `service_role` para lecturas globales. La allowlist de `BACKUP_ADMIN_USER_IDS` sigue controlando el derecho a descargar, pero el contenido debe filtrarse por workspace obtenido de sesión. El rol `ADMIN` editable no basta como autorización.
- Revisar buckets de Storage y sus policies en remoto. No hay uso de Storage en el código local; si existe un bucket privado, aislar rutas y policies por workspace antes de abrir tenants.
- Al logout o cambio de cuenta, eliminar caché TanStack Query; particionar la marca local de WhatsApp por usuario. Probar navegación con requests manipulados, IDs ajenos, joins, vistas, RPC y exportaciones.
- No publicar claves privadas, fotografías ni datos de producción en código, logs, pruebas o documentación. El registro público permanece cerrado hasta pasar la verificación completa.

## Estado de las migraciones propuestas

`012_workspaces_expand.sql` prepara el mapeo y `013_workspace_rls.sql` activa aislamiento. La 013 revoca la exportación service_role global; `/api/respaldo` debe permanecer deshabilitado hasta implementar/exportar solo el workspace autenticado. No aplicar 013 junto con el frontend actual antes de preparar ese flujo y completar las pruebas de aislamiento.
