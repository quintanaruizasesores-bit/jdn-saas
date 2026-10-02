/**
 * Lógica pura para construir los filtros de búsqueda de clientes que se envían
 * a Supabase/PostgREST. Se mantiene separada del servicio para poder testearla
 * sin red ni cliente de Supabase.
 *
 * La búsqueda es server-side: cada token del término se aplica como un grupo
 * `.or(...)` sobre las columnas buscables. Al encadenar varios `.or()` en la
 * query, PostgREST los combina con AND entre grupos, lo que da semántica
 * "todos los tokens deben matchear en alguna columna" (ej. "juan perez" →
 * nombre/apellido). Dentro de cada grupo las columnas se combinan con OR.
 */

/** Columnas de `clientes` sobre las que se busca con ILIKE. */
export const CLIENTE_SEARCH_COLUMNS = [
  'nombre',
  'apellido',
  'dni',
  'email',
  'telefono',
] as const;

/** Máximo de tokens considerados (evita queries absurdas con términos larguísimos). */
const MAX_TOKENS = 6;
/** Longitud máxima del término ya saneado. */
const MAX_TERM_LENGTH = 100;

/**
 * Quita los caracteres que romperían la sintaxis de `.or()` de PostgREST
 * (comas y paréntesis delimitan condiciones/grupos) y normaliza los espacios.
 * No usamos concatenación de SQL cruda: esto alimenta al query builder de
 * supabase-js, que escapa los valores; esta limpieza es defensa adicional
 * contra inyección en la gramática del filtro.
 */
export function sanitizeSearchTerm(term: string): string {
  return term
    .replace(/[,()\\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_TERM_LENGTH);
}

/**
 * Construye la lista de filtros `.or()` para un término de búsqueda.
 * Devuelve un string por token; el servicio encadena un `.or()` por cada uno
 * (AND entre tokens). Un término vacío o sólo-puntuación devuelve `[]`.
 *
 * - Case-insensitive y parcial vía `ilike.%token%`.
 * - Teléfono tolerante a espacios/guiones: si el token tiene separadores entre
 *   dígitos, se agrega una variante sólo-dígitos sobre `telefono`.
 */
export function buildClienteSearchFilters(term: string): string[] {
  const clean = sanitizeSearchTerm(term);
  if (!clean) return [];

  const tokens = clean.split(' ').slice(0, MAX_TOKENS);

  return tokens.map((token) => {
    const conds = CLIENTE_SEARCH_COLUMNS.map((col) => `${col}.ilike.%${token}%`);

    // Variante de teléfono sin separadores: "351 555" / "351-555" → "351555".
    const digits = token.replace(/\D/g, '');
    if (digits && digits !== token) {
      conds.push(`telefono.ilike.%${digits}%`);
    }

    return conds.join(',');
  });
}
