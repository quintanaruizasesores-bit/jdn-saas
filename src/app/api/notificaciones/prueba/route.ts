import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { emailConfigurado, sendEmail } from '@/lib/email/resend';
import { construirPruebaEmail } from '@/lib/notificaciones/resumen';
import { fechaLocal } from '@/lib/notificaciones/horario';
import { normalizePrefs } from '@/lib/notificaciones/prefs';
import {
  ENVIOS_TABLE,
  fetchEmailPrefsRow,
} from '@/services/notificaciones.service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Intervalo mínimo entre correos de prueba por usuario (límite de frecuencia). */
const PRUEBA_MIN_INTERVALO_MS = 60_000;

const privateHeaders = { 'Cache-Control': 'private, no-store', Vary: 'Cookie' };

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { error: 'Iniciá sesión para continuar.' },
      { status: 401, headers: privateHeaders }
    );
  }

  if (!emailConfigurado()) {
    return NextResponse.json(
      {
        error:
          'El envío de correos todavía no está configurado. Pedí al administrador que cargue las credenciales de Resend.',
      },
      { status: 503, headers: privateHeaders }
    );
  }

  // Preferencias propias (RLS las acota al workspace del usuario).
  const row = await fetchEmailPrefsRow(supabase);
  const prefs = normalizePrefs(row);
  if (!row || !prefs.destinatario) {
    return NextResponse.json(
      {
        error:
          'Guardá primero un correo de destino para poder enviar una prueba.',
      },
      { status: 400, headers: privateHeaders }
    );
  }

  // Límite de frecuencia: solo un correo de prueba por minuto.
  const desde = new Date(Date.now() - PRUEBA_MIN_INTERVALO_MS).toISOString();
  const { count: recientes, error: rlError } = await supabase
    .from(ENVIOS_TABLE)
    .select('id', { count: 'exact', head: true })
    .eq('tipo', 'PRUEBA')
    .gte('created_at', desde);
  if (rlError) {
    return NextResponse.json(
      { error: 'No se pudo verificar el límite de frecuencia.' },
      { status: 500, headers: privateHeaders }
    );
  }
  if ((recientes ?? 0) > 0) {
    return NextResponse.json(
      { error: 'Esperá un momento antes de enviar otra prueba.' },
      { status: 429, headers: privateHeaders }
    );
  }

  // Registrar el intento (workspace_id explícito; la RLS verifica que sea el propio).
  const { data: envio, error: insError } = await supabase
    .from(ENVIOS_TABLE)
    .insert({
      workspace_id: row.workspace_id,
      tipo: 'PRUEBA',
      fecha_local: fechaLocal(prefs.zona_horaria),
      estado: 'ENVIANDO',
      intentos: 1,
    })
    .select('id')
    .single();
  if (insError || !envio) {
    return NextResponse.json(
      { error: 'No se pudo registrar el envío de prueba.' },
      { status: 500, headers: privateHeaders }
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  const { subject, html, text } = construirPruebaEmail({
    nombre: null,
    appUrl,
  });

  try {
    const { id } = await sendEmail({
      to: prefs.destinatario,
      subject,
      html,
      text,
      idempotencyKey: `prueba-${envio.id}`,
    });
    await supabase
      .from(ENVIOS_TABLE)
      .update({ estado: 'ENVIADO', provider_id: id })
      .eq('id', envio.id);
    return NextResponse.json(
      { ok: true, destinatario: prefs.destinatario },
      { headers: privateHeaders }
    );
  } catch (e) {
    await supabase
      .from(ENVIOS_TABLE)
      .update({ estado: 'ERROR', error: (e as Error).message.slice(0, 500) })
      .eq('id', envio.id);
    return NextResponse.json(
      {
        error:
          'No se pudo enviar el correo de prueba. Intentá de nuevo más tarde.',
      },
      { status: 502, headers: privateHeaders }
    );
  }
}
