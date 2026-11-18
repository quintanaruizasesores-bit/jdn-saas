# Cross-Selling (venta cruzada asistida)

Herramienta comercial que detecta oportunidades de venta cruzada a partir de las
coberturas contratadas y permite contactar a cada cliente con un **correo
personalizado, editable y enviado individualmente** mediante Resend. No es un
envío masivo: un clic en «Enviar correo» envía **solo** el mensaje del cliente
seleccionado.

Ruta: `/cross-selling`. Código: `src/features/crosssell/`, `src/lib/crosssell/`,
`src/services/crosssell.service.ts`, `src/app/api/cross-selling/`. Migraciones
`016_crosssell_core.sql` y `017_crosssell_correos.sql`.

## 1. Modelo comercial

- **Categorías de cobertura normalizadas** (`crosssell_categoria`): catálogo
  editable por workspace (Automotor, Hogar, Vida, Accidentes personales, etc.).
  Los ramos del sistema son texto libre y no tienen categoría propia; esta capa
  los normaliza **sin modificar la tabla `ramos`**.
- **Mapeo ramo → categoría** (`crosssell_ramo_map`): cada ramo se asocia a una
  categoría. Hay autosugerencia por palabras clave (`src/lib/crosssell/normalizar.ts`),
  pero el usuario confirma. **Un ramo sin mapear no genera oportunidades** (se
  evitan falsos positivos).
- **Reglas configurables** (`crosssell_regla`): "cliente que **tiene** las
  categorías requeridas (en póliza vigente) y **no tiene** la categoría objetivo
  → oportunidad". `modo` ALL/ANY sobre las requeridas y `condiciones` JSONB
  (mín. pólizas, prima mínima, provincia, excluir alta siniestralidad). Se
  siembran reglas de ejemplo editables (auto→hogar, vida→AP, comercio→caución).
- **Oportunidades** (`crosssell_oportunidad`): una por `(cliente, categoría
  objetivo)`. Estados `NUEVA → VISTA → CONTACTADA → EN_NEGOCIACION → CONVERTIDA |
  DESCARTADA | NO_APLICA`. Guardan `motivo` (explicabilidad: qué coberturas la
  dispararon) y `prioridad_score` 0–100.
- **Exclusiones** (`crosssell_exclusion`): cliente excluido global o por categoría.
- **Supresión** (`crosssell_supresion`): email dado de baja / rebotado / con
  queja. Se respeta antes de todo envío.
- **Historial** (`crosssell_evento`, `crosssell_correo`): línea de tiempo
  comercial y contenido efectivamente enviado por cliente.

## 2. Detección y priorización

El motor (`src/lib/crosssell/motor.ts`, puro y testeado) carga la cartera,
deriva las categorías **vigentes** de cada cliente (póliza `VIGENTE` y, si tiene
fecha de fin válida, no vencida), evalúa las reglas activas y produce
oportunidades, descartando las que el cliente ya cubre. El score parte de la
prioridad de la regla y suma señales de valor/engagement (cantidad de pólizas,
prima agregada, email disponible).

«Detectar oportunidades» (`POST /api/cross-selling/regenerar`) regenera con
**upsert idempotente**: preserva los estados manuales (no reabre una DESCARTADA)
y auto-cierra como `CONVERTIDA` las oportunidades cuyo cliente ya tomó la
cobertura. Una oportunidad es **potencial**, no una necesidad verificada: no
afirma que el cliente carezca de esa cobertura en otra aseguradora.

## 3. Correo individual asistido

Flujo en la bandeja: seleccionar cliente → el sistema prepara un borrador
personalizado → editar asunto y cuerpo → previsualizar → «Enviar correo» (un
único correo) → se registra y la oportunidad pasa a `CONTACTADA` → siguiente
cliente. Variables disponibles en plantillas: `{{nombre}} {{apellido}}
{{ramoAsegurado}} {{coberturaOfrecida}} {{empresa}}`. El borrador por defecto
propone sumar la cobertura con nosotros y **nunca** afirma ausencia en otra
compañía.

