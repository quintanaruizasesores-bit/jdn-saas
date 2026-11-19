# Graph Report - jdn-saas  (2026-11-19)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 1539 nodes · 3900 edges · 122 communities (86 shown, 24 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 7 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `88da1020`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- fechas.ts
- utils.ts
- inteligencia.ts
- comision.ts
- crosssell.service.ts
- reportes-ui.tsx
- package.json
- 001_initial_schema.sql
- dependencies
- createClient
- database.ts
- react
- cumpleanos-page.tsx
- lucide-react
- cn
- motor.ts
- devDependencies
- components.json
- polizas/[id]/page.tsx
- cliente-combobox.tsx
- createClient
- config-manager.tsx
- 017_crosssell_correos.sql
- compilerOptions
- baja/route.ts
- crosssell.schema.ts
- siniestro-form.tsx
- cliente-combobox.test.tsx
- correo/plantilla.ts
- vitest
- prueba/route.ts
- ConfigManager
- siniestros.service.ts
- dropdown-menu.tsx
- polizas.service.ts
- sheet.tsx
- task-alert-bell.tsx
- email-notifications-editor.test.tsx
- cron.ts
- Cartera JDN
- crosssell-module.tsx
- resumen.ts
- Módulo Cumpleaños
- respaldo.test.ts
- cliente-form.tsx
- (dashboard)/layout.tsx
- enviar/route.ts
- notificaciones.service.ts
- 016_crosssell_core.sql
- reportes/format.ts
- scripts
- cron/route.ts
- 015_notificaciones_email.sql
- Cross-Selling (venta cruzada asistida)
- Recordatorios automáticos por email (tareas vencidas)
- 012_workspaces_expand.sql
- enviar/route.test.ts
- clientes.service.ts
- reportes-dashboard.tsx
- respaldo.ts
- Comisión mensual recurrente estimada
- Reportes e inteligencia de cartera
- poliza-date-field.tsx
- Cartera JDN / Quintana Ruiz — contexto operativo
- actividad
- app/layout.tsx
- public.exportacion_catalogo
- @supabase/ssr
- zod
- respaldo/route.ts
- update_updated_at
- 007_comisiones_recurrentes.sql
- getCompaniaColor
- normalizar.ts
- updatePoliza
- tareas
- public.polizas
- eslint.config.mjs
- regenerar/route.ts
- prueba/route.test.ts
- alert.tsx
- public.exportacion_catalogo
- Auditoría multi-tenant (13/11/2026)
- vercel.json
- ResizeObserver
- estado-badge.tsx
- use-contactado.ts
- mapa-argentina.tsx
- public.v_polizas_por_compania
- Migración de datos de la cartera existente
- Controles de seguridad multi-tenant
- sonner.tsx
- CLAUDE.md
- colores-companias.md
- MULTITENANT_ARCHITECTURE.md
- MULTITENANT_ROLLBACK.md
- MULTITENANT_VALIDATION.md
- lint-staged
- postcss.config.mjs
- geo/README.md
- @vitejs/plugin-react
- idx_clientes_legacy_nombre
- public.actividad
- public.app_settings
- public.polizas
- public.clientes
- public.poliza_historial
- public.polizas
- public.siniestros
- public.tareas

## God Nodes (most connected - your core abstractions)
1. `cn()` - 107 edges
2. `react` - 73 edges
3. `createClient()` - 70 edges
4. `vitest` - 64 edges
5. `@tanstack/react-query` - 45 edges
6. `Button` - 41 edges
7. `lucide-react` - 41 edges
8. `@supabase/supabase-js` - 29 edges
9. `sonner` - 27 edges
10. `periodoComision()` - 24 edges

## Surprising Connections (you probably didn't know these)
- `main()` --calls--> `parseSiniestroText()`  [EXTRACTED]
  scripts/migrate-from-prototype.ts → src/lib/riesgo/parse-siniestro-legacy.ts
- `main()` --calls--> `splitNombreCompleto()`  [EXTRACTED]
  scripts/migrate-from-prototype.ts → src/lib/utils/format.ts
