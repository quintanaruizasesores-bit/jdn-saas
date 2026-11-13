# Auditoría multi-tenant (13/11/2026)

**Estado:** auditoría local y lectura parcial del proyecto remoto desde Supabase Studio. El proyecto no aparece en `supabase projects list` de la cuenta CLI de esta sesión, pero Studio sí permitió consultas SQL de solo lectura. El usuario identificó expresamente al propietario histórico; su UUID se verificó en `auth.users` y `public.profiles`, sin guardarlo en este repositorio. No ejecutar el backfill hasta completar inventario, backup técnico y ensayo.

En el proyecto remoto se verificaron **1 usuario de Auth**, **1 perfil** (el propietario indicado, rol `ADMIN`), **10 tablas públicas** con RLS habilitado y **8 vistas públicas**. Esto confirma los nombres de tablas del repositorio, pero todavía no las columnas, políticas, funciones, relaciones ni los conteos comerciales. No se inspeccionaron datos comerciales ni Storage.

El relevamiento remoto de solo lectura está preparado en `scripts/multitenant/preflight.sql`. Sus resultados deben conservarse fuera de Git. El mapa implementado muestra provincias de Argentina mediante GeoJSON local; no es un mapa exclusivo de Córdoba.

## Inventario local

| Entidad | Situación actual | Destino propuesto |
|---|---|---|
| `profiles` | PK/FK a `auth.users`; perfil propio editable; `role` no es autorización fuerte | Conservar UUID y perfil; workspace 1:1 por `owner_user_id` |
| `clientes` | Baja lógica; DNI sin unicidad en BD | Privada; índice de búsqueda y validación scoped |
| `companias`, `ramos` | Índices únicos globales por nombre | Catálogos privados; preservar IDs, colores y asociaciones históricas; unicidad por workspace |
| `polizas`, `poliza_historial` | FK, triggers de `updated_at` y versión financiera 007 | Privadas; preservar todos los campos y versiones; FK compuestas |
| `siniestros`, `tareas`, `actividad` | FK a clientes/pólizas/siniestros; `actividad` puede tener `usuario_id` nulo | Privadas; `workspace_id` explícito; impedir referencias cruzadas |
| `app_settings` | PK `key` global; plantilla `birthday` | PK `(workspace_id,key)`; conservar fila histórica |
| `workspaces` | No existe | Una fila por usuario |

No hay tabla de presupuestos en las migraciones 001–011 ni módulo en `src/app/`; verificar esquema remoto antes de afirmar su ausencia en producción.

Las vistas de `002`, `004` y `008` son `v_dashboard_kpis`, `v_polizas_por_compania`, `v_polizas_por_ramo`, `v_renovaciones_proximas`, `v_produccion_mensual`, `v_clientes_top`, `v_siniestros_por_tipo` y `v_siniestros_por_responsabilidad`. Se crearon sin `security_invoker`; su propietario puede eludir RLS. `log_actividad` y `log_poliza_changes` usan `SECURITY DEFINER`; revisar permisos, `search_path` y asignación de workspace. Las RPC de exportación 009 usan `SECURITY INVOKER` pero son ejecutables por `service_role`; sus lecturas actuales son globales y su catálogo rechaza columnas `workspace_id`. `/api/respaldo` necesita rediseño antes de habilitar tenants.

Consultas normales en `src/services/` usan el cliente autenticado y dependen de RLS. También hay lecturas directas en páginas de riesgo, ficha de cliente y banner de renovaciones. `/api/inteligencia` usa sesión/RLS y lecturas por lotes. `scripts/migrate-from-prototype.ts` usa `service_role` y busca por nombres/`legacy_id` globalmente: no ejecutarlo después del corte sin hacerlo workspace-aware. No hay llamadas a Supabase Storage en `src/`; auditar buckets remotos.

`src/app/providers.tsx` mantiene una caché TanStack Query durante la vida de la página; muchas claves no incluyen usuario. `src/features/cumpleanos/use-contactado.ts` usa `localStorage` por año sin usuario. `src/store/ui-store.ts` persiste solo el estado visual de la barra lateral. Se necesita limpiar o particionar caché y estado de cumpleaños al cambiar de cuenta.

## Información real pendiente

| Control | Resultado |
|---|---|
| Proyecto accesible por Supabase Studio | Sí, para consultas de solo lectura |
| Proyecto accesible por CLI | No: la cuenta CLI carece de privilegios |
| Tablas y vistas públicas remotas | 10 tablas con RLS y 8 vistas; definiciones pendientes |
| Columnas, migraciones, funciones, triggers, políticas, FK e índices | No verificado |
| `auth.users` y `public.profiles` | 1 usuario y 1 perfil; UUID del propietario verificado |
| Propietario legítimo | Identificado expresamente por el usuario; mapeo privado pendiente de acta |
| Buckets/policies de Storage | No verificado |
| Backup técnico restaurable | No verificado |

## Comparación obligatoria sobre copia real

Completar con valores **medidos**, nunca estimados. Además del conteo, guardar en ubicación privada la lista de IDs, huella por fila de todas las columnas previas a la migración (incluyendo JSON, fechas, nulos y valores financieros), huella agregada por tabla y relaciones FK. Excluir únicamente columnas técnicas nuevas del cálculo posterior.

| Entidad | Registros antes | Registros después | Integridad |
|---|---:|---:|---|
| Clientes | Pendiente | Pendiente | Pendiente |
| Pólizas | Pendiente | Pendiente | Pendiente |
| Historial | Pendiente | Pendiente | Pendiente |
| Siniestros | Pendiente | Pendiente | Pendiente |
| Tareas | Pendiente | Pendiente | Pendiente |
| Actividad | Pendiente | Pendiente | Pendiente |
| Configuraciones | Pendiente | Pendiente | Pendiente |

Ver `MULTITENANT_DATA_MIGRATION.md` para los puntos de control antes de producción.