Salvaguardas del envío (`POST /api/cross-selling/correos/enviar`): requiere
sesión; valida supresión; **advierte si ya se contactó esa cobertura** (pide
confirmación); reclamo atómico `crosssell_reclamar_correo` + `Idempotency-Key`
para que el doble clic no duplique; marca `ENVIADO`/`FALLIDO` con el id de
Resend. Un correo enviado se refleja como «contactado», no como «interesado».

## 4. Integración con Resend (plan gratuito)

**No se usan Broadcasts.** Según la documentación de Resend, los Broadcasts son
para envíos masivos de marketing y requieren un plan **Marketing** (pago, desde
~USD 40/mes). Este módulo usa el endpoint individual **`/emails`** —el mismo que
los recordatorios de tareas— que funciona en el **plan gratuito** (3.000
correos/mes, 100/día). Es la solución gratuita compatible para contacto asistido.

Aunque el envío sea individual, es **comunicación comercial** (no transaccional):
cada correo incluye **enlace de baja visible** y los encabezados
`List-Unsubscribe` / `List-Unsubscribe-Post`, y se respeta la lista de supresión.
La baja usa un **token firmado** (HMAC) y se procesa en `/api/cross-selling/baja`
sin requerir sesión.

**Límites reales a tener en cuenta:** 100 correos/día y 3.000/mes en el plan
gratuito; 10 req/s por equipo. El seguimiento de entrega/rebote/apertura en
tiempo real requeriría webhooks de Resend, **no incluidos** en este MVP (ver §7).

## 5. Variables de entorno

Reutiliza `RESEND_API_KEY`, `RESEND_FROM`, `NEXT_PUBLIC_SITE_URL`,
`SUPABASE_SERVICE_ROLE_KEY`. Nueva (solo servidor):

- `CROSSSELL_UNSUBSCRIBE_SECRET`: firma los enlaces de baja. Sin ella el envío
  funciona pero sin enlace de baja de un clic (no recomendado para producción).

No se agregan `CRON_SECRET` nuevos ni Vercel Cron: el MVP no tiene envíos
automáticos ni colas.

## 6. Migraciones

Aplicar en orden, junto con el despliegue del código:

1. `016_crosssell_core.sql`: categorías, mapeo, reglas, oportunidades,
   exclusiones, eventos (RLS por workspace, triggers, claves compuestas).
2. `017_crosssell_correos.sql`: plantillas, correos, supresión, RPC
   `crosssell_reclamar_correo` (anti doble-envío, `authenticated`) y
   `crosssell_suprimir` (baja con/sin sesión).

Ambas son **aditivas**: no modifican ni borran ninguna tabla existente. No
presuponen que estén desplegadas en el Supabase remoto.

## 7. Qué queda pendiente / futuro

Preparado en la arquitectura pero **no implementado** (para no sumar costos ni
infraestructura):

- Campañas masivas con Resend **Broadcasts** (requiere plan Marketing).
- **Webhooks** de Resend para estados de entrega/rebote/apertura/queja y
  alimentar la supresión automáticamente. Hoy la supresión se nutre de la baja
  por enlace y de la carga manual; un rebote duro marca el correo `FALLIDO`.

Para habilitar el **envío real**: cargar `RESEND_API_KEY`/`RESEND_FROM` con un
dominio verificado, definir `CROSSSELL_UNSUBSCRIBE_SECRET`, y confirmar el primer
envío desde la bandeja. Durante el desarrollo/pruebas no se realizan envíos
reales (los tests mockean `fetch`; las direcciones `*@resend.dev` sirven para
pruebas manuales controladas).

## 8. Pruebas

- Motor y normalización: `src/lib/crosssell/motor.test.ts`, `normalizar.test.ts`
  (sin falsos positivos, dedupe, convertida, exclusión, condiciones).
- Plantillas y baja: `correo/plantilla.test.ts` (escapado, no afirma ausencia en
  otra aseguradora), `correo/baja.test.ts` (firma/validación de token).
- Migraciones con PGlite: `migracion-016.test.ts`, `migracion-017.test.ts` (RLS,
  unicidad, reclamo anti doble-envío, supresión idempotente).
- Endpoint de envío: `src/app/api/cross-selling/correos/enviar/route.test.ts`
  (401, supresión, confirmación de reenvío, envío único, claim).
