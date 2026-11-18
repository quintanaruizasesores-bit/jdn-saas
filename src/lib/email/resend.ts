/**
 * Cliente mínimo de Resend basado en `fetch` (sin dependencias nuevas). La
 * clave de API y el remitente se leen de variables de entorno del servidor y
 * nunca se exponen al cliente. Resend se configura una sola vez para toda la
 * aplicación; cada usuario solo elige su correo de destino y preferencias.
 */

export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text: string;
  /** Clave de idempotencia del proveedor (evita duplicados en reintentos). */
  idempotencyKey?: string;
  /** Dirección de respuesta (p. ej. para que el cliente responda al asesor). */
  replyTo?: string;
  /** Encabezados adicionales (p. ej. List-Unsubscribe en comunicación comercial). */
  headers?: Record<string, string>;
  /** Remitente alternativo (por defecto RESEND_FROM). */
  from?: string;
}

export interface SendEmailResult {
  id: string;
}

/** Error con bandera `transient` para habilitar reintentos controlados. */
export class EmailSendError extends Error {
  readonly transient: boolean;
  readonly status?: number;
  constructor(
    message: string,
    opts: { transient: boolean; status?: number } = { transient: false }
  ) {
    super(message);
    this.name = 'EmailSendError';
    this.transient = opts.transient;
    this.status = opts.status;
  }
}

const RESEND_ENDPOINT = 'https://api.resend.com/emails';

/** `true` si Resend está configurado (clave + remitente presentes). */
export function emailConfigurado(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM);
}

export async function sendEmail(
  params: SendEmailParams,
  fetchImpl: typeof fetch = fetch
): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = params.from ?? process.env.RESEND_FROM;
  if (!apiKey || !from) {
    throw new EmailSendError(
      'El envío de correos no está configurado (faltan RESEND_API_KEY y/o RESEND_FROM).',
      { transient: false }
    );
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  };
  if (params.idempotencyKey) headers['Idempotency-Key'] = params.idempotencyKey;

  let res: Response;
  try {
    res = await fetchImpl(RESEND_ENDPOINT, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        from,
        to: params.to,
        subject: params.subject,
        html: params.html,
        text: params.text,
        ...(params.replyTo ? { reply_to: params.replyTo } : {}),
        ...(params.headers ? { headers: params.headers } : {}),
      }),
    });
  } catch (e) {
    // Fallo de red: transitorio, reintentable.
    throw new EmailSendError(
      `No se pudo contactar al proveedor de correo: ${(e as Error).message}`,
      { transient: true }
    );
  }

  if (!res.ok) {
    const detalle = await safeText(res);
    // 429 y 5xx son transitorios; el resto (400/401/403/422) no lo son.
    const transient = res.status === 429 || res.status >= 500;
    throw new EmailSendError(`Resend respondió ${res.status}: ${detalle}`, {
      transient,
      status: res.status,
    });
  }

  const data = (await res.json().catch(() => ({}))) as { id?: string };
  return { id: data.id ?? '' };
}

async function safeText(res: Response): Promise<string> {
  try {
    const t = await res.text();
    return t.slice(0, 500);
  } catch {
    return '(sin detalle)';
  }
}