- `configure()` --indirect_call--> `useComisionDashboard()`  [INFERRED]
  src/app/(dashboard)/polizas/pendientes-comision/page.test.tsx → src/features/dashboard/use-comision-dashboard.ts
- `NavLink()` --calls--> `cn()`  [EXTRACTED]
  src/components/dashboard/mobile-nav.tsx → src/lib/utils.ts
- `AlertAction()` --calls--> `cn()`  [EXTRACTED]
  src/components/ui/alert.tsx → src/lib/utils.ts

## Import Cycles
- None detected.

## Communities (122 total, 24 thin omitted)

### Community 0 - "fechas.ts"
Cohesion: 0.05
Nodes (54): CumpleanosPage(), PreparedRow, clienteHoy(), calcularEdad(), daysUntilBirthday(), diffInDays(), FechaPartes, formatCumpleanos() (+46 more)

### Community 1 - "utils.ts"
Cohesion: 0.06
Nodes (44): recharts, extractData(), main(), PrototypePoliza, CHART_COLORS, DashboardPage(), PendientesComisionPage(), configure() (+36 more)

### Community 2 - "inteligencia.ts"
Cohesion: 0.09
Nodes (35): dynamic, GET(), maxDuration, m, VersionComision, aliases, EXTERIOR, nombreProvincia() (+27 more)

### Community 3 - "comision.ts"
Cohesion: 0.09
Nodes (30): calcularClientesTop(), ClienteTop, PolizaClienteTop, redondear(), now, aporteComision(), calcularComisionMensual(), construirVersionesComision() (+22 more)

### Community 4 - "crosssell.service.ts"
Cohesion: 0.09
Nodes (40): CategoriasEditor(), PlantillasEditor(), ReglasEditor(), asegurarCategoriasDefault(), asegurarPlantillasDefault(), asegurarReglasDefault(), autosugerirMapeos(), cargarCartera() (+32 more)

### Community 5 - "reportes-ui.tsx"
Cohesion: 0.15
Nodes (29): @radix-ui/react-dialog, CrossSelling(), GeografiaPanel(), ListaRegistrosDialog(), Registro, Acento, acentoBarra, Barras() (+21 more)

### Community 6 - "package.json"
Cohesion: 0.05
Nodes (36): name, private, version, @base-ui/react, clsx, date-fns, dotenv, eslint (+28 more)

### Community 7 - "001_initial_schema.sql"
Cohesion: 0.11
Nodes (32): clientes, companias, handle_new_user(), idx_clientes_deleted, idx_clientes_dni, idx_clientes_nombre, idx_companias_nombre, idx_polizas_cliente (+24 more)

### Community 8 - "dependencies"
Cohesion: 0.06
Nodes (35): dependencies, @base-ui/react, class-variance-authority, clsx, cmdk, date-fns, exceljs, @hookform/resolvers (+27 more)

### Community 9 - "createClient"
Cohesion: 0.14
Nodes (20): @tanstack/react-query, EditarClientePage(), NuevoClientePage(), Providers(), RenewalAlertsBanner(), Skeleton(), BirthdayTemplateEditor(), SAMPLE (+12 more)

### Community 10 - "database.ts"
Cohesion: 0.06
Nodes (31): BadgeVariant, ESTADO_LABEL, ESTADO_OPCIONES, ESTADO_VARIANT, Actividad, ActividadEntidad, AppSetting, CompaniaEstado (+23 more)

### Community 11 - "react"
Cohesion: 0.22
Nodes (16): react, sonner, Button, ButtonProps, buttonVariants, Input, Label, SelectContent (+8 more)

### Community 12 - "cumpleanos-page.tsx"
Cohesion: 0.19
Nodes (18): PolizasListado(), SiniestroDetalle, SiniestroDetallePage(), SiniestrosPage(), AppHeader(), EmptyState(), ErrorState(), Table() (+10 more)

### Community 13 - "lucide-react"
Cohesion: 0.15
Nodes (19): class-variance-authority, lucide-react, Badge(), badgeVariants, Checkbox(), ConfirmDialog(), ConfirmDialogProps, DialogContent (+11 more)

