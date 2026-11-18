/**
 * Tokens firmados para la baja comercial (List-Unsubscribe y enlace visible).
 * El destinatario accede sin sesión: el token (HMAC-SHA256) lleva el workspace y
 * el email, firmados con `CROSSSELL_UNSUBSCRIBE_SECRET` (solo servidor). Así se
 * registra la supresión sin exponer identificadores ni requerir login.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';

export interface BajaPayload {
  /** workspace_id */
  w: string;
  /** email del destinatario */
  e: string;
  /** correo_id (opcional, para trazabilidad) */
  c?: string;
}

function secret(): string | null {
  return process.env.CROSSSELL_UNSUBSCRIBE_SECRET || null;
}

function b64url(buf: Buffer): string {
  return buf
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function fromB64url(s: string): Buffer {
  return Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
}

function firma(data: string, key: string): string {
  return b64url(createHmac('sha256', key).update(data).digest());
}

/** Firma un token de baja. Devuelve `null` si falta el secreto. */
export function firmarTokenBaja(payload: BajaPayload): string | null {
  const key = secret();
  if (!key) return null;
  const data = b64url(Buffer.from(JSON.stringify(payload), 'utf8'));
  return `${data}.${firma(data, key)}`;
}

/** Verifica un token y devuelve el payload, o `null` si es inválido. */
export function verificarTokenBaja(token: string): BajaPayload | null {
  const key = secret();
  if (!key || !token) return null;
  const partes = token.split('.');
  if (partes.length !== 2) return null;
  const [data, sig] = partes;
  const esperada = firma(data, key);
  const a = Buffer.from(sig);
  const b = Buffer.from(esperada);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(fromB64url(data).toString('utf8')) as BajaPayload;
    if (!payload.w || !payload.e) return null;
    return payload;
  } catch {
    return null;
  }
}

/** Construye la URL pública de baja a partir del token. */
export function urlBaja(appUrl: string, token: string): string {
  return `${appUrl.replace(/\/+$/, '')}/api/cross-selling/baja?token=${encodeURIComponent(token)}`;
}
