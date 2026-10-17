# Reportes e inteligencia de cartera

## Auditoría previa (17/10/2026)

Se revisaron las migraciones 001–008, tipos, servicios, autenticación, Reportes,
Configuración y motor de comisión. Esto describe el repositorio, no certifica el
esquema ni las migraciones de una base remota. No se consultaron datos personales
productivos ni se ejecutaron escrituras en Supabase.

Tablas funcionales: `profiles`, `clientes`, `companias`, `ramos`, `polizas`,
`poliza_historial`, `siniestros`, `tareas`, `actividad`, `app_settings`.
Las vistas `v_*` son derivadas; no son nuevas entidades de negocio.
`polizas.cliente_id` identifica al asegurado; compañía y ramo son referencias
opcionales. Siniestros pertenecen a un cliente y opcionalmente una póliza;
tareas pertenecen opcionalmente a clientes. Historial referencia póliza y usuario;
actividad referencia usuario y una entidad lógica. Perfiles referencian auth.users.
No existen tablas independientes de asegurados, productores o comisiones, ni
asignación póliza/productor, país, coordenadas, tenant u organización.

Los estados persistidos son VIGENTE, HISTORICA y BAJA. No hay estado CANCELADA ni
motivo de baja estructurado. El vencimiento contractual es inclusivo; la baja
efectiva excluye desde fecha_baja. No se interpreta fecha_fin legacy como
vencimiento confirmado cuando el motor existente la considera ambigua.

La migración 007 acredita versiones completas desde su observación, no el pasado.
Los diffs anteriores no reconstruyen una cartera histórica. Comisiones son un
stock recurrente estimado al 14% del premio mensual, no cobros. No se modifica
este modelo. Las dimensiones comerciales y domicilios no tienen historial propio;
las segmentaciones geográficas usan el domicilio actualmente disponible. Compañía,
ramo y relación cliente/póliza también usan la clasificación actual: no se afirma
conocer transferencias comerciales históricas que el esquema no registra.

RLS permite datos de negocio compartidos a todos los autenticados; perfiles solo
permite leer/modificar el propio. El rol se puede autoeditar y el registro solicita
ADMIN: no es una frontera suficiente para exportar toda la base. Exportación exige
además IDs habilitados en una variable privada del servidor. No hay aislamiento
por workspace que pueda preservarse o inferirse. Las consultas analíticas usan
la sesión y RLS del solicitante; nunca service_role.

Reportes anterior contenía cinco descargas parciales con consultas sin paginación;
Configuración administra compañías, ramos y cumpleaños. ExcelJS y Recharts ya
estaban instalados; no había biblioteca de mapas ni infraestructura de backups
nativos en el repositorio. Se incorpora Leaflet/React Leaflet con GeoJSON local de
Georef, sin enviar domicilios a terceros ni solicitar teselas externas.

## Diseño

Azul #1E5BBF, navy #1A2556, blanco #FFFFFF, fondo #F5F8FD, borde #E4E8F0.
Poppins para títulos/cifras e Inter para controles/lectura, tokens existentes.
Lectura de izquierda a derecha: filtros, fotografía al corte, movimientos y
comisiones del período, territorio, composición y oportunidades comerciales.
El mapa es el elemento central; las tendencias y barras tienen unidades y
tratamiento sobrio. En móvil todo pasa a una columna; selecciones geográficas
tienen alternativa accesible mediante selector.

## Definiciones y límites

La referencia es el último día del rango, nunca futuro. Las series mensuales
usan fin de mes, salvo el último mes que termina en la referencia elegida.
Los extremos parciales se indican como cortes parciales; el acumulado suma las
fotografías mensuales comprendidas, sin prorrateo de días.

1. Asegurados activos: clientes únicos con una o más pólizas vigentes al corte.
   Se excluye el cliente desde su deleted_at. No se deduplica por DNI.
2. Pólizas vigentes: estado acreditado VIGENTE, inicio no posterior, fin inclusivo
   y baja efectiva posterior al corte, siguiendo la evidencia del motor.
3. Comisión mensual: aporte recurrente al corte del mes de referencia, usando el
   motor compartido. Un total incompleto se muestra como no disponible.
4. Acumulada: suma de los cortes mensuales del rango. Un mes sin evidencia o con
   importes pendientes invalida el total; no se rellena ni extrapola.
