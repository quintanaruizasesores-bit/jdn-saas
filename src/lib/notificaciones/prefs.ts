import { APP_TIMEZONE } from '@/lib/cumpleanos/fechas';
import {
  isValidTimeZone,
  type EmailNotifPrefs,
} from '@/validations/notificaciones.schema';

/** Preferencias por defecto: recordatorios desactivados (opt-in explícito). */
export const DEFAULT_EMAIL_NOTIF_PREFS: EmailNotifPrefs = {
  activo: false,
  destinatario: null,
  hora_local: 8,
  zona_horaria: APP_TIMEZONE,
};

/** Fila cruda de `notificacion_email_prefs` tal como llega de Supabase. */
export interface EmailNotifPrefsRow {
  workspace_id?: string;
  activo?: boolean | null;
  destinatario?: string | null;
  hora_local?: number | null;
  zona_horaria?: string | null;
}

/**
 * Normaliza una fila de preferencias (posiblemente ausente o parcial) a un
 * objeto completo y seguro, aplicando los valores por defecto cuando falta un
 * campo o cuando el valor guardado quedó fuera de rango.
 */
export function normalizePrefs(
  row: EmailNotifPrefsRow | null | undefined
): EmailNotifPrefs {
  if (!row) return { ...DEFAULT_EMAIL_NOTIF_PREFS };
  const hora =
    typeof row.hora_local === 'number' &&
    Number.isInteger(row.hora_local) &&
    row.hora_local >= 0 &&
    row.hora_local <= 23
      ? row.hora_local
      : DEFAULT_EMAIL_NOTIF_PREFS.hora_local;
  const zona =
    typeof row.zona_horaria === 'string' && isValidTimeZone(row.zona_horaria)
      ? row.zona_horaria
      : DEFAULT_EMAIL_NOTIF_PREFS.zona_horaria;
  const destinatario =
    typeof row.destinatario === 'string' && row.destinatario.trim()
      ? row.destinatario.trim()
      : null;
  return {
    activo: Boolean(row.activo),
    destinatario,
    hora_local: hora,
    zona_horaria: zona,
  };
}
