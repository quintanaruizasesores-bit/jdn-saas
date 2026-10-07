/**
 * Lógica pura de cumpleaños. Trabaja sobre `{ year, month, day }` (month/day
 * en base 1) para ignorar completamente la hora y evitar los corrimientos de
 * día por UTC alrededor de medianoche.
 *
 * El cumpleaños ignora el año: un cliente nacido el 15/03/1990 cumple el 15/03
 * de todos los años. El "hoy" se calcula en la zona horaria de la aplicación
 * (Argentina), no en UTC, para que a las 23:30 de Buenos Aires no se adelante
 * un día.
 *
 * Regla 29/02: para años no bisiestos el cumpleaños se observa el 28/02. Es una
 * regla fija y documentada (ver `observedBirthday`), elegida por simplicidad
 * frente a hacerla configurable.
 */

/** Zona horaria de referencia de la aplicación. */
export const APP_TIMEZONE = 'America/Argentina/Buenos_Aires';

export interface FechaPartes {
  year: number;
  /** Mes en base 1 (1 = enero). */
  month: number;
  day: number;
}

export type MonthDay = Pick<FechaPartes, 'month' | 'day'>;

/** Parsea `'yyyy-mm-dd'` (columna DATE de Postgres) sin construir un `Date`. */
export function parseIsoDate(iso: string | null | undefined): FechaPartes | null {
  if (!iso) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return { year, month, day };
}

/**
 * Devuelve el "hoy" en la zona horaria indicada como `{ year, month, day }`.
 * Usa `Intl.DateTimeFormat` con `en-CA` (formato ISO `yyyy-mm-dd`) para obtener
 * la fecha civil correcta sin depender de la zona del servidor.
 */
export function getTodayInTimezone(
  timeZone: string = APP_TIMEZONE,
  now: Date = new Date()
): FechaPartes {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return { year: get('year'), month: get('month'), day: get('day') };
}

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/**
 * Día en que se observa el cumpleaños dentro de un año concreto. Para los
 * nacidos el 29/02, en años no bisiestos se observa el 28/02.
 */
export function observedBirthday(nacimiento: MonthDay, year: number): MonthDay {
  if (nacimiento.month === 2 && nacimiento.day === 29 && !isLeapYear(year)) {
    return { month: 2, day: 28 };
  }
  return { month: nacimiento.month, day: nacimiento.day };
}

/** Días (enteros) entre dos fechas civiles, usando UTC solo para contar. */
function diffInDays(a: FechaPartes, b: FechaPartes): number {
  const ua = Date.UTC(a.year, a.month - 1, a.day);
  const ub = Date.UTC(b.year, b.month - 1, b.day);
  return Math.round((ua - ub) / 86_400_000);
}

/**
 * Días hasta el próximo cumpleaños (0 = es hoy), ignorando el año de
 * nacimiento. Si el cumpleaños de este año ya pasó, cuenta hasta el del año
 * siguiente. Contempla la regla 29/02 en cada año evaluado.
 */
export function daysUntilBirthday(nacimiento: MonthDay, today: FechaPartes): number {
  const thisYear = observedBirthday(nacimiento, today.year);
  const candidate: FechaPartes = { year: today.year, month: thisYear.month, day: thisYear.day };
  const diff = diffInDays(candidate, today);
  if (diff >= 0) return diff;

  const nextYear = observedBirthday(nacimiento, today.year + 1);
  const next: FechaPartes = { year: today.year + 1, month: nextYear.month, day: nextYear.day };
  return diffInDays(next, today);
}

/** `true` si el cumpleaños (observado) cae hoy. */
export function isBirthdayToday(nacimiento: MonthDay, today: FechaPartes): boolean {
  return daysUntilBirthday(nacimiento, today) === 0;
}

/**
 * Edad en años cumplidos a la fecha `today`. Devuelve `null` si no hay año de
 * nacimiento confiable (p. ej. la fecha no incluye el año).
 */
export function calcularEdad(nacimiento: FechaPartes, today: FechaPartes): number | null {
  if (!nacimiento.year) return null;
  let edad = today.year - nacimiento.year;
  const yaCumplio =
    today.month > nacimiento.month ||
    (today.month === nacimiento.month && today.day >= nacimiento.day);
  if (!yaCumplio) edad -= 1;
  return edad >= 0 ? edad : null;
}

const MESES_ES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

/** Formatea un cumpleaños como "7 de octubre" (ignora el año). */
export function formatCumpleanos(nacimiento: MonthDay): string {
  const mes = MESES_ES[nacimiento.month - 1];
  if (!mes) return '—';
  return `${nacimiento.day} de ${mes}`;
}
