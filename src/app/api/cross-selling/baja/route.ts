import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { verificarTokenBaja } from '@/lib/crosssell/correo/baja';
import { suprimirEmail } from '@/services/crosssell.service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Baja comercial desde el enlace del correo. Sin sesión: el token firmado lleva
 * el workspace y el email. GET muestra una confirmación; POST cubre la baja de
 * un clic (List-Unsubscribe-Post). Registra la supresión con service_role.
 */
async function registrar(token: string): Promise<boolean> {
  const payload = verificarTokenBaja(token);
  if (!payload) return false;
  const supabase = await createServiceClient();
  const { error } = await suprimirEmail(supabase, {
    email: payload.e,
    motivo: 'BAJA',
    origen: 'list-unsubscribe',
    workspaceId: payload.w,
  });
  return !error;
}

function pagina(ok: boolean): NextResponse {
  const html = ok
    ? `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Baja confirmada</title></head>
<body style="font-family:Inter,Segoe UI,Arial,sans-serif;background:#f3f4f6;margin:0;padding:48px 16px;color:#111827;text-align:center;">
<div style="max-width:420px;margin:0 auto;background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:32px;">
<h1 style="font-size:18px;color:#1A2556;">Listo, te diste de baja</h1>
<p style="font-size:14px;color:#374151;">No vas a recibir más propuestas comerciales de Quintana Ruiz Asesores de Seguros.</p>
</div></body></html>`
    : `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Enlace inválido</title></head>
<body style="font-family:Inter,Segoe UI,Arial,sans-serif;background:#f3f4f6;margin:0;padding:48px 16px;color:#111827;text-align:center;">
<div style="max-width:420px;margin:0 auto;background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:32px;">
<h1 style="font-size:18px;color:#1A2556;">No pudimos procesar la baja</h1>
<p style="font-size:14px;color:#374151;">El enlace es inválido o expiró. Respondé el correo y te damos de baja manualmente.</p>
</div></body></html>`;
  return new NextResponse(html, {
    status: ok ? 200 : 400,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token') ?? '';
  return pagina(await registrar(token));
}

export async function POST(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token') ?? '';
  const ok = await registrar(token);
  return NextResponse.json(
    { ok },
    { status: ok ? 200 : 400, headers: { 'Cache-Control': 'no-store' } }
  );
}
