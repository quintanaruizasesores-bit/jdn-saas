# Cartera JDN / Quintana Ruiz — contexto para agentes de IA

Última revisión de este contexto: 17/10/2026. Alcance: todo el repositorio.
Este archivo permite compartir lo construido y continuar el desarrollo con otra IA.
Describe el código local revisado; no certifica qué cambios están desplegados ni
qué migraciones se aplicaron al proyecto Supabase remoto.

## Qué es el proyecto

Aplicación de gestión de cartera de seguros para un corredor, con identidad
visual de **Quintana Ruiz Asesores de Seguros**. El paquete conserva el nombre
`cartera-jdn`. La interfaz y los textos de negocio están en español de Argentina.

El modelo actual es **mono-corredor**, con datos de negocio compartidos entre
usuarios autenticados. No hay aislamiento por organización o productor.

## Stack y estructura

- Next.js 15.5.19 con App Router, React 19.1 y TypeScript estricto.
- Tailwind CSS v4, componentes de estilo shadcn/ui, Radix/Base UI y Lucide.
- TanStack Query para consultas y caché; Zustand para estado de interfaz.
- Supabase: PostgreSQL, Auth, SSR con cookies y políticas RLS.
- React Hook Form y Zod para formularios y validaciones.
- Recharts para gráficos; ExcelJS y jsPDF para exportaciones.
- Vitest, jsdom y Testing Library para pruebas. Destino de deploy: Vercel.

Organización del código:

- `src/app/`: páginas, layouts, autenticación y endpoints del App Router.
- `src/app/(dashboard)/`: dashboard, clientes, pólizas, siniestros, riesgo,
  tareas, cumpleaños, reportes y configuración.
- `src/features/`: formularios, componentes y hooks específicos de cada dominio.
- `src/components/ui/`: controles compartidos; `src/components/dashboard/`:
  navegación, encabezado, indicadores y gráficos del panel.
- `src/services/`: consultas y mutaciones de Supabase por dominio.
- `src/lib/`: lógica pura de negocio, utilidades y clientes Supabase.
- `src/types/database.ts`: tipos del modelo; `src/validations/`: esquemas Zod.
- `supabase/migrations/`: evolución del esquema; `scripts/`: importación legacy.
- `public/brand/quintana-ruiz/` y `public/fonts/`: identidad y fuentes locales.

El alias `@/` apunta a `src/`.

## Funcionalidades construidas

- **Autenticación:** login, registro, solicitud de recuperación, callback y cierre
  de sesión. El middleware actualiza la sesión y exige login en rutas privadas.
- **Dashboard (`/dashboard`):** clientes, pólizas, premio vigente, comisión
  aproximada, siniestros recientes y renovaciones; distribución por compañía y
  ramo, navegación desde ramo a pólizas y ranking de clientes.
- **Acceso rápido:** botón flotante «Nuevo cliente» en el layout privado compartido,
  disponible en todas las secciones; abre `/clientes/nuevo`. Respeta el área segura
  móvil y queda debajo de los diálogos. Componente `NewClientShortcut`.
- **Clientes (`/clientes`):** alta, edición, ficha, búsqueda, filtros geográficos,
  paginación y baja lógica mediante `deleted_at`. La ficha reúne pólizas,
  siniestros, tareas y riesgo. DNI/CUIT se valida contra duplicados activos
  desde la aplicación; no existe una restricción única de DNI en la base.
- **Pólizas (`/polizas`):** alta, edición, detalle, filtros, búsqueda por cliente
  o detalle, renovación, baja e historial. Estados: `VIGENTE`, `HISTORICA`, `BAJA`.
  Hay alertas de renovación a 30/15/7 días.
- **Siniestros (`/siniestros`):** listado, alta, detalle, edición y eliminación
  con confirmación; asociados al cliente y opcionalmente a una póliza.
- **Riesgo (`/riesgo`):** score de 0 a 100 y alertas según cantidad y frecuencia
  de siniestros, robos, choques responsables y monto acumulado. Niveles: bajo
  0–30, medio 31–60, alto 61–100. Motor en `src/lib/riesgo/`.
- **Tareas (`/tareas`):** seguimiento comercial, vencimientos y estados
  `PENDIENTE`, `EN_PROCESO`, `FINALIZADA`.
- **Cumpleaños (`/cumpleanos`):** resumen de hoy, próximos 7 y 30 días, búsqueda,
  edad, teléfono y vista previa de saludo con apertura de WhatsApp.
- **Configuración (`/config`):** gestión de compañías, ramos y plantilla de
  cumpleaños; también existen rutas `/config/companias`, `/config/ramos` y
  `/config/cumpleanos`.
- **Reportes (`/reportes`):** inteligencia comercial con filtros, ocho KPIs,
  evolución, mapa provincial Leaflet/Georef local, distribuciones y cross-selling.
  `/api/inteligencia` calcula en servidor usando sesión/RLS y lecturas por lotes.
  Lógica y definiciones en `src/lib/reportes/inteligencia.ts` y
  `docs/reportes-inteligencia.md`. Stock y flujos se diferencian; falta de historia
  es `null`, nunca extrapolar. No existen productores asignados ni país del cliente.
