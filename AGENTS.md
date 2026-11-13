# Cartera JDN / Quintana Ruiz — contexto operativo

Alcance: todo el repositorio. Revisado contra el código local el 13/11/2026. Este archivo no acredita el despliegue ni las migraciones aplicadas en Supabase remoto. No hay otros `AGENTS.md` en el árbol del proyecto.

## Proyecto y arquitectura

Gestor de cartera de seguros mono-corredor, con interfaz en español de Argentina e identidad **Quintana Ruiz Asesores de Seguros**. Los datos de negocio son compartidos entre usuarios autenticados; no hay `organization_id`, `tenant_id` ni productor asignado. El paquete se llama `cartera-jdn`.

- Next.js 15.5.19 (App Router), React 19.1, TypeScript estricto, Tailwind CSS v4, componentes UI basados en Radix/Base UI y Lucide. `@/` apunta a `src/`.
- Supabase PostgreSQL, Auth, RLS y SSR con cookies; TanStack Query para caché, Zustand para estado de interfaz, React Hook Form + Zod para formularios. Recharts y Leaflet para visualización; ExcelJS para XLSX. Hay utilidades jsPDF en `src/lib/reportes/format.ts`, pero la exportación integral vigente es XLSX.
- `src/app/`: rutas y endpoints; `src/app/(dashboard)/`: secciones privadas; `src/features/`: UI y hooks de dominio; `src/components/`: componentes compartidos; `src/services/`: acceso a datos; `src/lib/`: lógica de negocio y clientes Supabase; `src/validations/` y `src/types/database.ts`: esquemas y tipos; `supabase/migrations/`: esquema; `scripts/`: importación legacy.
- Vitest, jsdom, Testing Library y pruebas de integración con PGlite. Vercel es el destino de deploy documentado en `README.md`; la configuración de Next.js no define ajustes especiales.

## Funcionalidades presentes

- **Auth:** `/login`, `/register`, `/recuperar`, callback y logout. `src/middleware.ts` refresca sesión; redirige rutas privadas al login y devuelve 401 para APIs sin sesión. La recuperación usa `NEXT_PUBLIC_SITE_URL`.
- **Tablero (`/dashboard`):** KPIs de clientes, pólizas, premio, comisión mensual estimada, siniestros recientes y renovaciones; distribución por compañía/ramo y top 10 clientes por premio. La campana solo aparece aquí: tareas `PENDIENTE` vencidas o dentro de 7 días, calculadas en horario de Argentina; muestra hasta cinco y enlaza a `/tareas`, sin estado de lectura. El layout privado incluye alerta de renovaciones y acceso flotante a `/clientes/nuevo`.
- **Clientes (`/clientes`):** alta, edición, ficha, filtros, búsqueda y paginación en Supabase, baja lógica (`deleted_at`). La ficha reúne pólizas, siniestros, tareas y riesgo. DNI/CUIT duplicado se comprueba entre clientes activos en la aplicación; no hay índice único en la base. `clientes.actividad` es opcional y requiere migración 011 para guardar.
- **Pólizas (`/polizas`):** alta, edición, ficha, filtros, renovación, baja e historial. Estados `VIGENTE`, `HISTORICA`, `BAJA`. Búsqueda por cliente/detalle en servidor; una patente completa argentina en `detalle` admite espacios, puntos o guiones, exige coincidencia exacta completa y solo ofrece variantes de un carácter cuando no hay exacta. Formulario con fechas DD/MM/AAAA hacia valores ISO, fecha de efecto financiera y baja efectiva. Selector de compañía con búsqueda sin acentos y catálogo paginado completo. `/polizas/pendientes-comision` lista registros sin aporte calculable y su motivo.
- **Siniestros (`/siniestros`):** listado, alta, ficha, edición y eliminación con confirmación; relación obligatoria con cliente y opcional con póliza.
- **Riesgo (`/riesgo`):** score 0–100 por frecuencia, tipo, responsabilidad e importe de siniestros; bajo 0–30, medio 31–60, alto 61–100. Motor en `src/lib/riesgo/`.
- **Tareas (`/tareas`):** estados `PENDIENTE`, `EN_PROCESO`, `FINALIZADA`. Alta desde esta ruta sin vínculos; desde fichas de cliente, póliza y siniestro, `TareaDialog` precarga cliente y opcionalmente póliza/siniestro. Las fichas de póliza y siniestro listan tareas vinculadas. `fetchTareas` filtra por estado y esos tres IDs; las relaciones adicionales requieren migración 010.
- **Cumpleaños (`/cumpleanos`):** hoy, próximos 7/30 días, búsqueda, edad, teléfono, vista previa y apertura de WhatsApp. Configuración de plantilla en `/config/cumpleanos`.
- **Configuración (`/config`):** compañías, ramos, plantilla de cumpleaños y `/config/respaldo`. Colores editables de compañías según migración 008.
- **Reportes (`/reportes`):** vistas Resumen, Rentabilidad, Salud, Oportunidades y Calidad; filtros, tendencias, mapa provincial Leaflet con GeoJSON local, distribuciones y cross-selling. `/api/inteligencia` valida filtros, exige sesión, consulta por lotes con RLS y calcula en servidor. Definiciones en `src/lib/reportes/inteligencia.ts` y `docs/reportes-inteligencia.md`.
- **Respaldo:** `/api/respaldo` genera XLSX integral de diez tablas funcionales, incluso registros inactivos, con índice y manifiesto. Corre con la **sesión del usuario** (no `service_role`): las RPC `exportacion_catalogo`/`exportacion_lote` son `SECURITY INVOKER` y la RLS por workspace (migración 013) recorta cada lectura, de modo que cada usuario exporta **solo su propia cartera**. Exige sesión autenticada; ya no usa perfil `ADMIN` ni `BACKUP_ADMIN_USER_IDS`. Requiere migraciones 009 y 014 (014 concede las RPC a `authenticated` y las retira de `service_role`, excluye la columna interna `workspace_id` y saltea la tabla `workspaces`). La columna interna `workspace_id` no aparece en el XLSX. Es copia de datos, no backup técnico restaurable. `/api/reportes/[tipo]` devuelve 410 para descargas parciales retiradas. Acoplamiento de despliegue: aplicar 012→013→014 y subir el código a la vez; si falta 014, `authenticated` no tiene `EXECUTE` y el endpoint responde 503 (falla segura, sin fuga de datos).
- **Trazabilidad:** servicios registran actividad mediante `log_actividad`; triggers mantienen `poliza_historial`.