### Community 14 - "cn"
Cohesion: 0.11
Nodes (22): Avatar(), AvatarBadge(), AvatarFallback(), AvatarGroup(), AvatarGroupCount(), AvatarImage(), Card, CardContent() (+14 more)

### Community 15 - "motor.ts"
Cohesion: 0.12
Nodes (24): calcularScore(), clamp(), coberturasVigentesPorCliente(), detectarOportunidades(), fechaValida(), MotorCategoria, MotorCliente, MotorEntrada (+16 more)

### Community 16 - "devDependencies"
Cohesion: 0.08
Nodes (25): devDependencies, dotenv, @electric-sql/pglite, eslint, eslint-config-next, eslint-config-prettier, @eslint/eslintrc, husky (+17 more)

### Community 17 - "components.json"
Cohesion: 0.09
Nodes (21): aliases, components, hooks, lib, ui, utils, iconLibrary, menuAccent (+13 more)

### Community 18 - "polizas/[id]/page.tsx"
Cohesion: 0.24
Nodes (15): @supabase/supabase-js, EditarPolizaPage(), PolizaDetallePage(), NuevaPolizaPage(), invalidarMetricasPolizas(), PolizaForm(), fetchTodasCompanias(), createPoliza() (+7 more)

### Community 19 - "cliente-combobox.tsx"
Cohesion: 0.17
Nodes (14): cmdk, @radix-ui/react-popover, Command, CommandEmpty, CommandInput, CommandItem, CommandList, PopoverContent (+6 more)

### Community 20 - "createClient"
Cohesion: 0.15
Nodes (16): dynamic, GET(), headers, maxDuration, runtime, GET(), RecuperarPage(), handleSubmit() (+8 more)

### Community 21 - "config-manager.tsx"
Cohesion: 0.16
Nodes (10): ACCION_LABELS, ClienteDetallePage(), TabsContent, TabsList, TabsTrigger, ConfigTab, RespaldoPanel(), softDeleteCliente() (+2 more)

### Community 22 - "017_crosssell_correos.sql"
Cohesion: 0.15
Nodes (16): public.crosssell_categoria, public.crosssell_oportunidad, idx_crosssell_correo_cliente, idx_crosssell_correo_enviado, idx_crosssell_correo_oportunidad, public.crosssell_correo, public.crosssell_plantilla, public.crosssell_supresion (+8 more)

### Community 23 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 24 - "baja/route.ts"
Cohesion: 0.22
Nodes (15): dynamic, GET(), pagina(), POST(), registrar(), runtime, b64url(), BajaPayload (+7 more)

### Community 25 - "crosssell.schema.ts"
Cohesion: 0.11
Nodes (17): CrossSellCategoriaInput, crossSellCategoriaSchema, CrossSellCorreoDraftInput, crossSellCorreoDraftSchema, CrossSellCorreoEnviarInput, CrossSellExclusionInput, crossSellExclusionSchema, CrossSellOportunidadUpdateInput (+9 more)

### Community 26 - "siniestro-form.tsx"
Cohesion: 0.20
Nodes (11): react-hook-form, EditarSiniestroPage(), NuevoSiniestroForm(), RESPONSABILIDADES, SiniestroForm(), SiniestroFormProps, TIPOS, fetchPolizasByCliente() (+3 more)

### Community 27 - "cliente-combobox.test.tsx"
Cohesion: 0.14
Nodes (6): @testing-library/react, @testing-library/user-event, mockFetchClienteById, mockFetchClientes, companias, base

### Community 28 - "correo/plantilla.ts"
Cohesion: 0.21
Nodes (14): CorreoEditor(), construirCorreo(), CorreoRenderizado, generarBorrador(), PLANTILLAS_SUGERIDAS, PlantillaSugerida, renderPlantilla(), vars (+6 more)

### Community 29 - "vitest"
Cohesion: 0.14
Nodes (6): @electric-sql/pglite, vitest, mocks, db, db, db

