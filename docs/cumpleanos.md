# Módulo Cumpleaños

Permite detectar rápidamente qué clientes cumplen años y enviarles un saludo
personalizado por WhatsApp mediante un link `wa.me`. **El sistema nunca envía
mensajes automáticamente**: solo genera el link con el mensaje precargado; el
usuario decide si lo envía desde WhatsApp.

## Qué se agregó

- Página **`/cumpleanos`** (ítem "Cumpleaños" en el menú lateral) con:
  - resumen superior (cumplen hoy / próximos 7 / próximos 30 días),
  - filtro por rango (Hoy — por defecto —, 7 días, 30 días, Todos),
  - buscador por nombre, apellido, nombre completo y teléfono,
  - listado (tabla en desktop, cards en mobile) con cliente, fecha de
    cumpleaños, edad, teléfono y acción,
  - vista previa del mensaje antes de abrir WhatsApp.
- Sección **Cumpleaños** en `/config` (pestaña): editor de plantilla + nombre de
  empresa + vista previa con un cliente de ejemplo.

No se agregaron campos de cliente: ya existía `clientes.fecha_nacimiento`
(DATE), que es la fuente de datos usada.

## Dónde se guarda la plantilla

En la tabla nueva **`app_settings`** (clave/valor JSONB), bajo la clave
`birthday`: `{ "template": "...", "empresa": "..." }`. Migración:
`supabase/migrations/006_app_settings.sql`.

- RLS: `FOR ALL TO authenticated USING (true)`, igual que el resto de la cartera.
- Si la migración todavía no se aplicó, la lectura devuelve los valores por
  defecto (`fetchBirthdaySettings` tolera el error `42P01`) y la página sigue
  funcionando; el guardado sí requiere la tabla creada.

> **Para aplicar la migración:** `supabase db push` (o correr el SQL de
> `006_app_settings.sql` en el proyecto).

## Variables disponibles

Se muestran al editar la plantilla:

| Variable             | Valor                              | Fuente                 |
| -------------------- | ---------------------------------- | ---------------------- |
| `{{nombre}}`         | Nombre del cliente                 | `clientes.nombre`      |
| `{{apellido}}`       | Apellido del cliente               | `clientes.apellido`    |
| `{{nombre_completo}}`| Nombre y apellido                  | ambos                  |
| `{{empresa}}`        | Nombre de la empresa/aseguradora   | `app_settings.birthday`|
| `{{asesor}}`         | Nombre del usuario/asesor logueado | `profiles.nombre`      |
| `{{edad}}`           | Edad que cumple el cliente         | calculada              |

Las variables desconocidas se dejan intactas (ayuda a detectar errores de
tipeo). Una variable conocida sin valor se reemplaza por vacío.

## Generación del link `wa.me`

`buildWhatsappLink(e164, mensaje)` →
`https://wa.me/<e164>?text=<encodeURIComponent(mensaje)>`.

`encodeURIComponent` protege espacios, saltos de línea, emojis, tildes y signos.
Al hacer clic se abre con `window.open(link, '_blank', 'noopener,noreferrer')`;
nunca se envía solo.

## Normalización de teléfonos

`normalizeWhatsappPhone(raw)` (en `src/lib/cumpleanos/telefono.ts`) convierte el
texto libre de `clientes.telefono` a E.164 (solo dígitos, sin `+`). Para
Argentina el formato de WhatsApp es `54` + `9` + NSN de 10 dígitos (área +
abonado); se descartan el `0` de larga distancia y el `15` de celular.

Casos contemplados: espacios, guiones, paréntesis, `+`, `00`, código de país
`54`, y el `15`/`0` locales. Números internacionales de otro país (`+…`) se
respetan tal cual (no se inventa código de país). Devuelve:

- `{ status: 'empty' }` → sin teléfono → se muestra **"Sin teléfono"** y no hay
  botón.
- `{ status: 'invalid' }` → no convertible de forma confiable → **"⚠️ Teléfono
  inválido"** y botón deshabilitado.
- `{ status: 'ok', e164 }` → se genera el link.

## Cumpleaños y fechas

La lógica (en `src/lib/cumpleanos/fechas.ts`) **ignora el año**: un nacido el
15/03/1990 cumple el 15/03 de todos los años. El "hoy" se calcula en la zona
`America/Argentina/Buenos_Aires` con `Intl.DateTimeFormat`, no en UTC, para
evitar corrimientos de día alrededor de medianoche. El orden es: primero los de
hoy, luego por cercanía (nunca por año de nacimiento).

### Regla 29/02

Regla **fija y documentada**: en años **no bisiestos** el cumpleaños de quienes
nacieron el 29/02 se observa el **28/02** (`observedBirthday`). En años
bisiestos se mantiene el 29/02.

## Estado "WhatsApp preparado"

Marca local por cliente y año (localStorage, `src/features/cumpleanos/use-contactado.ts`).
**No** significa "mensaje enviado" (el sistema no sabe si el usuario presionó
enviar en WhatsApp); solo evita preparar dos veces el mismo saludo. Es por
navegador y se resetea cada año. (No se implementó la tabla
`birthday_contact_log`: se optó por el estado local para el MVP.)

## Seguridad / RLS

Todas las consultas usan el cliente de Supabase del navegador (anon + sesión del
usuario), por lo que respetan las políticas RLS existentes. No se crearon
endpoints que salteen RLS ni se usó la service-role key.

## Tests agregados

Unit (lógica pura, `src/lib/cumpleanos/*.test.ts`):

- `telefono.test.ts` — normalización AR (0/15/`+54`/`00`/internacional) e inválidos.
- `fechas.test.ts` — hoy, próximos, ignorar año, edad, zona horaria, regla 29/02.
- `plantilla.test.ts` — reemplazo de variables y variables desconocidas.
- `whatsapp.test.ts` — construcción del link y URL-encoding (saltos, emojis, tildes).
- `mensaje.test.ts` — orquestador: mensaje personalizado + link + manejo de teléfono.
- `listado.test.ts` — resumen, filtrado por rango, orden por cercanía, búsqueda.

Integración (servicios, `src/services/*.test.ts`):

- `cumpleanos.service.test.ts` — filtra activos con fecha y ordena.
- `settings.service.test.ts` — cargar/guardar plantilla, defaults y tabla ausente.

E2E-ish (componente, `src/features/cumpleanos/cumpleanos-page.test.tsx`):

- entrar a Cumpleaños → ver cliente que cumple hoy (marca "Hoy"),
- abrir vista previa con el mensaje personalizado,
- generar/abrir el link `wa.me` y verificar número + `text` encodeado,
- clientes sin teléfono / con teléfono inválido.

## Comandos de verificación

```bash
npm test          # vitest run  → 134 tests OK
npm run typecheck # tsc --noEmit → OK
npm run lint      # eslint .     → sin errores
npm run build     # next build   → OK (/cumpleanos y /config/cumpleanos)
```
