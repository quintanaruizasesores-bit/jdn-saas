import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { createServiceClient } from '@/lib/supabase/server';
import { emailConfigurado, sendEmail } from '@/lib/email/resend';
import {
  procesarResumenDiario,
  type WorkspacePref,
} from '@/lib/notificaciones/cron';
import { fetchTareasVencidas } from '@/services/notificaciones.service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const privateHeaders = { 'Cache-Control': 'private, no-store' };

/** Comparación en tiempo (casi) constante del secreto del cron. */
function autorizado(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = request.headers.get('authorization') ?? '';
  const expected = `Bearer ${secret}`;
  const a = Buffer.from(header);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function GET(request: NextRequest) {
  if (!process.env.CRON_SECRET) {
    return NextResponse.json(
      { error: 'CRON_SECRET no configurado en el servidor.' },
      { status: 500, headers: privateHeaders }
    );
  }
  if (!autorizado(request)) {
    return NextResponse.json(
      { error: 'No autorizado.' },
      { status: 401, headers: privateHeaders }
    );
  }
  if (!emailConfigurado()) {
    return NextResponse.json(
      {
        error:
          'El envío de correos no está configurado (faltan RESEND_API_KEY y/o RESEND_FROM).',
      },
      { status: 503, headers: privateHeaders }
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  const supabase = await createServiceClient();

  const listarPrefsActivas = async (): Promise<WorkspacePref[]> => {
    const { data: prefs, error } = await supabase
      .from('notificacion_email_prefs')
      .select('workspace_id, activo, destinatario, hora_local, zona_horaria')
      .eq('activo', true);
    if (error) throw error;
    const filas = prefs ?? [];
    if (filas.length === 0) return [];

    const workspaceIds = filas.map((p) => p.workspace_id);
    const { data: workspaces, error: wErr } = await supabase
      .from('workspaces')
      .select('id, owner_user_id, nombre')
      .in('id', workspaceIds);
    if (wErr) throw wErr;
    const wById = new Map((workspaces ?? []).map((w) => [w.id as string, w]));

    const ownerIds = (workspaces ?? []).map((w) => w.owner_user_id as string);
    const { data: profiles, error: pErr } = await supabase
      .from('profiles')
      .select('id, nombre, email')
      .in('id', ownerIds);
    if (pErr) throw pErr;
    const profById = new Map((profiles ?? []).map((p) => [p.id as string, p]));

    return filas.map((p) => {
      const ws = wById.get(p.workspace_id);
      const prof = ws ? profById.get(ws.owner_user_id as string) : undefined;
      return {
        workspace_id: p.workspace_id as string,
        activo: Boolean(p.activo),
        destinatario: (p.destinatario as string | null) ?? null,
        hora_local: p.hora_local as number,
        zona_horaria: p.zona_horaria as string,
        owner_nombre:
          (prof?.nombre as string | null) ??
          ((ws?.nombre as string | null) || null),
        owner_email: (prof?.email as string | null) ?? null,
      } satisfies WorkspacePref;
    });
  };

  try {
    const resultado = await procesarResumenDiario({
      now: new Date(),
      appUrl,
      listarPrefsActivas,
      tareasVencidas: (workspaceId, hoyLocal) =>
        fetchTareasVencidas(supabase, { hoyLocal, workspaceId }),
      reclamar: async (workspaceId, fechaLocal) => {
        const { data, error } = await supabase.rpc('reclamar_resumen_diario', {
          p_workspace_id: workspaceId,
          p_fecha_local: fechaLocal,
          p_max_intentos: 3,
        });
        if (error) throw error;
        return (data as string | null) ?? null;
      },
      enviar: (p) => sendEmail(p),
      finalizar: async (envioId, estado, extra) => {
        await supabase
          .from('notificacion_email_envios')
          .update({
            estado,
            provider_id: extra.provider_id ?? null,
            error: extra.error ? extra.error.slice(0, 500) : null,
            total_tareas: extra.total_tareas ?? null,
          })
          .eq('id', envioId);
      },
    });

    return NextResponse.json(
      { ok: true, ...resultado },
      { headers: privateHeaders }
    );
  } catch (e) {
    return NextResponse.json(
      {
        error: `No se pudo procesar el resumen diario: ${(e as Error).message}`,
      },
      { status: 500, headers: privateHeaders }
    );
  }
}