### Community 30 - "prueba/route.ts"
Cohesion: 0.20
Nodes (12): dynamic, POST(), privateHeaders, runtime, emailConfigurado(), EmailSendError, safeText(), sendEmail() (+4 more)

### Community 31 - "ConfigManager"
Cohesion: 0.13
Nodes (5): ConfigManager(), deleteCompania(), upsertCompania(), deleteRamo(), upsertRamo()

### Community 32 - "siniestros.service.ts"
Cohesion: 0.23
Nodes (10): TareasPage(), logActividad(), createSiniestro(), updateSiniestro(), createTarea(), deleteTarea(), fetchTareas(), updateTarea() (+2 more)

### Community 33 - "dropdown-menu.tsx"
Cohesion: 0.12
Nodes (9): DropdownMenuCheckboxItem(), DropdownMenuContent(), DropdownMenuItem(), DropdownMenuLabel(), DropdownMenuRadioItem(), DropdownMenuSeparator(), DropdownMenuShortcut(), DropdownMenuSubContent() (+1 more)

### Community 34 - "polizas.service.ts"
Cohesion: 0.30
Nodes (11): buildClienteSearchFilters(), CLIENTE_SEARCH_COLUMNS, sanitizeSearchTerm(), distanciaPatente(), fragmentosPatente(), patenteBuscada(), patentesEnDetalle(), aproximacionPatente() (+3 more)

### Community 35 - "sheet.tsx"
Cohesion: 0.17
Nodes (10): NavLink(), principales, secundarias, Sheet(), SheetContent(), SheetDescription(), SheetFooter(), SheetHeader() (+2 more)

### Community 36 - "task-alert-bell.tsx"
Cohesion: 0.25
Nodes (8): TaskAlertBell(), mocks, dateLabel(), getTaskAlertWindow(), isoDate(), taskDueLabel(), fetchTareasAlertas(), TareaAlerta

### Community 37 - "email-notifications-editor.test.tsx"
Cohesion: 0.22
Nodes (10): desactivado, fetchEmailPrefs, saveEmailPrefs, APP_TIMEZONE, DEFAULT_EMAIL_NOTIF_PREFS, normalizePrefs(), EmailNotifPrefs, EmailNotifPrefsInput (+2 more)

### Community 38 - "cron.ts"
Cohesion: 0.21
Nodes (10): CronDeps, CronResult, NOW, prefBase, unaTarea, WorkspacePref, fechaLocal(), horaLocal() (+2 more)

### Community 39 - "Cartera JDN"
Cohesion: 0.14
Nodes (13): Arquitectura, Cartera JDN, Configuración, Deploy en Vercel, Identidad visual — Quintana Ruiz, Licencia, Módulos, Requisitos (+5 more)

### Community 40 - "crosssell-module.tsx"
Cohesion: 0.18
Nodes (10): dynamic, Bandeja(), Detalle(), ABIERTOS, computeKpis(), CrossSellingModule(), fetchOportunidadesApi(), OPORTUNIDADES_KEY (+2 more)

### Community 41 - "resumen.ts"
Cohesion: 0.29
Nodes (12): atrasoLabel(), construirPruebaEmail(), construirResumenEmail(), diasDeAtraso(), escapeHtml(), fechaLegible(), MAX_TAREAS_EMAIL, parseIso() (+4 more)

### Community 42 - "Módulo Cumpleaños"
Cohesion: 0.15
Nodes (12): Comandos de verificación, Cumpleaños y fechas, Dónde se guarda la plantilla, Estado "WhatsApp preparado", Generación del link `wa.me`, Módulo Cumpleaños, Normalización de teléfonos, Qué se agregó (+4 more)

### Community 43 - "respaldo.test.ts"
Cohesion: 0.22
Nodes (10): GET(), catalogosIguales(), escribirRespaldo(), FuenteRespaldo, catalogo, filas, fuente, generar() (+2 more)

### Community 44 - "cliente-form.tsx"
Cohesion: 0.37
Nodes (8): ClienteForm(), displayToIso(), isoToDisplay(), maskFechaInput(), MIN_YEAR, validateFechaNacimiento(), ClienteFormData, clienteSchema