- **Respaldo (`/config/respaldo`):** copia integral XLSX de las diez tablas
  funcionales, incluidos registros inactivos y configuraciones, índice y manifiesto.
  `/api/respaldo` exige sesión ADMIN más `BACKUP_ADMIN_USER_IDS` privado del servidor.
  No basta el rol editable. Requiere la migración 009 y service_role solo servidor;
  sus funciones no son ejecutables por anon/authenticated. No es un backup técnico
  restaurable. Los endpoints parciales `/api/reportes/[tipo]` responden 410.
- **Trazabilidad:** servicios que registran actividad mediante `log_actividad`
  e historial de pólizas mantenido mediante triggers.

El gráfico de comisión mensual está en `src/components/dashboard/comision-chart.tsx`,
con lógica en `src/lib/dashboard/comision.ts`. Los importes de `prima` son todos
mensuales, confirmado por el usuario: aplicar directamente el 14%. El gráfico
muestra el stock recurrente de pólizas que aportan al corte, no las altas del mes.
Usar versiones financieras completas con fecha de efecto; no extrapolar el estado
actual al pasado. Cortes sin historia suficiente son `null`, no cero. La migración
007 añade fecha de baja, fecha de efecto y snapshots completos; no acredita meses
anteriores a su foto inicial. KPI y gráfico comparten cálculo y caché. Detalles,
límites legacy y puesta en marcha en `docs/comisiones.md`. No son comisiones cobradas. Los pendientes actuales se revisan en
`/polizas/pendientes-comision`, con motivo y acceso a edición por póliza. El motor
devuelve esos ids junto con el indicador; completar un premio actual no inventa
meses históricos.
La comisión actual no se oculta porque falten fechas o haya pólizas sin importe:
sumar los aportes calculables y mostrar pendientes por separado como subtotal.
Las fotos completas VIGENTE acreditan el stock desde su observación, no antes.

## Reglas de negocio que hay que preservar

- Las fechas SQL `DATE` opcionales deben enviarse como `null` si están vacías.
  En actualizaciones parciales, normalizar únicamente las claves presentes.
- La baja de clientes es lógica. Respetar `deleted_at` en listados de activos.
- Mantener la búsqueda de clientes y pólizas en el servidor para alcanzar datos
  fuera de la página cargada. Reutilizar `src/lib/clientes/search.ts`.
- La columna `numero_poliza` fue eliminada: no reintroducirla por basarse en el
  esquema inicial. El campo antiguo `clientes.cuit` ahora es `observaciones`.
- Cumpleaños usa `clientes.fecha_nacimiento`, compara mes/día y calcula hoy en
  `America/Argentina/Buenos_Aires`. El 29/02 se observa el 28/02 en años no bisiestos.
- WhatsApp abre un enlace `wa.me` con mensaje precargado. El envío lo realiza el
  usuario. La marca de “WhatsApp preparado” es local al navegador, por cliente
  y año; no confirma envío. Reutilizar la normalización de teléfonos existente.
- La plantilla de cumpleaños vive en `app_settings`, clave `birthday`, con
  `template` y `empresa`. Si falta la tabla, la lectura admite valores por defecto;
  el guardado requiere la migración 006. Más detalle en `docs/cumpleanos.md`.

## Base de datos y migraciones

Tablas principales: `profiles`, `clientes`, `companias`, `ramos`, `polizas`,
`poliza_historial`, `siniestros`, `tareas`, `actividad` y `app_settings`.
Las vistas `v_*` alimentan KPIs, distribución, producción, renovaciones y ranking.

Leer y aplicar las migraciones en orden al preparar una base nueva:

1. `001_initial_schema.sql`: tablas, enums, índices, triggers y RLS inicial.
2. `002_views_and_functions.sql`: vistas y función de actividad.
3. `003_cliente_legacy.sql`: identificación de clientes importados.
4. `004_drop_numero_poliza.sql`: elimina el número y recrea la vista de renovaciones.
5. `005_cliente_cuit_to_observaciones.sql`: renombra el campo del cliente.
6. `006_app_settings.sql`: configuración general y plantilla de cumpleaños.
7. `007_comisiones_recurrentes.sql`: baja efectiva y versiones financieras completas.
8. `008_companias_color.sql`: color opcional por compañía y distribución con el mismo color.
9. `009_exportacion_integral.sql`: funciones de lectura del catálogo y lotes para
   exportar datos con precisión y exclusiones de secretos. Solo service_role;
   no cambia tablas, datos históricos ni RLS. Creada en la rama, no se presume aplicada.

El README enumera solo las primeras dos en la instalación: consultar la carpeta
completa para conocer el esquema actual. Agregar migraciones nuevas para cambios
de esquema; no modificar migraciones ya aplicadas como solución a una base existente.

## Autenticación y límites actuales

- RLS está habilitado en las tablas. `profiles` permite leer y actualizar el
  perfil propio; las tablas de negocio y `app_settings` permiten acceso a todos
  los autenticados con políticas `USING (true)` / `WITH CHECK (true)`.
