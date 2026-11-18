import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { emailConfigurado, sendEmail } from '@/lib/email/resend';
import {
  CORREO_TABLE,
  contarEnviosPrevios,
  emailSuprimido,
  logCrossSellEvento,
} from '@/services/crosssell.service';
import { construirCorreo } from '@/lib/crosssell/correo/plantilla';
import { firmarTokenBaja, urlBaja } from '@/lib/crosssell/correo/baja';
import { crossSellCorreoEnviarSchema } from '@/validations/crosssell.schema';
import type { CrossSellCorreo } from '@/types/database';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const headers = { 'Cache-Control': 'private, no-store', Vary: 'Cookie' };

/**
 * Envía UN único correo (el del `correo_id` recibido) mediante Resend. Nunca
 * dispara envíos masivos. Respeta supresión, advierte reenvíos y es idempotente
 * (claim atómico + Idempotency-Key). El envío real queda sujeto a la acción
 * explícita del operador.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json(
      { error: 'Iniciá sesión para continuar.' },
      { status: 401, headers }
    );

  if (!emailConfigurado())
    return NextResponse.json(
      {
        error:
          'El envío de correos todavía no está configurado (faltan credenciales de Resend).',
      },
      { status: 503, headers }
    );

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const parsed = crossSellCorreoEnviarSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Datos inválidos.' },
      { status: 400, headers }
    );
  const { correo_id, confirmar_reenvio } = parsed.data;

  // Cargar el correo (RLS lo acota al workspace del usuario).
  const { data: correoData, error: correoErr } = await supabase
    .from(CORREO_TABLE)
    .select('*')
    .eq('id', correo_id)
    .maybeSingle();
  if (correoErr)
    return NextResponse.json(
      { error: 'No se pudo leer el correo.' },
      { status: 500, headers }
    );
  const correo = correoData as CrossSellCorreo | null;
  if (!correo)
    return NextResponse.json(
      { error: 'No se encontró el correo.' },
      { status: 404, headers }
    );
  if (correo.estado === 'ENVIADO')
    return NextResponse.json(
      { error: 'Este correo ya fue enviado.' },
      { status: 409, headers }
    );

  const destinatario = correo.destinatario_email.trim();
  if (!destinatario)
    return NextResponse.json(
      { error: 'El correo no tiene destinatario.' },
      { status: 400, headers }
    );
  if (!correo.asunto.trim() || !correo.cuerpo_text.trim())
    return NextResponse.json(
      { error: 'Completá el asunto y el cuerpo antes de enviar.' },
      { status: 400, headers }
    );

  // Supresión: no enviar a quien se dio de baja / rebotó / se quejó.
  if (await emailSuprimido(supabase, destinatario))
    return NextResponse.json(
      {
        error:
          'El destinatario está en la lista de supresión (baja/rebote/queja). No se envió.',
      },
      { status: 409, headers }
    );

  // Advertencia de reenvío: ya se contactó esta cobertura.
  if (!confirmar_reenvio) {
    const previos = await contarEnviosPrevios(
      supabase,
      correo.cliente_id,
      correo.categoria_objetivo_id
    );
    if (previos > 0)
      return NextResponse.json(
        {
          needsConfirm: true,
          error:
            'Ya se le envió una propuesta de esta cobertura. ¿Confirmás reenviar?',
        },
        { status: 409, headers }
      );
  }

  // Reclamo atómico: BORRADOR/FALLIDO -> ENVIANDO (anti doble-envío).
  const { data: claimed, error: claimErr } = await supabase.rpc(
    'crosssell_reclamar_correo',
    { p_correo_id: correo_id }
  );
  if (claimErr)
    return NextResponse.json(
      { error: 'No se pudo preparar el envío.' },
      { status: 500, headers }
    );
  if (!claimed)
    return NextResponse.json(
      { error: 'El correo ya fue enviado o está en curso.' },
      { status: 409, headers }
    );

  // Resolver nombre para cualquier variable remanente (el editor ya pre-resuelve).
  const { data: cli } = await supabase
    .from('clientes')
    .select('nombre, apellido')
    .eq('id', correo.cliente_id)
    .maybeSingle();

  const appUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  const token = firmarTokenBaja({
    w: correo.workspace_id,
    e: destinatario,
    c: correo.id,
  });
  const bajaUrl = token ? urlBaja(appUrl, token) : null;

  const { asunto, html, text } = construirCorreo({
    asunto: correo.asunto,
    cuerpo: correo.cuerpo_text,
    vars: {
      nombre: (cli as { nombre?: string } | null)?.nombre ?? '',
      apellido: (cli as { apellido?: string } | null)?.apellido ?? '',
      ramoAsegurado: '',
      coberturaOfrecida: '',
      empresa: '',
    },
    bajaUrl,
  });

  const emailHeaders: Record<string, string> = {};
  if (bajaUrl) {
    emailHeaders['List-Unsubscribe'] = `<${bajaUrl}>`;
    emailHeaders['List-Unsubscribe-Post'] = 'List-Unsubscribe=One-Click';
  }

  try {
    const { id } = await sendEmail({
      to: destinatario,
      subject: asunto,
      html,
      text,
      idempotencyKey: `crosssell-correo-${correo.id}`,
      replyTo: process.env.RESEND_FROM,
      headers: emailHeaders,
    });
    await supabase
      .from(CORREO_TABLE)
      .update({
        estado: 'ENVIADO',
        resend_email_id: id,
        cuerpo_html: html,
        enviado_at: new Date().toISOString(),
        error: null,
      })
      .eq('id', correo.id);

    // La oportunidad pasa a "Contactada" si estaba abierta y sin contactar.
    if (correo.oportunidad_id) {
      await supabase
        .from('crosssell_oportunidad')
        .update({ estado: 'CONTACTADA' })
        .eq('id', correo.oportunidad_id)
        .in('estado', ['NUEVA', 'VISTA']);
    }
    await logCrossSellEvento(supabase, {
      cliente_id: correo.cliente_id,
      oportunidad_id: correo.oportunidad_id,
      correo_id: correo.id,
      tipo: 'CORREO_ENVIADO',
      detalle: { asunto, destinatario },
      actor_user_id: user.id,
    });

    return NextResponse.json(
      { ok: true, destinatario, resendId: id },
      { headers }
    );
  } catch (e) {
    const err = e as Error & { status?: number };
    const detalle = (err.message ?? 'Error desconocido').slice(0, 500);
    await supabase
      .from(CORREO_TABLE)
      .update({ estado: 'FALLIDO', error: detalle })
      .eq('id', correo.id);
    return NextResponse.json(
      {
        error: 'No se pudo enviar el correo.',
        detalle,
        resendStatus: typeof err.status === 'number' ? err.status : undefined,
      },
      { status: 502, headers }
    );
  }
}