### Community 45 - "(dashboard)/layout.tsx"
Cohesion: 0.23
Nodes (7): zustand, AppSidebar(), navItems, MobileNav(), NewClientShortcut(), UiState, useUiStore

### Community 46 - "enviar/route.ts"
Cohesion: 0.23
Nodes (11): dynamic, headers, POST(), runtime, urlBaja(), contarEnviosPrevios(), CORREO_TABLE, emailSuprimido() (+3 more)

### Community 47 - "notificaciones.service.ts"
Cohesion: 0.24
Nodes (9): EmailNotifPrefsRow, fetchEmailPrefs(), fetchEmailPrefsRow(), fetchTareasVencidas(), nombreCliente(), PREFS_TABLE, TareaVencidaRow, makeQuery() (+1 more)

### Community 48 - "016_crosssell_core.sql"
Cohesion: 0.24
Nodes (11): idx_crosssell_ramo_map_categoria, public.crosssell_categoria, public.crosssell_ramo_map, public.assign_workspace_id, public.ramos, public.workspaces, tr_crosssell_categoria_updated_at, tr_crosssell_ramo_map_updated_at (+3 more)

### Community 49 - "reportes/format.ts"
Cohesion: 0.29
Nodes (9): RFC-4180, exceljs, jspdf, jspdf-autotable, Cell, cellToString(), toCsv(), toPdf() (+1 more)

### Community 50 - "scripts"
Cohesion: 0.18
Nodes (11): scripts, build, dev, format, format:check, lint, migrate:prototype, start (+3 more)

### Community 51 - "cron/route.ts"
Cohesion: 0.24
Nodes (8): autorizado(), dynamic, GET(), maxDuration, privateHeaders, runtime, serviceClient, procesarResumenDiario()

### Community 52 - "015_notificaciones_email.sql"
Cohesion: 0.24
Nodes (9): idx_notif_envios_workspace, public.notificacion_email_envios, public.notificacion_email_prefs, public.assign_workspace_id, public.workspaces, tr_notif_envios_updated_at, tr_notif_prefs_updated_at, trg_notif_prefs_workspace (+1 more)

### Community 53 - "Cross-Selling (venta cruzada asistida)"
Cohesion: 0.20
Nodes (9): 1. Modelo comercial, 2. Detección y priorización, 3. Correo individual asistido, 4. Integración con Resend (plan gratuito), 5. Variables de entorno, 6. Migraciones, 7. Qué queda pendiente / futuro, 8. Pruebas (+1 more)

### Community 54 - "Recordatorios automáticos por email (tareas vencidas)"
Cohesion: 0.20
Nodes (9): Archivos principales, Cómo se fija el horario y se evitan duplicados, Desarrollo y pruebas, Modelo de datos y aislamiento, Puesta en marcha (una sola vez, para toda la app), Qué se agregó, Qué tareas entran en el resumen, Recordatorios automáticos por email (tareas vencidas) (+1 more)

### Community 55 - "012_workspaces_expand.sql"
Cohesion: 0.20
Nodes (8): public.create_user_workspace, idx_companias_workspace_nombre, idx_ramos_workspace_nombre, public.workspaces, auth.users, public.companias, public.ramos, tr_profile_create_workspace

### Community 56 - "enviar/route.test.ts"
Cohesion: 0.20
Nodes (7): contarEnviosPreviosMock, CORREO, createClientMock, emailConfiguradoMock, emailSuprimidoMock, Scenario, sendEmailMock

### Community 57 - "clientes.service.ts"
Cohesion: 0.31
Nodes (7): ClientesPage(), assertDniUnico(), ClientesFilters, createCliente(), fetchClientes(), normalizeClienteDates(), updateCliente()

### Community 58 - "reportes-dashboard.tsx"
Cohesion: 0.31
Nodes (7): esVista(), inicial(), ReportesDashboard(), VistaId, VISTAS, fecha(), Salud()