5. Próximas a vencer: pólizas vigentes con fin confirmado entre corte y corte+30,
   ambos incluidos. Excluye fecha_fin legacy ambigua.
6. Nuevos asegurados registrados: primera creación de póliza del cliente dentro
   del período, considerando todas sus pólizas antes de aplicar filtros. Es un
   alta registrada en el sistema; una importación no acredita adquisición real.
7. Bajas: transiciones verificables desde vigencia a inactividad durante el
   período; distingue baja efectiva, vencimiento e histórico. Renovar una misma
   fila no crea un asegurado nuevo. Sin cobertura del inicio se informa N/D.
8. Pólizas por asegurado: vigentes / asegurados activos; sin asegurados es N/D.

La evolución cuenta transiciones verificadas de vigencia (altas/reingresos y
bajas), neto = altas - bajas. No cuenta una foto inicial como alta. Comparaciones
usan el rango inmediato anterior de igual cantidad de días y sus cortes; solo se
publican con datos completos y bases comparables. No se compara acumulado de
ventanas con diferente cantidad de cortes mensuales.

Filtros por compañía y ramo actuales, estado derivado con evidencia al corte y
provincia actual aplican a todas las secciones. El conjunto de pólizas seleccionado
es estable entre cortes: no se cuentan migraciones entre filtros como altas/bajas.
Un estado desconocido mantiene la incertidumbre aunque se filtre por estado;
no se usa el estado actual para descartar silenciosamente esa póliza del pasado.
Productor no se ofrece porque no existe esa relación. Vigentes
siempre significa vigentes: elegir BAJA/HISTORICA/VENCIDA puede dar stock cero.
Los clientes de cross-selling cuentan pólizas del segmento filtrado, no toda su
cartera. Mapas deduplican cliente por provincia; jurisdicciones + sin ubicación
determinada + exterior explícito reconcilian con el total del segmento.
El porcentaje nacional usa únicamente asegurados con provincia argentina
identificada; se presenta además la participación sobre todo el segmento. No se
asigna nacionalidad argentina a quienes tienen ubicación indeterminada.

Normalización de provincias en memoria: códigos INDEC y alias inequívocos;
no se modifica el original. Sin país, no se infiere nacionalidad por localidad o
dirección. Provincias extranjeras explícitas van a Exterior; lo ambiguo queda
sin ubicación determinada.

## Exportación integral y habilitación

La migración **009_exportacion_integral.sql**, autorizada para su creación en esta
rama, agrega funciones de lectura; no crea tablas ni cambia datos, RLS o triggers
existentes. No se aplicó a producción. Las tres funciones tienen SECURITY INVOKER,
search_path acotado y permisos revocados a PUBLIC/anon/authenticated; solo
service_role puede ejecutarlas. El catálogo se obtiene de pg_catalog, incluyendo
tipos, columnas reales, nulabilidad, claves y relaciones.

El endpoint primero valida la sesión con getUser, consulta el perfil con RLS y
exige ADMIN más pertenencia exacta a `BACKUP_ADMIN_USER_IDS`. Luego usa el cliente
service_role exclusivamente en servidor. Configurar esa variable privada con UUIDs
de administradores autorizados y la clave privada existente. Lista vacía rechaza
todas las descargas; nunca usar NEXT_PUBLIC para estos valores. No se habilitan
cuentas ni se modifica la asignación de roles automáticamente.

El XLSX incluye todas las filas de las tablas funcionales presentes, incluidas
bajas lógicas y registros de catálogo inactivos. No se exportan auth, storage,
vault ni otros esquemas internos. Profiles sí se incluye, por ser entidad
funcional y estar la descarga reservada al administrador expresamente habilitado.
Una nueva tabla pública sin auditar bloquea la descarga: requiere revisar su
alcance y seguridad antes de actualizar la lista permitida. No se omite en silencio.
La presencia futura de tenant_id, organization_id o workspace_id también bloquea
la exportación hasta revisar el aislamiento, en vez de exportar varios espacios
con la clave privilegiada bajo supuestos del modelo mono-corredor actual.

