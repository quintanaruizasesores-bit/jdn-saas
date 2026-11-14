/**
 * Construcción pura del email de resumen diario de tareas vencidas. No hace
 * I/O: recibe las tareas ya consultadas y ordenadas (más antigua primero) y
 * devuelve asunto, HTML y texto plano. Todo el contenido dinámico se escapa.
 */

export interface TareaVencidaResumen {
  id: string;
  titulo: string;
  /** Vencimiento como `yyyy-mm-dd` (columna DATE). */
  fecha_vencimiento: string;
  cliente_nombre?: string | null;
  poliza_detalle?: string | null;
}

export interface ResumenEmail {
  subject: string;
  html: string;
  text: string;
}

/** Cantidad máxima de tareas que se listan en el correo. */
export const MAX_TAREAS_EMAIL = 20;

const COLOR_PRIMARY = '#1E5BBF';
const COLOR_NAVY = '#1A2556';

/** Escapa texto para interpolarlo en HTML (incluye contexto de atributos). */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Días de atraso de una tarea respecto de "hoy" (fecha local). Una fecha sin
 * hora vence al terminar ese día, por lo que una tarea que vence hoy tiene 0
 * días de atraso (todavía no está vencida) y solo cuenta como vencida cuando su
 * fecha es anterior a hoy.
 */
export function diasDeAtraso(
  fechaVencimiento: string,
  hoyLocal: string
): number {
  const a = parseIso(fechaVencimiento);
  const b = parseIso(hoyLocal);
  if (!a || !b) return 0;
  const diff = Math.round((b - a) / 86_400_000);
  return diff > 0 ? diff : 0;
}

function parseIso(iso: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return null;
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

function fechaLegible(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return iso;
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]))));
}

function atrasoLabel(dias: number): string {
  if (dias <= 0) return 'vence hoy';
  return dias === 1 ? '1 día de atraso' : `${dias} días de atraso`;
}

/** Contexto secundario de una tarea: cliente y/o póliza vinculada. */
function vinculo(t: TareaVencidaResumen): string | null {
  const partes: string[] = [];
  if (t.cliente_nombre?.trim()) partes.push(t.cliente_nombre.trim());
  if (t.poliza_detalle?.trim())
    partes.push(`Póliza: ${t.poliza_detalle.trim()}`);
  return partes.length ? partes.join(' · ') : null;
}

function tareasUrl(appUrl: string): string {
  return `${appUrl.replace(/\/+$/, '')}/tareas`;
}

/**
 * Email de prueba: confirma que la configuración de envío funciona. Mantiene la
 * identidad visual del resumen, sin datos de cartera.
 */
