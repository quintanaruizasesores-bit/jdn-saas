/**
 * Lógica pura para la fecha de nacimiento de clientes, que en la UI se carga
 * como texto con formato `dd/mm/aaaa` (más cómodo que el calendario nativo para
 * fechas viejas) pero se guarda como `DATE` ISO (`yyyy-mm-dd`) en Postgres.
 *
 * Se mantiene separada del formulario para poder testearla sin React ni red,
 * igual que `lib/clientes/search.ts`.
 */

/** Año mínimo aceptado para una fecha de nacimiento. */
export const MIN_YEAR = 1920;

/**
 * Formatea lo tipeado por el usuario como máscara `dd/mm/aaaa`: deja solo
 * dígitos (máximo 8) e inserta las barras a medida que se escribe.
 */
export function maskFechaInput(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  const parts = [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4, 8)];
  return parts.filter((p) => p.length > 0).join('/');
}

/** `'yyyy-mm-dd'` → `'dd/mm/aaaa'`. Devuelve `''` si viene vacío o malformado. */
export function isoToDisplay(iso: string | null | undefined): string {
  if (!iso) return '';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return '';
  const [, yyyy, mm, dd] = m;
  return `${dd}/${mm}/${yyyy}`;
}

/** `'dd/mm/aaaa'` → `'yyyy-mm-dd'`. Devuelve `null` si viene vacío. */
export function displayToIso(input: string | null | undefined): string | null {
  if (!input) return null;
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(input.trim());
  if (!m) return null;
  const [, dd, mm, yyyy] = m;
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Valida un término `dd/mm/aaaa`. Devuelve un mensaje de error (string) o `null`
 * si la fecha es válida. Un valor vacío se considera válido (campo opcional).
 *
 * Reglas: formato exacto `dd/mm/aaaa`; fecha de calendario real (rechaza, p. ej.,
 * `31/02/2000`); año entre MIN_YEAR y el año actual; no futura.
 */
export function validateFechaNacimiento(input: string): string | null {
  const value = (input ?? '').trim();
  if (!value) return null;

  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  if (!m) return 'Fecha inválida (usá dd/mm/aaaa)';

  const dd = Number(m[1]);
  const mm = Number(m[2]);
  const yyyy = Number(m[3]);

  // Fecha de calendario real: reconstruimos y comparamos componentes.
  const date = new Date(yyyy, mm - 1, dd);
  if (
    date.getFullYear() !== yyyy ||
    date.getMonth() !== mm - 1 ||
    date.getDate() !== dd
  ) {
    return 'Fecha inexistente';
  }

  if (yyyy < MIN_YEAR) return `El año debe ser ${MIN_YEAR} o posterior`;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (date.getTime() > today.getTime()) return 'La fecha no puede ser futura';

  return null;
}