Se pagina por clave primaria, con lotes de 500 en SQL y orden C, hasta obtener un
lote vacío. Se coteja cada conteo y se comparan esquema y huellas de contenido al
inicio y al final. La lectura entre lotes **no es un snapshot transaccional**; esos
controles detectan cambios persistentes, no acreditan ausencia absoluta de cambios
transitorios que después se reviertan. Conviene exportar sin ediciones concurrentes.
Un cambio detectado interrumpe la respuesta; el navegador guarda solo al recibir
el archivo completo. Cada consulta del catálogo recorre las tablas para su huella.

ÍNDICE documenta tablas, cantidades, hojas y generación UTC. MANIFIESTO documenta
columnas, tipos, relaciones, alcance y exclusiones. Una tabla se divide cada
1.048.575 filas de datos más encabezado. ExcelJS escribe ZIP en streaming y las
celdas son strings explícitos, nunca objetos fórmula o enlaces ejecutables.
NUMERIC, JSON, fechas, timestamps y UUID se serializan como texto PostgreSQL para
evitar pérdida de precisión o cambios de zona horaria. La hoja no es un formato
analítico con importes numéricos editables: es una copia fiel de datos.

Codificación reversible: `\N` representa NULL; `\E` representa texto vacío; una
barra inicial original se duplica. `\J` seguido de una cadena JSON codifica texto
con caracteres incompatibles con XML. `\L<ID>` referencia un texto extenso en
TEXTOS_LARGOS, que se reconstruye concatenando sus partes en orden antes de
decodificar. Las hojas auxiliares indican tabla, ordinal del registro, columna y
parte; también se dividen al alcanzar el límite de Excel. No se truncan celdas.

Las columnas sensibles y claves JSON (password, passwd, secret, token,
private_key/privateKey, api_key/apiKey, credential, authorization, jwt,
connection_string, database_url) se excluyen o se reemplazan explícitamente por
`[EXCLUIDO POR SEGURIDAD]`. En app_settings se protege también el valor completo
cuando la clave de configuración es sensible. Las columnas excluidas aparecen
identificadas en MANIFIESTO; las claves JSON conservan su nombre junto a la marca
de exclusión. Los campos de texto libre son contenido funcional; el sistema no
puede clasificar semánticamente secretos pegados por un usuario en una nota.

No hay infraestructura de backups nativos integrada en el repositorio. El panel
lo indica y distingue el respaldo técnico gestionado por Supabase. El Excel no
incluye los objetos necesarios para restaurar PostgreSQL ni ejecuta restauraciones.

## Archivos de esta implementación

Nuevos:

- `src/app/api/inteligencia/route.ts` y `route.test.ts`: API analítica autenticada.
- `src/app/api/respaldo/route.ts` y `route.test.ts`: descarga administrativa segura.
- `src/app/(dashboard)/config/respaldo/page.tsx` y
  `src/features/config/respaldo-panel.tsx` y `.test.tsx`: nueva sección y estados verificables.
- `src/features/reportes/reportes-dashboard.tsx`, `tendencias.tsx`,
  `mapa-argentina.tsx`, `geografia-panel.tsx`, `cross-selling.tsx` y
  `reportes-ui.tsx`: dashboard, tendencias, mapa, detalle territorial, segmentos
  y presentación reutilizable.
- `src/lib/reportes/inteligencia.ts`, `geografia.ts`, `autorizacion.ts`,
  `respaldo.ts`: reglas puras y generación XLSX; pruebas de cálculo, cartografía,
  XLSX y PostgreSQL en `inteligencia.test.ts`, `respaldo.test.ts`,
  `cartografia.test.ts` y `exportacion-postgres.test.ts` del mismo directorio.
- `src/services/inteligencia.service.ts` y `.test.ts`: lecturas completas con RLS.
- `supabase/migrations/009_exportacion_integral.sql`: funciones aditivas.
- `public/geo/argentina-provincias.geojson` y `README.md`: cartografía y procedencia.
- Este documento de auditoría, definiciones, operación y límites.

Modificados:

- `src/app/(dashboard)/reportes/page.tsx`: reemplaza descargas por inteligencia.
- `src/features/config/config-manager.tsx`: pestaña Respaldo y exportación.
- `src/components/dashboard/app-sidebar.tsx`: icono de análisis para Reportes.
- `src/lib/dashboard/comision.ts`: extrae y exporta el índice y aporte existentes;
  no cambia reglas ni la salida del dashboard.
