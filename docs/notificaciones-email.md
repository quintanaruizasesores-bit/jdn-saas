# Recordatorios automáticos por email (tareas vencidas)

Envía a cada usuario un **resumen diario por email** con sus tareas **vencidas y
pendientes**, usando [Resend](https://resend.com) desde el servidor. Está
**desactivado por defecto**: cada usuario lo activa y configura en
**Configuración → Notificaciones por email**.

## Qué se agregó

- **Configuración por usuario** (`/config/notificaciones`): activar/desactivar y
  correo de destino (sugiere el de la cuenta, editable sin tocar el correo de
  acceso), más un botón **Enviar correo de prueba** con estados de carga, éxito y
  error. El horario es fijo (ver abajo), no se elige por usuario.
- **Resumen diario** (`/api/notificaciones/cron`): endpoint programado que corre
  **a las 09:00 (hora de Argentina), de lunes a viernes**, y arma y envía el
  resumen **solo si hay tareas vencidas**.
- **Correo de prueba** (`/api/notificaciones/prueba`): envío manual autenticado,
  limitado a una prueba por minuto, dirigido **solo al destino guardado**.
- **Migración 015**: tablas `notificacion_email_prefs` (preferencias por
  workspace) y `notificacion_email_envios` (bitácora de envíos), con RLS por
  workspace y la función de reclamo atómico `reclamar_resumen_diario`.

## Modelo de datos y aislamiento

Cada fila pertenece a un **workspace** (un usuario), igual que el resto de la
cartera. El **responsable** de las tareas de un workspace es su propietario: no
existe una columna de asignación por tarea, así que el resumen se arma por
workspace y se envía a su propietario. La RLS (`workspace_id =
current_workspace_id()`) garantiza que **cada usuario solo ve y edita sus propias
preferencias y su propia bitácora**.

### Qué tareas entran en el resumen

Se incluyen las tareas con:

- estado **`PENDIENTE`** (misma semántica que la campana del dashboard),
- con **fecha de vencimiento** (se excluyen las que no tienen),
- cuya fecha es **anterior a "hoy"** en horario de Argentina (una fecha
  `DATE` sin hora vence **al terminar ese día**, por lo que una tarea que vence
  hoy todavía **no** está vencida).

Se ordenan de la **más antigua** a la más reciente. El correo muestra el nombre
del usuario, el total de tareas vencidas y, por tarea: título, cliente o póliza
vinculada (cuando corresponde), vencimiento y días de atraso. Si hay muchas, se
listan hasta 20 y se indica cuántas quedan, con enlace al listado completo.

El estado se **consulta en el momento del envío**: completar o finalizar una
tarea antes de esa hora la excluye automáticamente. El resumen se repite los
días siguientes mientras las tareas sigan vencidas y pendientes.

## Puesta en marcha (una sola vez, para toda la app)

1. **Crear la cuenta de Resend** en <https://resend.com> e iniciar sesión.
2. **Verificar el dominio**: en Resend → _Domains_ → _Add Domain_, agregar el
   dominio desde el que se enviará (p. ej. `tu-dominio.com`) y cargar en el DNS
   los registros que Resend indica (SPF, DKIM y, si corresponde, DMARC).
   Esperar a que el dominio figure como **Verified**.
3. **Definir el remitente**: una casilla del dominio verificado, p. ej.
   `recordatorios@tu-dominio.com`. El formato de `RESEND_FROM` es
   `Nombre visible <casilla@tu-dominio.com>`.
4. **Crear una API Key** en Resend → _API Keys_ (permiso de envío). Empieza con
   `re_`.
5. **Generar `CRON_SECRET`**: un valor largo y aleatorio, p. ej.
   `openssl rand -hex 32`.
6. **Cargar las variables de entorno** (en Vercel → _Project Settings →
   Environment Variables_, y en `.env.local` para desarrollo). **Solo servidor;
   nunca `NEXT_PUBLIC_*`:**

   | Variable               | Ejemplo                                                 |
   | ---------------------- | ------------------------------------------------------- |
   | `RESEND_API_KEY`       | `re_********`                                           |
   | `RESEND_FROM`          | `Quintana Ruiz Asesores <recordatorios@tu-dominio.com>` |
   | `CRON_SECRET`          | (salida de `openssl rand -hex 32`)                      |
   | `NEXT_PUBLIC_SITE_URL` | `https://app.tu-dominio.com` (ya existente)             |

   `NEXT_PUBLIC_SITE_URL` se usa para el enlace **"Ver mis tareas vencidas"**;
   debe ser la URL pública real de la app.

7. **Aplicar la migración 015** a la base (junto con el despliegue del código).
   Requiere 012 y 013 aplicadas previamente.
8. **Programación (Vercel Cron)**: ya está declarada en `vercel.json`
   (`/api/notificaciones/cron`, `0 12 * * 1-5` = **09:00 Argentina, L–V**).
   Vercel envía automáticamente `Authorization: Bearer <CRON_SECRET>`, así que
   basta con tener `CRON_SECRET` configurado. El resumen funciona **aunque nadie
   abra la app**.

> **Nota sobre el plan de Vercel:** el cron corre **una vez por día** (L–V), por
> lo que es compatible con el plan **Hobby** (que limita los cron a una ejecución
> diaria). Vercel puede disparar el cron dentro de la hora programada, no al
> minuto exacto; para un resumen matutino eso es suficiente.

## Cómo se fija el horario y se evitan duplicados

- El cron corre **una vez por día, a las 09:00 de Argentina (L–V)**. El horario
  lo fija el propio cron de Vercel: cada ejecución procesa a **todos** los
  usuarios con recordatorios activos y tareas vencidas (no hay hora por usuario).
- La **fecha civil en Argentina** identifica el resumen del día para deduplicar.
- Un **índice único parcial** `(workspace_id, fecha_local)` para
  `tipo = 'RESUMEN_DIARIO'` garantiza **un único resumen por usuario y día
  local**, incluso ante ejecuciones concurrentes.
- La función `reclamar_resumen_diario` hace el **reclamo atómico** (insert con
  `ON CONFLICT`): devuelve el id del envío solo a un proceso. Una fila en
  **`ERROR`** (hasta 3 intentos) o una **`ENVIANDO`** estancada (>15 min) puede
  reclamarse de nuevo → **reintentos controlados** ante errores transitorios.
- El envío a Resend usa además una **clave de idempotencia**
  (`resumen-<workspace>-<fecha_local>`) como defensa adicional.
- Cada usuario se procesa en su propio `try/catch`: **un fallo no bloquea** al
  resto.

## Seguridad

- La clave de Resend y el `CRON_SECRET` son **secretos del servidor**; nunca se
  exponen al frontend ni se registran en la bitácora.
- La bitácora guarda solo **metadatos de entrega** (estado, id del proveedor,
  total de tareas, error truncado): **no** guarda el contenido del correo ni
  datos sensibles innecesarios.
- El endpoint del cron exige el `CRON_SECRET`; el correo de prueba exige
  **sesión** y solo envía al **destino guardado** del propio usuario, con
  **límite de frecuencia** (1 por minuto). La prueba **no consume ni bloquea** el
  resumen diario (usa `tipo = 'PRUEBA'`, fuera del índice único del resumen).

## Desarrollo y pruebas

- No se envían correos reales en desarrollo: las pruebas automáticas usan
  **mocks** del proveedor (`src/lib/email/resend.ts`) y de Supabase.
- Si faltan `RESEND_API_KEY`/`RESEND_FROM`, el endpoint del cron responde **503**
  y el correo de prueba avisa que el envío no está configurado (falla segura, sin
  simular envíos exitosos).

## Archivos principales

- `supabase/migrations/015_notificaciones_email.sql`
- `src/lib/notificaciones/{prefs,horario,resumen,cron}.ts`
- `src/lib/email/resend.ts`
- `src/services/notificaciones.service.ts`
- `src/app/api/notificaciones/cron/route.ts`
- `src/app/api/notificaciones/prueba/route.ts`
- `src/features/config/email-notifications-editor.tsx`
- `src/app/(dashboard)/config/notificaciones/page.tsx`
