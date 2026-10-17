export const PROVINCIAS = [
  ['02', 'CABA'],
  ['06', 'Buenos Aires'],
  ['10', 'Catamarca'],
  ['14', 'Córdoba'],
  ['18', 'Corrientes'],
  ['22', 'Chaco'],
  ['26', 'Chubut'],
  ['30', 'Entre Ríos'],
  ['34', 'Formosa'],
  ['38', 'Jujuy'],
  ['42', 'La Pampa'],
  ['46', 'La Rioja'],
  ['50', 'Mendoza'],
  ['54', 'Misiones'],
  ['58', 'Neuquén'],
  ['62', 'Río Negro'],
  ['66', 'Salta'],
  ['70', 'San Juan'],
  ['74', 'San Luis'],
  ['78', 'Santa Cruz'],
  ['82', 'Santa Fe'],
  ['86', 'Santiago del Estero'],
  ['90', 'Tucumán'],
  ['94', 'Tierra del Fuego'],
] as const;
export const SIN_UBICACION = 'sin-ubicacion';
export const EXTERIOR = 'exterior';
export const nombreProvincia = (id: string) =>
  PROVINCIAS.find((p) => p[0] === id)?.[1] ??
  (id === EXTERIOR ? 'Exterior explícito' : 'Sin ubicación determinada');
export const normalizarTexto = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
const aliases: Record<string, string> = {
  cba: '14',
  caba: '02',
  'capital federal': '02',
  'ciudad autonoma de buenos aires': '02',
  'ciudad de buenos aires': '02',
  'bs as': '06',
  'buenos aires provincia': '06',
  'pcia buenos aires': '06',
  'stgo del estero': '86',
  'sgo del estero': '86',
  'tierra del fuego antartida e islas del atlantico sur': '94',
};
/** Alias explícitos, sin geocodificar ni alterar domicilios originales. */
export function normalizarProvincia(
  original: string | null | undefined
): string {
  const valor = normalizarTexto(original ?? '').replace(
    /^provincia (de |del )?/,
    ''
  );
  const provincia = PROVINCIAS.find(
    ([id, nombre]) => id === valor || normalizarTexto(nombre) === valor
  );
  if (provincia) return provincia[0];
  if (aliases[valor]) return aliases[valor];
  if (
    /^(exterior|extranjero|uruguay|chile|brasil|paraguay|bolivia|peru|espana|estados unidos)( |$)/.test(
      valor
    )
  )
    return EXTERIOR;
  return SIN_UBICACION;
}