export function construirPruebaEmail(params: {
  nombre: string | null;
  appUrl: string;
}): ResumenEmail {
  const { nombre, appUrl } = params;
  const saludo = nombre?.trim() ? `Hola ${nombre.trim()}` : 'Hola';
  const url = tareasUrl(appUrl);
  const subject = 'Correo de prueba — Recordatorios de tareas';
  const text = [
    `${saludo},`,
    '',
    'Este es un correo de prueba de los recordatorios de tareas vencidas de Quintana Ruiz Asesores de Seguros.',
    'Si lo recibís, la configuración de envío funciona correctamente.',
    '',
    `Ver mis tareas: ${url}`,
  ].join('\n');

  const html = `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(
    subject
  )}</title></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Inter,Segoe UI,Arial,sans-serif;color:#111827;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:24px 0;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
        <tr><td style="background:${COLOR_NAVY};padding:20px 24px;">
          <div style="color:#ffffff;font-size:16px;font-weight:700;">Quintana Ruiz Asesores de Seguros</div>
        </td></tr>
        <tr><td style="padding:24px;">
          <p style="margin:0 0 8px;font-size:16px;">${escapeHtml(saludo)},</p>
          <p style="margin:0 0 16px;color:#374151;font-size:14px;">Este es un <b>correo de prueba</b> de los recordatorios de tareas vencidas. Si lo recibís, la configuración de envío funciona correctamente.</p>
          <div style="margin-top:8px;">
            <a href="${escapeHtml(url)}" style="display:inline-block;background:${COLOR_PRIMARY};color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 20px;border-radius:8px;">Ver mis tareas</a>
          </div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

  return { subject, html, text };
}

export function construirResumenEmail(params: {
  nombre: string | null;
  tareas: TareaVencidaResumen[];
  hoyLocal: string;
  appUrl: string;
  maxItems?: number;
}): ResumenEmail {
  const { nombre, tareas, hoyLocal, appUrl } = params;
  const maxItems = params.maxItems ?? MAX_TAREAS_EMAIL;
  const total = tareas.length;
  const visibles = tareas.slice(0, maxItems);
  const restantes = total - visibles.length;
  const url = tareasUrl(appUrl);
  const saludo = nombre?.trim() ? `Hola ${nombre.trim()}` : 'Hola';

  const subject =
    total === 1 ? 'Tenés 1 tarea vencida' : `Tenés ${total} tareas vencidas`;

  // -- Texto plano --------------------------------------------------------
  const lineasTexto = visibles.map((t) => {
    const dias = diasDeAtraso(t.fecha_vencimiento, hoyLocal);
    const v = vinculo(t);
    return [
      `• ${t.titulo}`,
      v ? `  ${v}` : null,
      `  Vencimiento: ${fechaLegible(t.fecha_vencimiento)} (${atrasoLabel(dias)})`,
    ]
      .filter(Boolean)
      .join('\n');
  });
  const text = [
    `${saludo},`,
    '',
    total === 1
      ? 'Tenés 1 tarea vencida y pendiente:'
      : `Tenés ${total} tareas vencidas y pendientes:`,
    '',
    lineasTexto.join('\n\n'),
    restantes > 0
      ? `\n…y ${restantes} tarea(s) más. Vé el listado completo en la aplicación.`
      : '',
    '',
    `Ver mis tareas vencidas: ${url}`,
    '',
    'Quintana Ruiz Asesores de Seguros',
  ]
    .filter((l) => l !== '')
    .join('\n');

  // -- HTML ---------------------------------------------------------------
  const filas = visibles
    .map((t) => {
      const dias = diasDeAtraso(t.fecha_vencimiento, hoyLocal);
      const v = vinculo(t);
      return `
      <tr>
        <td style="padding:12px 0;border-bottom:1px solid #e5e7eb;">
          <div style="font-weight:600;color:${COLOR_NAVY};font-size:15px;">${escapeHtml(
            t.titulo
          )}</div>
          ${
            v
              ? `<div style="color:#4b5563;font-size:13px;margin-top:2px;">${escapeHtml(v)}</div>`
              : ''
          }
          <div style="color:#b91c1c;font-size:13px;margin-top:4px;">Vence ${escapeHtml(
            fechaLegible(t.fecha_vencimiento)
          )} · ${escapeHtml(atrasoLabel(dias))}</div>
        </td>
      </tr>`;
    })
    .join('');

  const extra =
    restantes > 0
      ? `<p style="color:#4b5563;font-size:13px;margin:16px 0 0;">…y ${restantes} tarea(s) más. <a href="${escapeHtml(
          url
        )}" style="color:${COLOR_PRIMARY};">Ver el listado completo</a>.</p>`
      : '';

  const html = `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(
    subject
  )}</title></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Inter,Segoe UI,Arial,sans-serif;color:#111827;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:24px 0;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
        <tr><td style="background:${COLOR_NAVY};padding:20px 24px;">
          <div style="color:#ffffff;font-size:16px;font-weight:700;">Quintana Ruiz Asesores de Seguros</div>
        </td></tr>
        <tr><td style="padding:24px;">
          <p style="margin:0 0 4px;font-size:16px;">${escapeHtml(saludo)},</p>
          <p style="margin:0 0 16px;color:#374151;font-size:14px;">${
            total === 1
              ? 'Tenés <b>1 tarea vencida</b> y pendiente:'
              : `Tenés <b>${total} tareas vencidas</b> y pendientes:`
          }</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${filas}</table>
          ${extra}
          <div style="margin-top:24px;">
            <a href="${escapeHtml(url)}" style="display:inline-block;background:${COLOR_PRIMARY};color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 20px;border-radius:8px;">Ver mis tareas vencidas</a>
          </div>
          <p style="margin:20px 0 0;color:#9ca3af;font-size:12px;">Recibís este correo porque activaste los recordatorios de tareas vencidas. Podés desactivarlos en Configuración → Notificaciones por email.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

  return { subject, html, text };
}
