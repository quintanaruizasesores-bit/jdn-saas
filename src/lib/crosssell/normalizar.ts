/**
 * Normalización de ramos (texto libre) a categorías de cobertura.
 *
 * Los ramos del sistema son texto libre por workspace, sin categoría. Para que
 * el motor de venta cruzada razone sobre coberturas, cada ramo se asocia a una
 * categoría normalizada. Esta heurística solo **sugiere**: el usuario confirma
 * el mapeo en la interfaz. Un ramo sin categoría no genera oportunidades (se
 * evitan falsos positivos).
 */

/** Quita acentos y pasa a minúsculas para comparar sin ruido. */
export function normalizarTexto(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

export interface CategoriaSugerida {
  slug: string;
  nombre: string;
  descripcion: string;
  /** Palabras clave (ya normalizadas) para sugerir el mapeo de un ramo. */
  keywords: string[];
}

/**
 * Catálogo de categorías sugeridas. Es solo una semilla editable: el usuario
 * puede renombrar, desactivar o crear categorías propias. El orden define la
 * prioridad de coincidencia (la primera que matchea gana).
 */
export const CATEGORIAS_SUGERIDAS: CategoriaSugerida[] = [
  {
    slug: 'automotor',
    nombre: 'Automotor',
    descripcion: 'Vehículos: autos, pickups, flotas.',
    keywords: ['automotor', 'automotores', 'auto', 'vehiculo', 'rodado', 'flota'],
  },
  {
    slug: 'motovehiculo',
    nombre: 'Motovehículo',
    descripcion: 'Motos y ciclomotores.',
    keywords: ['motovehiculo', 'moto', 'ciclomotor', 'scooter'],
  },
  {
    slug: 'hogar',
    nombre: 'Hogar',
    descripcion: 'Vivienda, combinado familiar, incendio de inmueble.',
    keywords: ['hogar', 'combinado familiar', 'vivienda', 'propietario', 'inquilino'],
  },
  {
    slug: 'comercio',
    nombre: 'Comercio',
    descripcion: 'Comercios, pymes, integral de comercio.',
    keywords: ['comercio', 'integral de comercio', 'pyme', 'negocio', 'local'],
  },
  {
    slug: 'vida',
    nombre: 'Vida',
    descripcion: 'Seguros de vida individual y colectivo.',
    keywords: ['seguro de vida', 'vida'],
  },
  {
    slug: 'accidentes_personales',
    nombre: 'Accidentes personales',
    descripcion: 'Cobertura de accidentes personales (AP).',
    keywords: ['accidentes personales', 'accidente personal', 'ap'],
  },
  {
    slug: 'salud',
    nombre: 'Salud',
    descripcion: 'Salud y asistencia médica.',
    keywords: ['salud', 'asistencia medica', 'prepaga', 'medico'],
  },
  {
    slug: 'sepelio',
    nombre: 'Sepelio',
    descripcion: 'Servicios de sepelio.',
    keywords: ['sepelio', 'servicio funebre'],
  },
  {
    slug: 'art',
    nombre: 'ART',
    descripcion: 'Riesgos del trabajo.',
    keywords: ['riesgos del trabajo', 'riesgo del trabajo', 'art'],
  },
  {
    slug: 'caucion',
    nombre: 'Caución',
    descripcion: 'Seguros de caución / garantía.',
    keywords: ['caucion', 'garantia'],
  },
  {
    slug: 'responsabilidad_civil',
    nombre: 'Responsabilidad civil',
    descripcion: 'Responsabilidad civil general.',
    keywords: ['responsabilidad civil', 'rc'],
  },
  {
    slug: 'tecnico',
    nombre: 'Seguros técnicos',
    descripcion: 'Todo riesgo operativo, maquinaria, equipos.',
    keywords: ['todo riesgo operativo', 'maquinaria', 'equipo electronico', 'tecnico'],
  },
  {
    slug: 'agro',
    nombre: 'Agro',
    descripcion: 'Seguros agrícolas y granizo.',
    keywords: ['granizo', 'agricola', 'agro', 'campo'],
  },
];

/**
 * Keywords ambiguas y cortas que solo valen como palabra completa, para no
 * matchear dentro de otra palabra (p. ej. "cap" no debe disparar "ap").
 */
const KEYWORDS_PALABRA_COMPLETA = new Set(['ap', 'rc', 'art']);

/**
 * Sugiere el slug de categoría para un ramo según sus palabras. Devuelve `null`
 * si ninguna categoría coincide (el ramo queda sin mapear y no genera
 * oportunidades hasta que el usuario lo asigne).
 */
export function sugerirCategoriaSlug(
  ramoNombre: string,
  categorias: CategoriaSugerida[] = CATEGORIAS_SUGERIDAS
): string | null {
  const texto = normalizarTexto(ramoNombre);
  if (!texto) return null;
  const padded = ` ${texto} `;
  for (const cat of categorias) {
    for (const kw of cat.keywords) {
      const ok = KEYWORDS_PALABRA_COMPLETA.has(kw)
        ? padded.includes(` ${kw} `)
        : texto.includes(kw);
      if (ok) return cat.slug;
    }
  }
  return null;
}
