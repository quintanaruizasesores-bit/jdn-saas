# Graph Report - jdn-saas  (2026-11-25)

## Corpus Check
- 293 files · ~116,501 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1554 nodes · 3938 edges · 119 communities (84 shown, 23 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 8 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `ab77a840`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- fechas.ts
- riesgo/page.tsx
- reportes-dashboard.tsx
- comision.ts
- crosssell.service.ts
- dashboard/page.tsx
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
- actions.ts
- @testing-library/react
- 017_crosssell_correos.sql
- compilerOptions
- baja/route.ts
- crosssell.schema.ts
- siniestros/[id]/editar/page.tsx
- cliente-combobox.test.tsx
- correo/plantilla.ts
- vitest
- prueba/route.ts
- clientes-top.ts
- utils.ts
- dropdown-menu.tsx
- utils/format.ts
- sheet.tsx
- task-alert-bell.tsx
- email-notifications-editor.test.tsx
- cron.ts
- Cartera JDN
- config-manager.tsx
- resumen.ts
- Módulo Cumpleaños
- respaldo/route.ts
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
- baja.ts
- clientes.service.ts
- oportunidades/route.ts
- Bandeja
- Comisión mensual recurrente estimada
- Reportes e inteligencia de cartera
- useComisionDashboard
- Cartera JDN / Quintana Ruiz — contexto operativo
- actividad
- app/layout.tsx
- public.exportacion_catalogo
- @supabase/ssr
- zod
- dashboard.service.test.ts
- update_updated_at
- 007_comisiones_recurrentes.sql
- registerAction
- normalizar.ts
- tareas
- public.polizas
- eslint.config.mjs
- createClient
- prueba/route.test.ts
- alert.tsx
- public.exportacion_catalogo
- Auditoría multi-tenant (13/11/2026)
- vercel.json
- ResizeObserver
- estado-badge.tsx
- use-contactado.ts
- public.v_polizas_por_compania
- Migración de datos de la cartera existente
- Controles de seguridad multi-tenant
- sonner.tsx
- CLAUDE.md
- colores-companias.md
- MULTITENANT_ARCHITECTURE.md
- MULTITENANT_ROLLBACK.md
- MULTITENANT_VALIDATION.md
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
2. `react` - 74 edges
3. `createClient()` - 70 edges
4. `vitest` - 66 edges
5. `@tanstack/react-query` - 45 edges
6. `Button` - 42 edges
7. `lucide-react` - 41 edges
8. `@supabase/supabase-js` - 29 edges
9. `sonner` - 27 edges
10. `Input` - 24 edges

## Surprising Connections (you probably didn't know these)
- `main()` --calls--> `parseSiniestroText()`  [EXTRACTED]
  scripts/migrate-from-prototype.ts → src/lib/riesgo/parse-siniestro-legacy.ts
- `main()` --calls--> `splitNombreCompleto()`  [EXTRACTED]
  scripts/migrate-from-prototype.ts → src/lib/utils/format.ts
- `configure()` --indirect_call--> `useComisionDashboard()`  [INFERRED]
  src/app/(dashboard)/polizas/pendientes-comision/page.test.tsx → src/features/dashboard/use-comision-dashboard.ts
- `NavLink()` --calls--> `cn()`  [EXTRACTED]
  src/components/dashboard/mobile-nav.tsx → src/lib/utils.ts
- `AlertTitle()` --calls--> `cn()`  [EXTRACTED]
  src/components/ui/alert.tsx → src/lib/utils.ts

## Import Cycles
- None detected.

## Communities (119 total, 23 thin omitted)

### Community 0 - "fechas.ts"
Cohesion: 0.05
Nodes (53): CumpleanosPage(), PreparedRow, clienteHoy(), calcularEdad(), daysUntilBirthday(), diffInDays(), FechaPartes, formatCumpleanos() (+45 more)

### Community 1 - "riesgo/page.tsx"
Cohesion: 0.15
Nodes (16): recharts, CHART_COLORS, RiesgoPage(), RiskBadge(), styles, calculateRiskScore(), POLIZA_ESTADO_LABELS, RiskInput (+8 more)

### Community 2 - "reportes-dashboard.tsx"
Cohesion: 0.05
Nodes (79): leaflet, @radix-ui/react-dialog, react-leaflet, dynamic, GET(), maxDuration, m, CrossSelling() (+71 more)

### Community 3 - "comision.ts"
Cohesion: 0.13
Nodes (15): COMISION_RATE, ComisionDashboard, ComisionMensual, ComisionPendiente, HistorialComision, MotivoComisionPendiente, MOTIVOS_COMISION_PENDIENTE, PERIODICIDAD_LEGACY_CONFIRMADA (+7 more)

### Community 4 - "crosssell.service.ts"
Cohesion: 0.10
Nodes (37): CategoriasEditor(), PlantillasEditor(), ReglasEditor(), asegurarCategoriasDefault(), asegurarPlantillasDefault(), asegurarReglasDefault(), autosugerirMapeos(), CATEGORIA_TABLE (+29 more)

### Community 5 - "dashboard/page.tsx"
Cohesion: 0.21
Nodes (10): CHART_COLORS, DashboardPage(), BarList(), BarListItem, KpiCard(), KpiCardProps, formatNumber(), fetchDashboardKpis() (+2 more)

### Community 6 - "package.json"
Cohesion: 0.05
Nodes (36): lint-staged, *.{ts,tsx,js,jsx,json,css,md}, name, private, version, @base-ui/react, clsx, date-fns (+28 more)

### Community 7 - "001_initial_schema.sql"
Cohesion: 0.11
Nodes (32): clientes, companias, handle_new_user(), idx_clientes_deleted, idx_clientes_dni, idx_clientes_nombre, idx_companias_nombre, idx_polizas_cliente (+24 more)

### Community 8 - "dependencies"
Cohesion: 0.06
Nodes (35): dependencies, @base-ui/react, class-variance-authority, clsx, cmdk, date-fns, exceljs, @hookform/resolvers (+27 more)

### Community 9 - "createClient"
Cohesion: 0.15
Nodes (23): sonner, @tanstack/react-query, Providers(), RenewalAlertsBanner(), SelectContent, SelectItem, SelectTrigger, Textarea() (+15 more)

### Community 10 - "database.ts"
Cohesion: 0.07
Nodes (29): BadgeVariant, ESTADO_LABEL, ESTADO_OPCIONES, ESTADO_VARIANT, Actividad, AppSetting, CompaniaEstado, CrossSellCategoria (+21 more)

### Community 11 - "react"
Cohesion: 0.28
Nodes (7): react, Button, ButtonProps, buttonVariants, Input, Label, LoginForm()

### Community 12 - "cumpleanos-page.tsx"
Cohesion: 0.22
Nodes (12): AppHeader(), CompaniaBadge(), EmptyState(), ErrorState(), ScrollFade(), Table(), TableBody(), TableCell() (+4 more)

### Community 13 - "lucide-react"
Cohesion: 0.18
Nodes (17): class-variance-authority, lucide-react, Badge(), badgeVariants, Checkbox(), ConfirmDialog(), ConfirmDialogProps, DialogContent (+9 more)

### Community 14 - "cn"
Cohesion: 0.12
Nodes (21): Avatar(), AvatarBadge(), AvatarFallback(), AvatarGroup(), AvatarGroupCount(), AvatarImage(), Card, CardContent() (+13 more)

### Community 15 - "motor.ts"
Cohesion: 0.13
Nodes (23): calcularScore(), clamp(), coberturasVigentesPorCliente(), detectarOportunidades(), fechaValida(), MotorCategoria, MotorCliente, MotorEntrada (+15 more)

### Community 16 - "devDependencies"
Cohesion: 0.08
Nodes (25): devDependencies, dotenv, @electric-sql/pglite, eslint, eslint-config-next, eslint-config-prettier, @eslint/eslintrc, husky (+17 more)

### Community 17 - "components.json"
Cohesion: 0.09
Nodes (21): aliases, components, hooks, lib, ui, utils, iconLibrary, menuAccent (+13 more)

### Community 18 - "polizas/[id]/page.tsx"
Cohesion: 0.07
Nodes (43): @supabase/supabase-js, EditarPolizaPage(), PolizaDetallePage(), NuevaPolizaPage(), ConfigManager(), invalidarMetricasPolizas(), PolizaDateField(), typingDate() (+35 more)

### Community 19 - "cliente-combobox.tsx"
Cohesion: 0.17
Nodes (14): cmdk, @radix-ui/react-popover, Command, CommandEmpty, CommandInput, CommandItem, CommandList, PopoverContent (+6 more)

### Community 20 - "actions.ts"
Cohesion: 0.14
Nodes (13): loginAction(), logoutAction(), recoverAction(), RecoveryState, restablecerContrasenaAction(), handleSubmit(), RecuperarForm(), camposContrasena (+5 more)

### Community 21 - "@testing-library/react"
Cohesion: 0.18
Nodes (5): @testing-library/react, @testing-library/user-event, companias, base, createTarea

### Community 22 - "017_crosssell_correos.sql"
Cohesion: 0.15
Nodes (16): public.crosssell_categoria, public.crosssell_oportunidad, idx_crosssell_correo_cliente, idx_crosssell_correo_enviado, idx_crosssell_correo_oportunidad, public.crosssell_correo, public.crosssell_plantilla, public.crosssell_supresion (+8 more)

### Community 23 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 24 - "baja/route.ts"
Cohesion: 0.36
Nodes (8): dynamic, GET(), pagina(), POST(), registrar(), runtime, createServiceClient(), suprimirEmail()

### Community 25 - "crosssell.schema.ts"
Cohesion: 0.11
Nodes (17): CrossSellCategoriaInput, crossSellCategoriaSchema, CrossSellCorreoDraftInput, crossSellCorreoDraftSchema, CrossSellCorreoEnviarInput, CrossSellExclusionInput, crossSellExclusionSchema, CrossSellOportunidadUpdateInput (+9 more)

### Community 26 - "siniestros/[id]/editar/page.tsx"
Cohesion: 0.23
Nodes (11): EditarSiniestroPage(), NuevoSiniestroForm(), SiniestroForm(), SiniestroFormProps, fetchPolizasByCliente(), createSiniestro(), fetchSiniestroById(), fetchSiniestros() (+3 more)

### Community 28 - "correo/plantilla.ts"
Cohesion: 0.19
Nodes (16): CorreoEditor(), construirCorreo(), CorreoRenderizado, generarBorrador(), PLANTILLAS_SUGERIDAS, PlantillaSugerida, renderPlantilla(), vars (+8 more)

### Community 29 - "vitest"
Cohesion: 0.13
Nodes (6): @electric-sql/pglite, vitest, mocks, db, db, db

### Community 30 - "prueba/route.ts"
Cohesion: 0.20
Nodes (12): dynamic, POST(), privateHeaders, runtime, emailConfigurado(), EmailSendError, safeText(), sendEmail() (+4 more)

### Community 31 - "clientes-top.ts"
Cohesion: 0.21
Nodes (13): calcularClientesTop(), ClienteTop, PolizaClienteTop, redondear(), now, aporteComision(), calcularComisionMensual(), construirVersionesComision() (+5 more)

### Community 32 - "utils.ts"
Cohesion: 0.16
Nodes (24): ACCION_LABELS, ClienteDetallePage(), ClientesPage(), PolizasListado(), SiniestroDetalle, SiniestroDetallePage(), SiniestrosPage(), TareasPage() (+16 more)

### Community 33 - "dropdown-menu.tsx"
Cohesion: 0.12
Nodes (9): DropdownMenuCheckboxItem(), DropdownMenuContent(), DropdownMenuItem(), DropdownMenuLabel(), DropdownMenuRadioItem(), DropdownMenuSeparator(), DropdownMenuShortcut(), DropdownMenuSubContent() (+1 more)

### Community 34 - "utils/format.ts"
Cohesion: 0.24
Nodes (10): extractData(), main(), PrototypePoliza, mapLegacyTipo(), parseCount(), ParsedSiniestroEvent, parseSiniestroText(), splitNombreCompleto() (+2 more)

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
Cohesion: 0.13
Nodes (14): Arquitectura, Cartera JDN, Configuración, Deploy en Vercel, Identidad visual — Quintana Ruiz, Licencia, Módulos, Recuperación de contraseña con Supabase Auth (+6 more)

### Community 40 - "config-manager.tsx"
Cohesion: 0.12
Nodes (16): @radix-ui/react-tabs, dynamic, TabsContent, TabsList, TabsTrigger, ConfigTab, RespaldoPanel(), ABIERTOS (+8 more)

### Community 41 - "resumen.ts"
Cohesion: 0.28
Nodes (11): atrasoLabel(), construirPruebaEmail(), construirResumenEmail(), diasDeAtraso(), fechaLegible(), MAX_TAREAS_EMAIL, parseIso(), ResumenEmail (+3 more)

### Community 42 - "Módulo Cumpleaños"
Cohesion: 0.15
Nodes (12): Comandos de verificación, Cumpleaños y fechas, Dónde se guarda la plantilla, Estado "WhatsApp preparado", Generación del link `wa.me`, Módulo Cumpleaños, Normalización de teléfonos, Qué se agregó (+4 more)

### Community 43 - "respaldo/route.ts"
Cohesion: 0.10
Nodes (22): exceljs, dynamic, GET(), maxDuration, privateHeaders, runtime, mocks, db (+14 more)

### Community 44 - "cliente-form.tsx"
Cohesion: 0.32
Nodes (9): NuevoClientePage(), ClienteForm(), displayToIso(), isoToDisplay(), maskFechaInput(), MIN_YEAR, validateFechaNacimiento(), ClienteFormData (+1 more)

### Community 45 - "(dashboard)/layout.tsx"
Cohesion: 0.23
Nodes (7): zustand, AppSidebar(), navItems, MobileNav(), NewClientShortcut(), UiState, useUiStore

### Community 46 - "enviar/route.ts"
Cohesion: 0.11
Nodes (17): dynamic, headers, POST(), runtime, contarEnviosPreviosMock, CORREO, createClientMock, emailConfiguradoMock (+9 more)

### Community 47 - "notificaciones.service.ts"
Cohesion: 0.23
Nodes (10): EmailNotifPrefsRow, fetchEmailPrefs(), fetchEmailPrefsRow(), fetchTareasVencidas(), nombreCliente(), PREFS_TABLE, saveEmailPrefs(), TareaVencidaRow (+2 more)

### Community 48 - "016_crosssell_core.sql"
Cohesion: 0.24
Nodes (11): idx_crosssell_ramo_map_categoria, public.crosssell_categoria, public.crosssell_ramo_map, public.assign_workspace_id, public.ramos, public.workspaces, tr_crosssell_categoria_updated_at, tr_crosssell_ramo_map_updated_at (+3 more)

### Community 49 - "reportes/format.ts"
Cohesion: 0.33
Nodes (8): RFC-4180, jspdf, jspdf-autotable, Cell, cellToString(), toCsv(), toPdf(), toXlsx()

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

### Community 56 - "baja.ts"
Cohesion: 0.47
Nodes (7): b64url(), BajaPayload, firma(), firmarTokenBaja(), fromB64url(), secret(), verificarTokenBaja()

### Community 57 - "clientes.service.ts"
Cohesion: 0.24
Nodes (9): EditarClientePage(), assertDniUnico(), ClientesFilters, createCliente(), fetchClienteById(), fetchClientes(), normalizeClienteDates(), updateCliente() (+1 more)

### Community 58 - "oportunidades/route.ts"
Cohesion: 0.33
Nodes (6): dynamic, GET(), headers, maxDuration, runtime, fetchOportunidades()

### Community 59 - "Bandeja"
Cohesion: 0.40
Nodes (6): Bandeja(), Detalle(), actualizarOportunidad(), addExclusion(), fetchEventosCliente(), logCrossSellEvento()

### Community 60 - "Comisión mensual recurrente estimada"
Cohesion: 0.22
Nodes (8): Cambio mínimo persistente: migración 007, Comisión mensual recurrente estimada, Criterio de cálculo, Datos revisados y decisión de negocio, Fuentes y presentación, Límite histórico encontrado, Revisar y completar registros pendientes, Verificación

### Community 61 - "Reportes e inteligencia de cartera"
Cohesion: 0.22
Nodes (8): Archivos de esta implementación, Auditoría previa (17/10/2026), Definiciones y límites, Diseño, Exportación integral y habilitación, Limitaciones y evolución posible, Reportes e inteligencia de cartera, Verificaciones ejecutadas

### Community 62 - "useComisionDashboard"
Cohesion: 0.60
Nodes (4): PendientesComisionPage(), configure(), pendiente, useComisionDashboard()

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
Cohesion: 0.29
Nodes (5): zod, companiaSchema, ramoSchema, TareaFormData, tareaSchema

### Community 69 - "dashboard.service.test.ts"
Cohesion: 0.40
Nodes (3): now, Page, row

### Community 70 - "update_updated_at"
Cohesion: 0.25
Nodes (7): tr_clientes_updated_at, tr_polizas_updated_at, tr_profiles_updated_at, tr_tareas_updated_at, update_updated_at(), app_settings, tr_app_settings_updated_at

### Community 71 - "007_comisiones_recurrentes.sql"
Cohesion: 0.29
Nodes (4): public.preparar_version_comision, idx_poliza_historial_comision, public.poliza_historial, tr_polizas_version_comision

### Community 72 - "registerAction"
Cohesion: 0.67
Nodes (3): RegisterPage(), handleSubmit(), registerAction()

### Community 73 - "normalizar.ts"
Cohesion: 0.43
Nodes (5): CATEGORIAS_SUGERIDAS, CategoriaSugerida, KEYWORDS_PALABRA_COMPLETA, normalizarTexto(), sugerirCategoriaSlug()

### Community 75 - "tareas"
Cohesion: 0.33
Nodes (6): idx_tareas_cliente, idx_tareas_estado, idx_tareas_vencimiento, tareas, idx_tareas_poliza, idx_tareas_siniestro

### Community 76 - "public.polizas"
Cohesion: 0.43
Nodes (7): public.clientes, public.companias, public.poliza_historial, public.polizas, public.ramos, public.siniestros, public.tareas

### Community 77 - "eslint.config.mjs"
Cohesion: 0.33
Nodes (5): compat, __dirname, eslintConfig, __filename, @eslint/eslintrc

### Community 78 - "createClient"
Cohesion: 0.18
Nodes (10): dynamic, headers, maxDuration, POST(), runtime, GET(), { exchangeCodeForSession }, NuevaContrasenaPage() (+2 more)

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
- **423 isolated node(s):** `$schema`, `style`, `rsc`, `tsx`, `config` (+418 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 600 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **23 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `vitest` connect `vitest` to `fechas.ts`, `riesgo/page.tsx`, `reportes-dashboard.tsx`, `comision.ts`, `package.json`, `motor.ts`, `polizas/[id]/page.tsx`, `actions.ts`, `@testing-library/react`, `cliente-combobox.test.tsx`, `correo/plantilla.ts`, `prueba/route.ts`, `clientes-top.ts`, `utils/format.ts`, `task-alert-bell.tsx`, `email-notifications-editor.test.tsx`, `cron.ts`, `resumen.ts`, `respaldo/route.ts`, `cliente-form.tsx`, `enviar/route.ts`, `notificaciones.service.ts`, `reportes/format.ts`, `cron/route.ts`, `baja.ts`, `clientes.service.ts`, `useComisionDashboard`, `@supabase/ssr`, `dashboard.service.test.ts`, `normalizar.ts`, `createClient`, `prueba/route.test.ts`, `use-contactado.ts`?**
  _High betweenness centrality (0.193) - this node is a cross-community bridge._
- **Why does `auth` connect `actividad` to `actions.ts`?**
  _High betweenness centrality (0.128) - this node is a cross-community bridge._
- **Why does `react` connect `react` to `reportes-dashboard.tsx`, `dashboard/page.tsx`, `package.json`, `createClient`, `cumpleanos-page.tsx`, `lucide-react`, `cn`, `polizas/[id]/page.tsx`, `cliente-combobox.tsx`, `siniestros/[id]/editar/page.tsx`, `utils.ts`, `dropdown-menu.tsx`, `sheet.tsx`, `task-alert-bell.tsx`, `email-notifications-editor.test.tsx`, `config-manager.tsx`, `clientes.service.ts`, `alert.tsx`, `use-contactado.ts`?**
  _High betweenness centrality (0.087) - this node is a cross-community bridge._
- **What connects `$schema`, `style`, `rsc` to the rest of the system?**
  _423 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `fechas.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05328005328005328 - nodes in this community are weakly interconnected._
- **Should `reportes-dashboard.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.05079850492694529 - nodes in this community are weakly interconnected._
- **Should `comision.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.13 - nodes in this community are weakly interconnected._