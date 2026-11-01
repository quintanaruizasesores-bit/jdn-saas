import { APP_TIMEZONE, getTodayInTimezone } from '@/lib/cumpleanos/fechas';

function isoDate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function getTaskAlertWindow(now: Date = new Date()) {
  const today = getTodayInTimezone(APP_TIMEZONE, now);
  const lastDay = new Date(
    Date.UTC(today.year, today.month - 1, today.day + 7)
  );

  return {
    today: isoDate(today.year, today.month, today.day),
    through: isoDate(
      lastDay.getUTCFullYear(),
      lastDay.getUTCMonth() + 1,
      lastDay.getUTCDate()
    ),
  };
}

export function taskDueLabel(date: string, today: string): string {
  if (date < today) return `Vencida · ${dateLabel(date)}`;
  if (date === today) return 'Vence hoy';
  return `Vence el ${dateLabel(date)}`;
}

function dateLabel(date: string): string {
  const [year, month, day] = date.split('-').map(Number);
  return new Intl.DateTimeFormat('es-AR', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, day)));
}
