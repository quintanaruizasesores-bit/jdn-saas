export function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return (
    !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value
  );
}

export function displayDate(value: string | null | undefined): string {
  if (!value || !isIsoDate(value)) return value ?? '';
  const [year, month, day] = value.split('-');
  return `${day}/${month}/${year}`;
}

export function parseDisplayDate(value: string): string {
  if (isIsoDate(value)) return value;
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  if (!match) return value;
  const iso = `${match[3]}-${match[2]}-${match[1]}`;
  return isIsoDate(iso) ? iso : value;
}