## Reglas de negocio que deben conservarse

- `prima` es mensual; la estimación de comisión aplica directamente 14 %. El KPI del tablero, su ranking y la página de pendientes usan `src/features/dashboard/use-comision-dashboard.ts` y `src/lib/dashboard/comision.ts`. El motor también calcula series históricas para reportes; el tablero actual no muestra un gráfico mensual de comisión. Son estimaciones de stock recurrente, no comisiones cobradas ni altas del mes.
- Para cortes históricos, usar versiones financieras completas y fecha de efecto. La migración 007 acredita fotos desde su observación, nunca meses anteriores; ausencia de historia es `null`, no cero. El total actual suma aportes calculables y expone pendientes por separado; completar un premio hoy no crea historia pasada. Ver `docs/comisiones.md`.
- Enviar fechas SQL `DATE` opcionales vacías como `null`; en updates parciales normalizar solo claves presentes. No borrar `fecha_baja` por ocultar su campo en el formulario ni alterar `fecha_efecto` en una edición administrativa.
- Respetar `clientes.deleted_at` en listados activos. Conservar búsquedas de clientes y pólizas en Supabase para cubrir toda la cartera, no solo la página cargada; reutilizar `src/lib/clientes/search.ts`.
- `numero_poliza` fue eliminada en migración 004. `clientes.cuit` se renombró a `observaciones` en 005; el DNI/CUIT identificador está en `clientes.dni`.
- Cumpleaños usa `clientes.fecha_nacimiento` y el día en `America/Argentina/Buenos_Aires`; el 29/02 se observa el 28/02 en años no bisiestos. `wa.me` solo prepara el mensaje: lo envía el usuario. La marca «WhatsApp preparado» vive en `localStorage` por cliente y año, sin confirmar envío. Reutilizar `src/lib/cumpleanos/telefono.ts`.
- Plantilla de cumpleaños en `app_settings` clave `birthday` (`template`, `empresa`). La lectura admite valores predeterminados si falta la tabla; guardar exige migración 006. Ver `docs/cumpleanos.md`.
- Colores de compañías: usar `src/lib/companias/colores.ts`, `CompaniaBadge` y el color opcional `companias.color` (prevalece sobre paleta inicial); invalidar catálogos, pólizas y distribución al guardar. Ver `docs/colores-companias.md`.

