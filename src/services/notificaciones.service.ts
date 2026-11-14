import type { SupabaseClient } from '@supabase/supabase-js';
import {
  normalizePrefs,
  type EmailNotifPrefsRow,
} from '@/lib/notificaciones/prefs';
import type { EmailNotifPrefs } from '@/validations/notificaciones.schema';
import type { TareaVencidaResumen } from '@/lib/notificaciones/resumen';

/** Clave de Postgres para "la relación no existe" (migración 015 sin aplicar). */
const UNDEFINED_TABLE = '42P01';

export const PREFS_TABLE = 'notificacion_email_prefs';
export const ENVIOS_TABLE = 'notificacion_email_envios';

/**
 * Lee la fila cruda de preferencias del usuario (una por workspace, aislada por
 * RLS). Devuelve `null` si no hay fila o si la tabla todavía no existe.
 */
export async function fetchEmailPrefsRow(
  supabase: SupabaseClient
): Promise<(EmailNotifPrefsRow & { workspace_id: string }) | null> {
  const { data, error } = await supabase
    .from(PREFS_TABLE)
    .select('workspace_id, activo, destinatario, hora_local, zona_horaria')
    .maybeSingle();
  if (error) {
    if (error.code === UNDEFINED_TABLE) return null;
    throw error;
  }
  return (
    (data as (EmailNotifPrefsRow & { workspace_id: string }) | null) ?? null
  );
}

/** Preferencias normalizadas del usuario (con valores por defecto). */
export async function fetchEmailPrefs(
  supabase: SupabaseClient
): Promise<EmailNotifPrefs> {
  return normalizePrefs(await fetchEmailPrefsRow(supabase));
}

/** Guarda (upsert) las preferencias del usuario. El workspace lo fija el trigger. */
export async function saveEmailPrefs(
  supabase: SupabaseClient,
  prefs: EmailNotifPrefs
): Promise<void> {
  const { error } = await supabase.from(PREFS_TABLE).upsert(
    {
      activo: prefs.activo,
      destinatario: prefs.destinatario,
      hora_local: prefs.hora_local,
      zona_horaria: prefs.zona_horaria,
    },
    { onConflict: 'workspace_id' }
  );
  if (error) throw error;
}

interface TareaVencidaRow {
  id: string;
  titulo: string;
  fecha_vencimiento: string;
  cliente: { nombre: string | null; apellido: string | null } | null;
  poliza: { detalle: string | null } | null;
}

/**
 * Tareas vencidas y pendientes: estado PENDIENTE, con vencimiento, y cuya fecha
 * es anterior a "hoy" en la zona del usuario (una fecha sin hora vence al
 * terminar ese día). Ordenadas de la más antigua a la más reciente.
 *
 * Con `workspaceId` (ejecución del cron con service_role, que saltea RLS) se
 * acota explícitamente al workspace. Sin él, la RLS por sesión ya recorta al
 * workspace del usuario.
 */
export async function fetchTareasVencidas(
  supabase: SupabaseClient,
  opts: { hoyLocal: string; workspaceId?: string }
): Promise<TareaVencidaResumen[]> {
  let query = supabase
    .from('tareas')
    .select(
      'id, titulo, fecha_vencimiento, created_at, cliente:clientes(nombre, apellido), poliza:polizas(detalle)'
    )
    .eq('estado', 'PENDIENTE')
    .not('fecha_vencimiento', 'is', null)
    .lt('fecha_vencimiento', opts.hoyLocal)
    .order('fecha_vencimiento', { ascending: true })
    .order('created_at', { ascending: true });

  if (opts.workspaceId) query = query.eq('workspace_id', opts.workspaceId);

  const { data, error } = await query;
  if (error) throw error;

  return ((data ?? []) as unknown as TareaVencidaRow[]).map((t) => ({
    id: t.id,
    titulo: t.titulo,
    fecha_vencimiento: t.fecha_vencimiento,
    cliente_nombre: nombreCliente(t.cliente),
    poliza_detalle: t.poliza?.detalle ?? null,
  }));
}

function nombreCliente(
  cliente: { nombre: string | null; apellido: string | null } | null
): string | null {
  if (!cliente) return null;
  const n = `${cliente.nombre ?? ''} ${cliente.apellido ?? ''}`.trim();
  return n || null;
}
