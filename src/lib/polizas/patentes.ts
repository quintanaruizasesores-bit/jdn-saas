/** Patentes argentinas completas: formato anterior ABC123 y Mercosur AB123CD. */
const PATENTE_BUSCADA = /^(?:[A-Z]{3}\d{3}|[A-Z]{2}\d{3}[A-Z]{2})$/;
const PATENTES_EN_DETALLE =
  /(?:^|[^A-Z0-9])(?:([A-Z]{3})[\s.-]*(\d{3})|([A-Z]{2})[\s.-]*(\d{3})[\s.-]*([A-Z]{2}))(?=$|[^A-Z0-9])/gi;

export function patenteBuscada(texto: string): string | null {
  const normalizada = texto.toUpperCase().replace(/[\s.-]/g, '');
  return PATENTE_BUSCADA.test(normalizada) ? normalizada : null;
}

export function patentesEnDetalle(detalle: string | null): string[] {
  if (!detalle) return [];
  return Array.from(
    detalle.matchAll(PATENTES_EN_DETALLE),
    (match) =>
      (match[1] ?? match[3]) + (match[2] ?? match[4]) + (match[5] ?? '')
  ).map((patente) => patente.toUpperCase());
}

export function distanciaPatente(a: string, b: string): number {
  if (a.length !== b.length) return Infinity;
  let diferencias = 0;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) diferencias++;
  }
  return diferencias;
}

/** Fragmentos que permiten encontrar la patente con separadores en detalle. */
export function fragmentosPatente(patente: string): [string, string] {
  return patente.length === 6
    ? [patente.slice(0, 3), patente.slice(3)]
    : [patente.slice(0, 2), patente.slice(2, 5)];
}