## Esquema, permisos y producción

Tablas: `profiles`, `clientes`, `companias`, `ramos`, `polizas`, `poliza_historial`, `siniestros`, `tareas`, `actividad`, `app_settings`. Las vistas `v_*` alimentan KPIs, distribuciones, renovaciones y ranking. Aplicar las migraciones **en orden 001–014** al preparar una base nueva; consultar `supabase/migrations/`, no solo la lista incompleta del `README.md`. Cambios de esquema nuevos requieren migración nueva; no reescribir migraciones ya aplicadas. No presumir que ninguna migración local esté desplegada remotamente. En particular: 007 historial financiero, 008 colores, 009 funciones de exportación, 010 FKs de tareas (`ON DELETE SET NULL`), 011 actividad de clientes, 012 workspaces y backfill, 013 aislamiento RLS por workspace y 014 exportación tenant-aware (RPC de exportación a `authenticated`). El corte multitenant 012→013→014 va junto con el despliegue del código que consulta por sesión.

RLS permite al usuario autenticado leer/actualizar su propio `profiles`; las tablas de negocio y `app_settings` tienen políticas amplias para todos los autenticados. Los roles `ADMIN`, `PRODUCTOR`, `OPERADOR` no aíslan carteras ni autorizan operaciones generales. El registro solicita `ADMIN` y el propio perfil es editable: no basar permisos sensibles solo en ese rol. Deshabilitar registro público en Supabase para producción según `README.md`. La exportación integral corre con la sesión del usuario bajo RLS por workspace: la migración 014 concede sus RPC a `authenticated` (no `service_role`) y cada usuario exporta solo su cartera; ya no hay allowlist global de IDs.

Usar `src/lib/supabase/client.ts` o `server.ts` según contexto y la sesión del usuario para operaciones normales. `SUPABASE_SERVICE_ROLE_KEY` omite RLS: solo servidor/importador, nunca `NEXT_PUBLIC_*` ni código cliente. No incluir secretos, `.env.local` ni datos personales reales en documentación, pruebas, logs o commits. El GeoJSON del mapa se sirve desde `public/geo/`; WhatsApp es un enlace externo, no una API de envío.

## Desarrollo y convenciones

Requisito documentado: Node.js 20+ y proyecto Supabase. `npm ci` reproduce el lockfile; configurar `.env.local` desde `.env.example` con URL y clave pública de Supabase y `NEXT_PUBLIC_SITE_URL`, más variables privadas solo cuando corresponda.

```bash
npm run dev        # Next con Turbopack
npm run typecheck  # tsc --noEmit
npm run lint       # ESLint
npm test           # Vitest
npm run build      # build de producción
npm start          # servir el build
```

`npm run format:check` verifica formato. `npm run format` reescribe todo el repositorio: formatear solo archivos modificados. No hay suite Playwright configurada; las pruebas de componentes y PGlite no sustituyen un recorrido con Supabase real. Verificar cambios con pruebas relevantes y reportar solo las comprobaciones ejecutadas.

`npm run migrate:prototype -- --html=/ruta/cartera_jdn-5.html` ejecuta `scripts/migrate-from-prototype.ts` y **escribe** en Supabase; puede duplicar siniestros si se repite. Usa `dotenv/config` y no carga `.env.local` automáticamente como Next.js. No usar como verificación.

Antes de editar, leer `git status` y preservar trabajo ajeno, incluso worktrees en `.claude/`. Mantener la separación entre rutas, features, servicios, esquemas y lógica pura; al cambiar datos, alinear tipos, Zod, migración e invalidaciones de TanStack Query. Mantener la identidad de `src/app/globals.css`: azul `#1E5BBF`, navy `#1A2556`, Poppins/Inter locales, logos originales, diseño móvil, foco visible y textos en español.

## Graphify

Si el usuario escribe `/graphify`, leer y seguir el skill instalado antes de cualquier otra acción: `~/.Codex/skills/graphify/SKILL.md` o, si falta, `~/.agents/skills/graphify/SKILL.md`. Este archivo no supone que exista un grafo generado.