### Community 59 - "respaldo.ts"
Cohesion: 0.24
Nodes (6): db, CatalogoExportado, ColumnaExportada, EXCEL_FILAS_DATOS, FilaExportada, TablaExportada

### Community 60 - "Comisión mensual recurrente estimada"
Cohesion: 0.22
Nodes (8): Cambio mínimo persistente: migración 007, Comisión mensual recurrente estimada, Criterio de cálculo, Datos revisados y decisión de negocio, Fuentes y presentación, Límite histórico encontrado, Revisar y completar registros pendientes, Verificación

### Community 61 - "Reportes e inteligencia de cartera"
Cohesion: 0.22
Nodes (8): Archivos de esta implementación, Auditoría previa (17/10/2026), Definiciones y límites, Diseño, Exportación integral y habilitación, Limitaciones y evolución posible, Reportes e inteligencia de cartera, Verificaciones ejecutadas

### Community 62 - "poliza-date-field.tsx"
Cohesion: 0.61
Nodes (6): PolizaDateField(), typingDate(), displayDate(), isIsoDate(), parseDisplayDate(), optionalDate

### Community 63 - "Cartera JDN / Quintana Ruiz — contexto operativo"
Cohesion: 0.25
Nodes (7): Cartera JDN / Quintana Ruiz — contexto operativo, Desarrollo y convenciones, Esquema, permisos y producción, Funcionalidades presentes, Graphify, Proyecto y arquitectura, Reglas de negocio que deben conservarse

### Community 64 - "actividad"
Cohesion: 0.32
Nodes (8): auth, actividad, idx_actividad_created, idx_actividad_entidad, idx_poliza_historial_poliza, poliza_historial, profiles, auth.users

### Community 65 - "app/layout.tsx"
Cohesion: 0.25
Nodes (5): nextConfig, next, inter, metadata, poppins

### Community 66 - "public.exportacion_catalogo"
Cohesion: 0.25
Nodes (5): pg_attribute, public.exportacion_catalogo(), pg_class, pg_constraint, pg_namespace

### Community 67 - "@supabase/ssr"
Cohesion: 0.36
Nodes (5): @supabase/ssr, state, updateSession(), config, middleware()

### Community 68 - "zod"
Cohesion: 0.25
Nodes (6): zod, loginSchema, recuperarSchema, registerSchema, companiaSchema, ramoSchema

### Community 69 - "respaldo/route.ts"
Cohesion: 0.25
Nodes (5): dynamic, maxDuration, privateHeaders, runtime, mocks

### Community 70 - "update_updated_at"
Cohesion: 0.25
Nodes (7): tr_clientes_updated_at, tr_polizas_updated_at, tr_profiles_updated_at, tr_tareas_updated_at, update_updated_at(), app_settings, tr_app_settings_updated_at

### Community 71 - "007_comisiones_recurrentes.sql"
Cohesion: 0.29
Nodes (4): public.preparar_version_comision, idx_poliza_historial_comision, public.poliza_historial, tr_polizas_version_comision

### Community 72 - "getCompaniaColor"
Cohesion: 0.38
Nodes (5): CompaniaBadge(), COMPANIA_COLORS, CompaniaColor, DEFAULT_COLOR, getCompaniaColor()

### Community 73 - "normalizar.ts"
Cohesion: 0.43
Nodes (5): CATEGORIAS_SUGERIDAS, CategoriaSugerida, KEYWORDS_PALABRA_COMPLETA, normalizarTexto(), sugerirCategoriaSlug()

### Community 74 - "updatePoliza"
Cohesion: 0.38
Nodes (4): darBajaPoliza(), normalizePolizaDates(), renovarPoliza(), updatePoliza()

### Community 75 - "tareas"
Cohesion: 0.33
Nodes (6): idx_tareas_cliente, idx_tareas_estado, idx_tareas_vencimiento, tareas, idx_tareas_poliza, idx_tareas_siniestro

### Community 76 - "public.polizas"
Cohesion: 0.43
Nodes (7): public.clientes, public.companias, public.poliza_historial, public.polizas, public.ramos, public.siniestros, public.tareas