- `src/app/api/reportes/[tipo]/route.ts`: devuelve 410 para descargas parciales
  retiradas, con referencia a la nueva sección.
- `src/lib/supabase/middleware.ts`: las APIs sin sesión devuelven JSON 401 privado;
  las páginas conservan la redirección al login. Pruebas en `middleware.test.ts`.
- `.env.example`: habilitación privada de administradores para exportación.
- `package.json` y lockfile: Leaflet, React Leaflet y tipos de Leaflet.
- `AGENTS.md`: contexto actualizado preservando el resto del archivo preexistente.

## Limitaciones y evolución posible

No se certificó el despliegue remoto ni se hizo un recorrido con datos productivos
y sesión real de Supabase. Los recorridos visuales usan datos sintéticos en un
entorno temporal externo al repositorio. No se incorporan datos ficticios al producto.
No hay historial completo de domicilios, transferencias entre clientes ni tablas
de comisiones liquidadas; las bajas físicas anteriores no pueden reconstruirse.
Nuevos y pérdidas usan pólizas aún presentes en la base y su evidencia disponible.

El análisis se calcula en servidor con índices en memoria y sin consultas N+1;
cada filtro requiere lectura de cinco tablas por lotes. La consulta admite hasta
36 meses y hasta 60 segundos; una cartera muy grande requerirá agregación SQL y
un proceso de tareas con límites y observabilidad. La descarga permite hasta 300
segundos si el plan de hosting lo admite; su configuración efectiva debe verificarse.
El servidor escribe por streaming; el navegador mantiene el archivo antes de
guardarlo para descartar descargas interrumpidas. Archivos muy grandes pueden
requerir un proceso de exportación asíncrono y almacenamiento privado temporal.

Mejoras futuras: agregar país y catálogo geográfico con revisión humana, registrar
transferencias comerciales e historial de clientes, proteger la gestión de roles
y registro como tarea independiente, agregar productores con relaciones explícitas,
incorporar liquidaciones/cobros si aparecen esas entidades y evaluar backups nativos
del proveedor por separado. Cualquier geocodificación externa necesita evaluación
y autorización; no está implementada.

## Verificaciones ejecutadas

- `npm test`: **245 pruebas, 32 archivos, todas aprobadas**. Incluye reglas
  financieras previas, filtros, deduplicación de clientes, conciliación geográfica,
  renovación sin doble conteo, baja efectiva, falta de historia frente a filtros,
  fechas límite, RLS/sesión, habilitación ADMIN y errores de descarga.
- PostgreSQL embebido PGlite: migraciones reales 001–009; 1.007 clientes sintéticos
  paginados, permisos RPC, precisión JSON NUMERIC, columnas/claves sensibles,
  bloqueo de nuevas tablas y futuros workspaces, y generación/reapertura del XLSX
  de las diez tablas. No se usó la base productiva.
- ExcelJS: archivo XLSX reabierto, 1.005 filas con lotes de 137 y división de hojas
  con límite reducido para verificar el mecanismo sin crear millones de filas;
  identificadores, importes, textos de fórmula, vacíos, NULL y textos largos.
- `npm run typecheck`: aprobado. `npm run build`: aprobado, con advertencias de
  raíz de workspace por lockfiles externos y dimensiones SSR de Recharts.
- `npm run lint -- --ignore-pattern '.claude/**'`: aprobado. El comando general
  sin exclusión también se ejecutó y falla al analizar archivos generados del
  worktree preexistente `.claude/worktrees/cumpleanos`; ese árbol no se modificó.
- `git diff --check`: aprobado.
- Chrome/Playwright temporal, fuera del repositorio: escritorio 1440×1000 y móvil
  390×844/320×740, sin desbordamiento horizontal al terminar el reajuste. Se
  verificaron 24 geometrías, ocho KPIs, zoom, clic y selector provincial, filtros,
  vista anual, tablas de valores, segmentos y enlaces, estado vacío y errores
  403/503. Sin excepciones JavaScript. Datos exclusivamente sintéticos.
- Pruebas de interfaz de descarga: no se guarda HTML de login como XLSX ni un
  stream interrumpido como archivo completo. No se verificó apertura manual en
  Microsoft Excel de escritorio ni se certificó un recorrido autenticado remoto.
