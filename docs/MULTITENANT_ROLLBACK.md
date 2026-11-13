# Rollback y continuidad

**Estado:** plan preliminar, pendiente de ensayo sobre copia real. No hay backup técnico verificado en esta sesión.

Antes del corte, mantener registro público cerrado y detener escrituras. Conservar snapshot técnico de PostgreSQL y versión previa de la aplicación. Registrar el instante de corte y los cambios permitidos. Ensayar una restauración completa en proyecto aislado; medir tiempo y comprobar conteos, huellas y acceso del usuario original.

Si falla el backfill antes de habilitar tráfico, revertir la transacción y conservar la aplicación anterior. Si falla una activación posterior, cerrar tráfico inmediatamente; restaurar backup técnico en entorno aislado y comparar contra la fotografía antes de reabrir. No quitar `workspace_id` ni volver a políticas amplias en producción con usuarios nuevos activos, porque eso expondría carteras. Determinar si hubo escrituras posteriores al corte antes de restaurar; no descartarlas silenciosamente. La decisión y ejecución de restauración en producción requieren procedimiento operativo y autorización explícita.
