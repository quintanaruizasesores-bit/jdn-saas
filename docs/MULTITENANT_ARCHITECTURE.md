# Arquitectura multi-tenant propuesta

**Estado:** diseño local; pendiente de confrontar con esquema real, propietario y backup.

Una cuenta de `auth.users` posee exactamente un `workspace` privado. Los datos comerciales comparten esquema PostgreSQL y reciben `workspace_id` no nulo. No se crean cuentas sustitutas ni se cambian UUID comerciales. `profiles` sigue vinculado al mismo usuario; su rol editable no autoriza lectura de otros tenants.

`clientes`, `companias`, `ramos`, `polizas`, `poliza_historial`, `siniestros`, `tareas`, `actividad` y `app_settings` son privados. Compañías/ramos existentes conservan IDs y colores; nuevos usuarios comienzan con catálogos propios vacíos (la paleta de UI puede ofrecer colores predeterminados). La plantilla de cumpleaños existente se asigna al propietario; nuevos usuarios usan el valor predeterminado de la aplicación hasta guardar una fila propia. `app_settings` requiere clave compuesta `(workspace_id,key)`. Índices únicos de nombre en compañía/ramo requieren incluir `workspace_id`.

La base asigna el workspace de inserción desde `auth.uid()`; RLS `USING`/`WITH CHECK` y FK compuestas `(workspace_id, entidad_id)` impiden lecturas, escrituras y asociaciones cruzadas. Ningún `workspace_id` del cliente es autoridad. Las vistas `v_*` deben recrearse con `security_invoker=true` y las RPC privilegiadas deben restringirse explícitamente al workspace autenticado. Evitar joins por `usuario_id` histórico: este puede ser nulo o identificar al operador, no al propietario.

El frontend usa la sesión real. Al cambiar de usuario, limpia TanStack Query y separa `localStorage` de cumpleaños por UUID; la clave histórica sin usuario permanece guardada pero no se lee para evitar atribuirla a otra cuenta. Migrarla solo tras confirmar el UUID del propietario original. `Zustand` actualmente solo guarda preferencia visual. El módulo de reportes mantiene fórmulas y cortes; RLS cambia el universo de filas. El XLSX integral debe enumerar solo el workspace de la sesión, sin usar una lectura global con `service_role`.

No hay invitaciones ni workspace compartido. El registro público permanece cerrado hasta completar el aislamiento y decidir expresamente abrirlo. Ver `MULTITENANT_SECURITY.md`.