### Community 77 - "eslint.config.mjs"
Cohesion: 0.33
Nodes (5): compat, __dirname, eslintConfig, __filename, @eslint/eslintrc

### Community 78 - "regenerar/route.ts"
Cohesion: 0.33
Nodes (5): dynamic, headers, maxDuration, POST(), runtime

### Community 79 - "prueba/route.test.ts"
Cohesion: 0.33
Nodes (4): createClientMock, emailConfiguradoMock, Scenario, sendEmailMock

### Community 80 - "alert.tsx"
Cohesion: 0.40
Nodes (5): Alert(), AlertAction(), AlertDescription(), AlertTitle(), alertVariants

### Community 81 - "public.exportacion_catalogo"
Cohesion: 0.33
Nodes (4): public.exportacion_catalogo(), pg_class, pg_constraint, pg_namespace

### Community 82 - "Auditoría multi-tenant (13/11/2026)"
Cohesion: 0.40
Nodes (4): Auditoría multi-tenant (13/11/2026), Comparación obligatoria sobre copia real, Información real pendiente, Inventario local

### Community 83 - "vercel.json"
Cohesion: 0.40
Nodes (4): crons, framework, headers, regions

### Community 85 - "estado-badge.tsx"
Cohesion: 0.50
Nodes (3): EstadoBadge(), labels, styles

### Community 88 - "public.v_polizas_por_compania"
Cohesion: 0.50
Nodes (3): public.v_polizas_por_compania, public.companias, public.polizas

## Knowledge Gaps
- **420 isolated node(s):** `MonthDay`, `CumpleResumen`, `PrototypePoliza`, `BarListItem`, `KpiCardProps` (+415 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 595 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **24 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `vitest` connect `vitest` to `fechas.ts`, `utils.ts`, `inteligencia.ts`, `comision.ts`, `package.json`, `lucide-react`, `motor.ts`, `polizas/[id]/page.tsx`, `config-manager.tsx`, `baja/route.ts`, `cliente-combobox.test.tsx`, `correo/plantilla.ts`, `prueba/route.ts`, `siniestros.service.ts`, `polizas.service.ts`, `task-alert-bell.tsx`, `email-notifications-editor.test.tsx`, `cron.ts`, `resumen.ts`, `respaldo.test.ts`, `cliente-form.tsx`, `notificaciones.service.ts`, `reportes/format.ts`, `cron/route.ts`, `enviar/route.test.ts`, `clientes.service.ts`, `respaldo.ts`, `poliza-date-field.tsx`, `@supabase/ssr`, `respaldo/route.ts`, `normalizar.ts`, `updatePoliza`, `prueba/route.test.ts`, `use-contactado.ts`?**
  _High betweenness centrality (0.124) - this node is a cross-community bridge._
- **Why does `react` connect `react` to `utils.ts`, `reportes-ui.tsx`, `package.json`, `createClient`, `cumpleanos-page.tsx`, `lucide-react`, `cn`, `polizas/[id]/page.tsx`, `cliente-combobox.tsx`, `config-manager.tsx`, `siniestro-form.tsx`, `dropdown-menu.tsx`, `sheet.tsx`, `task-alert-bell.tsx`, `email-notifications-editor.test.tsx`, `crosssell-module.tsx`, `reportes-dashboard.tsx`, `poliza-date-field.tsx`, `alert.tsx`, `use-contactado.ts`, `mapa-argentina.tsx`?**
  _High betweenness centrality (0.089) - this node is a cross-community bridge._
- **Why does `dependencies` connect `dependencies` to `package.json`?**
  _High betweenness centrality (0.049) - this node is a cross-community bridge._
- **What connects `MonthDay`, `CumpleResumen`, `PrototypePoliza` to the rest of the system?**
  _420 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `fechas.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05258033106134372 - nodes in this community are weakly interconnected._
- **Should `utils.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06349206349206349 - nodes in this community are weakly interconnected._
- **Should `inteligencia.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.09485815602836879 - nodes in this community are weakly interconnected._