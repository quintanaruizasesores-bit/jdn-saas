/**
 * Layout HTML compartido para correos de la aplicación (identidad Quintana Ruiz).
 * Reutiliza el `escapeHtml` del resumen de tareas. El cuerpo se pasa ya como HTML
 * seguro (los correos de cross-selling se arman desde texto escapado).
 */
import { escapeHtml } from '@/lib/notificaciones/resumen';

export { escapeHtml };

const COLOR_PRIMARY = '#1E5BBF';
const COLOR_NAVY = '#1A2556';

export const EMPRESA_NOMBRE = 'Quintana Ruiz Asesores de Seguros';

/**
 * Envuelve el cuerpo HTML en el layout de marca. Si se provee `bajaUrl`, agrega
 * un pie con el enlace de baja visible (obligatorio en comunicación comercial).
 */
export function construirEmailLayout(params: {
  asunto: string;
  cuerpoHtml: string;
  bajaUrl?: string | null;
  empresa?: string;
}): string {
  const empresa = params.empresa?.trim() || EMPRESA_NOMBRE;
  const pieBaja = params.bajaUrl
    ? `<p style="margin:20px 0 0;color:#9ca3af;font-size:12px;">
         Si no querés recibir más propuestas comerciales, podés
         <a href="${escapeHtml(params.bajaUrl)}" style="color:${COLOR_PRIMARY};">darte de baja acá</a>.
       </p>`
    : '';
  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(
    params.asunto
  )}</title></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Inter,Segoe UI,Arial,sans-serif;color:#111827;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:24px 0;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
        <tr><td style="background:${COLOR_NAVY};padding:20px 24px;">
          <div style="color:#ffffff;font-size:16px;font-weight:700;">${escapeHtml(empresa)}</div>
        </td></tr>
        <tr><td style="padding:24px;font-size:14px;color:#374151;line-height:1.55;">
          ${params.cuerpoHtml}
          ${pieBaja}
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}
