/**
 * Lógica pura de horario local para el resumen diario. Trabaja sobre la zona
 * horaria IANA de cada usuario y evita los corrimientos por UTC alrededor de
 * medianoche. Reutiliza `getTodayInTimezone` del módulo de cumpleaños para la
 * fecha civil local.
 */
import { getTodayInTimezone, type FechaPartes } from '@/lib/cumpleanos/fechas';

/** Ventana (en horas) tras la hora elegida durante la cual se intenta enviar. */
export const VENTANA_ENVIO_HORAS = 3;

function isoDate(p: FechaPartes): string {
  return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
}

/** Fecha civil local (`yyyy-mm-dd`) en la zona indicada. */
export function fechaLocal(zona: string, now: Date = new Date()): string {
  return isoDate(getTodayInTimezone(zona, now));
}

/** Hora local (0–23) en la zona indicada. */
export function horaLocal(zona: string, now: Date = new Date()): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: zona,
    hour: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const hora = Number(parts.find((p) => p.type === 'hour')?.value);
  return Number.isFinite(hora) ? hora % 24 : 0;
}

/**
 * `true` si la hora local actual está dentro de la ventana de envío que empieza
 * en `horaObjetivo`. La ventana se recorta al final del día (no cruza
 * medianoche) para no enviar un resumen con una fecha local distinta a la que
 * se usó para deduplicar.
 */
export function dentroDeVentana(
  horaObjetivo: number,
  zona: string,
  now: Date = new Date()
): boolean {
  const actual = horaLocal(zona, now);
  const fin = Math.min(horaObjetivo + VENTANA_ENVIO_HORAS, 24);
  return actual >= horaObjetivo && actual < fin;
}