- Existen roles `ADMIN`, `PRODUCTOR`, `OPERADOR`, pero eso no implementa por sí
  mismo autorización por rol ni separación de carteras. El registro actual
  solicita rol `ADMIN`. El README indica deshabilitar el registro público en
  Supabase para producción.
- No hay `organization_id` ni `tenant_id` en las tablas de negocio. Convertir la
  app en multi-tenant exige cambios de esquema, políticas, backfill e inserciones.
- Usar los clientes Supabase existentes y la sesión del usuario. La clave
  `SUPABASE_SERVICE_ROLE_KEY` es solo para tareas de servidor/importación;
  nunca incluirla en código cliente ni en variables `NEXT_PUBLIC_*`.
- No copiar secretos, archivos `.env.local` ni datos personales reales a esta
  documentación, pruebas, logs o commits.

## Identidad visual

Mantener la identidad Quintana Ruiz ya implementada:

- Azul principal `#1E5BBF`, navy `#1A2556`, paneles blancos, fondos
  `#F5F8FD` / `#F0F4FA` y bordes `#E4E8F0`.
- Acciones principales azules con texto blanco; estados de éxito/error legibles.
- Poppins en encabezados y cifras; Inter para lectura y controles. Las fuentes
  se cargan con `next/font/local` y tienen licencias en `public/fonts/`.
- Reutilizar tokens de `src/app/globals.css` y componentes existentes. Conservar
  los logos originales y sus proporciones en `public/brand/quintana-ruiz/`.
- Mantener adaptación a móvil, foco visible, contraste y textos en español.
- Los colores de compañías se comparten mediante `src/lib/companias/colores.ts`:
  Holando celeste, Sancor bordó, San Cristóbal azul, Río Uruguay azul oscuro,
  Triunfo verde, Mercantil azul acero y Mapfre rojo. Reutilizar `CompaniaBadge`
  en pólizas y la misma paleta en la distribución por compañía del dashboard.
  Los usuarios pueden cambiarlos o restablecerlos en Configuración → Compañías.
  El valor opcional `companias.color` prevalece sobre la paleta inicial y viaja en
  `v_polizas_por_compania`. Invalidar los catálogos, pólizas y distribución al guardar.

## Preparación y comandos

Requisito documentado: Node.js 20+ y un proyecto Supabase.
Instalar con `npm install` (o `npm ci` para reproducir el lockfile).
Copiar `.env.example` a `.env.local` y completar los valores necesarios:
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` y
`NEXT_PUBLIC_SITE_URL`. No documentar sus valores reales.

```bash
npm run dev        # Desarrollo con Turbopack
npm run typecheck  # TypeScript sin emitir archivos
npm run lint       # ESLint
npm test           # Vitest
npm run build      # Build de producción
npm start          # Servir el build
```

`npm run format:check` revisa formato. `npm run format` reescribe el repositorio
completo: preferir formatear solo los archivos cambiados.

La importación desde el prototipo está en `scripts/migrate-from-prototype.ts`:
`npm run migrate:prototype -- --html=/ruta/cartera_jdn-5.html`.
El script usa `dotenv/config`; asegurar que las variables requeridas estén en
su entorno (no asumir que carga `.env.local` como Next.js). Escribe en Supabase
y puede duplicar siniestros si se repite: no usarlo como comando de verificación.

## Cómo continuar el desarrollo

- Leer `git status` antes de editar y preservar los cambios ajenos o en curso,
  incluidas otras ramas/worktrees dentro de `.claude/`.
- Seguir la separación existente entre páginas, features, servicios, esquemas y
  lógica pura. Reutilizar los clientes de `src/lib/supabase/` según navegador o servidor.
- Mantener tipos y validaciones alineados con las migraciones; conservar la
  invalidación de caché de TanStack Query después de las mutaciones.
- Verificar lo que se cambió con pruebas relevantes; usar typecheck, lint y build
  cuando corresponda. Reportar únicamente comprobaciones realmente ejecutadas.
- Hay pruebas de riesgo, reportes, clientes, búsqueda, cumpleaños, servicios y
  componentes, además de comisión en el árbol local. Vitest usa jsdom; las
  pruebas de componentes no sustituyen un recorrido real con Supabase.
- No hay suite Playwright configurada. Los resultados históricos de pruebas en
  `docs/cumpleanos.md` no certifican el estado actual del repositorio.
- Mantener este archivo al cambiar módulos, reglas de negocio, estructura o
  esquema. Consultar `README.md` y `docs/cumpleanos.md` como documentación adicional.

## Graphify

Cuando el usuario escriba `/graphify`, usar el skill instalado de Graphify y leer
sus instrucciones antes de cualquier otra acción. La ruta indicada por el usuario
es `~/.Codex/skills/graphify/SKILL.md`; si no existe, localizar la instalación
disponible (en este entorno: `~/.agents/skills/graphify/SKILL.md`).
Este archivo no implica que exista un grafo generado ni que Graphify se haya ejecutado.
