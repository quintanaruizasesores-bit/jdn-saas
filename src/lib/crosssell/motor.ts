/**
 * Motor puro de detección de oportunidades de venta cruzada. No hace I/O: recibe
 * la cartera ya cargada y las reglas/mapeos, y devuelve las oportunidades
 * potenciales. Sin efectos secundarios → totalmente testeable.
 *
 * Criterio de cobertura "vigente": una póliza aporta su categoría cuando está en
 * estado VIGENTE y, si tiene fecha de fin válida, no está vencida al corte. La
 * ausencia de una categoría en nuestra cartera es una oportunidad **potencial**,
 * nunca una afirmación de que el cliente no la tenga en otra aseguradora.
 */

import type { CrossSellMotivo, CrossSellModo } from '@/types/database';

export interface MotorCliente {
  id: string;
  nombre: string;
  apellido: string;
  provincia: string | null;
  email: string | null;
  deleted_at: string | null;
}

export interface MotorPoliza {
  id: string;
  cliente_id: string;
  ramo_id: string | null;
  compania_nombre: string | null;
  ramo_nombre: string | null;
  estado: string;
  fecha_fin: string | null;
  prima: number;
}

export interface MotorCategoria {
  id: string;
  slug: string;
  nombre: string;
  activa: boolean;
}

export interface MotorRegla {
  id: string;
  nombre: string;
  activa: boolean;
  prioridad: number;
  categorias_requeridas: string[];
  modo: CrossSellModo;
  categoria_objetivo_id: string;
  condiciones: {
    min_polizas?: number;
    prima_minima?: number;
    provincia?: string;
    excluir_alta_siniestralidad?: boolean;
  };
}

export interface MotorExclusion {
  cliente_id: string;
  /** null = excluir de todas las categorías. */
  categoria_id: string | null;
}

export interface MotorEntrada {
  clientes: MotorCliente[];
  polizas: MotorPoliza[];
  /** ramo_id -> categoria_id (solo ramos mapeados). */
  ramoMap: Map<string, string>;
  categorias: MotorCategoria[];
  reglas: MotorRegla[];
  exclusiones: MotorExclusion[];
  /** cliente_id -> cantidad de siniestros (para condiciones de siniestralidad). */
  siniestrosPorCliente?: Map<string, number>;
  /** Corte temporal `yyyy-mm-dd` (hoy por defecto en el servicio). */
  hoy: string;
  /** Umbral de "alta siniestralidad" (cantidad de siniestros). */
  umbralSiniestralidad?: number;
}

export interface OportunidadDetectada {
  cliente_id: string;
  categoria_objetivo_id: string;
  regla_id: string;
  prioridad_score: number;
  motivo: CrossSellMotivo;
}

const fechaValida = (s: string | null): s is string =>
  !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);

/** Cobertura "vigente" de una póliza al corte. */
function polizaVigente(p: MotorPoliza, hoy: string): boolean {
  if (p.estado !== 'VIGENTE') return false;
  // Si la fecha de fin es válida y anterior a hoy, está vencida.
  if (fechaValida(p.fecha_fin) && p.fecha_fin < hoy) return false;
  return true;
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

/**
 * Score de prioridad 0–100. Parte de la prioridad de la regla y suma señales de
 * valor/engagement del cliente: cantidad de pólizas vigentes, prima agregada y
 * disponibilidad de email para contactarlo.
 */
export function calcularScore(opts: {
  prioridadRegla: number;
  polizasVigentes: number;
  primaTotal: number;
  tieneEmail: boolean;
}): number {
  const porPolizas = clamp((opts.polizasVigentes - 1) * 5, 0, 20);
  const porPrima = opts.primaTotal >= 50000 ? 10 : opts.primaTotal >= 15000 ? 5 : 0;
  const porEmail = opts.tieneEmail ? 5 : 0;
  return clamp(
    Math.round(opts.prioridadRegla + porPolizas + porPrima + porEmail),
    0,
    100
  );
}

/**
 * Categorías de cobertura vigentes por cliente (según el mapeo de ramos). Útil
 * para el servicio al cerrar oportunidades ya convertidas.
 */
export function coberturasVigentesPorCliente(
  polizas: MotorPoliza[],
  ramoMap: Map<string, string>,
  hoy: string
): Map<string, Set<string>> {
  const out = new Map<string, Set<string>>();
  for (const p of polizas) {
    if (!polizaVigente(p, hoy)) continue;
    const catId = p.ramo_id ? ramoMap.get(p.ramo_id) : undefined;
    if (!catId) continue;
    const set = out.get(p.cliente_id) ?? new Set<string>();
    set.add(catId);
    out.set(p.cliente_id, set);
  }
  return out;
}

export function detectarOportunidades(
  entrada: MotorEntrada
): OportunidadDetectada[] {
  const {
    clientes,
    polizas,
    ramoMap,
    categorias,
    reglas,
    exclusiones,
    hoy,
  } = entrada;
  const siniestros = entrada.siniestrosPorCliente ?? new Map();
  const umbralSin = entrada.umbralSiniestralidad ?? 3;

  const catById = new Map(categorias.map((c) => [c.id, c]));
  const catActiva = (id: string) => catById.get(id)?.activa ?? false;

  // Exclusiones: global (set de clientes) y por (cliente, categoría).
  const excluidoGlobal = new Set<string>();
  const excluidoCategoria = new Set<string>();
  for (const e of exclusiones) {
    if (e.categoria_id == null) excluidoGlobal.add(e.cliente_id);
    else excluidoCategoria.add(`${e.cliente_id}|${e.categoria_id}`);
  }

  // Estado de cartera por cliente: categorías vigentes + pólizas por categoría.
  interface CarteraCliente {
    categorias: Set<string>;
    polizasVigentes: number;
    primaTotal: number;
    porCategoria: Map<string, MotorPoliza[]>;
  }
  const cartera = new Map<string, CarteraCliente>();
  const getCartera = (cid: string): CarteraCliente => {
    let c = cartera.get(cid);
    if (!c) {
      c = {
        categorias: new Set(),
        polizasVigentes: 0,
        primaTotal: 0,
        porCategoria: new Map(),
      };
      cartera.set(cid, c);
    }
    return c;
  };

  for (const p of polizas) {
    if (!polizaVigente(p, hoy)) continue;
    const catId = p.ramo_id ? ramoMap.get(p.ramo_id) : undefined;
    const c = getCartera(p.cliente_id);
    c.polizasVigentes += 1;
    c.primaTotal += Number.isFinite(p.prima) ? p.prima : 0;
    if (catId && catActiva(catId)) {
      c.categorias.add(catId);
      const list = c.porCategoria.get(catId) ?? [];
      list.push(p);
      c.porCategoria.set(catId, list);
    }
  }

  const clientesActivos = clientes.filter((c) => !c.deleted_at);
  const reglasActivas = reglas.filter(
    (r) => r.activa && catActiva(r.categoria_objetivo_id)
  );

  // Dedupe por (cliente, categoría objetivo): se queda la de mayor score.
  const mejor = new Map<string, OportunidadDetectada>();

  for (const regla of reglasActivas) {
    const requeridas = regla.categorias_requeridas.filter((id) => catActiva(id));
    if (requeridas.length === 0) continue; // regla sin disparador útil
    const objetivo = catById.get(regla.categoria_objetivo_id);
    if (!objetivo) continue;

    for (const cliente of clientesActivos) {
      if (excluidoGlobal.has(cliente.id)) continue;
      if (excluidoCategoria.has(`${cliente.id}|${regla.categoria_objetivo_id}`))
        continue;

      const c = cartera.get(cliente.id);
      const tiene = (id: string) => c?.categorias.has(id) ?? false;

      // Debe cumplir el requisito según el modo.
      const cumpleReq =
        regla.modo === 'ALL'
          ? requeridas.every(tiene)
          : requeridas.some(tiene);
      if (!cumpleReq) continue;

      // No debe tener ya la cobertura objetivo.
      if (tiene(regla.categoria_objetivo_id)) continue;

      // Condiciones adicionales.
      const cond = regla.condiciones ?? {};
      const polizasVigentes = c?.polizasVigentes ?? 0;
      const primaTotal = c?.primaTotal ?? 0;
      if (cond.min_polizas && polizasVigentes < cond.min_polizas) continue;
      if (cond.prima_minima && primaTotal < cond.prima_minima) continue;
      if (
        cond.provincia &&
        (cliente.provincia ?? '').trim().toLowerCase() !==
          cond.provincia.trim().toLowerCase()
      )
        continue;
      if (
        cond.excluir_alta_siniestralidad &&
        (siniestros.get(cliente.id) ?? 0) >= umbralSin
      )
        continue;

      const score = calcularScore({
        prioridadRegla: regla.prioridad,
        polizasVigentes,
        primaTotal,
        tieneEmail: !!cliente.email?.trim(),
      });

      // Motivo (explicabilidad): categorías actuales que dispararon + pólizas.
      const categoriasActuales = requeridas
        .filter(tiene)
        .map((id) => {
          const cat = catById.get(id)!;
          return { slug: cat.slug, nombre: cat.nombre };
        });
      const polizasRelacionadas = requeridas
        .flatMap((id) => c?.porCategoria.get(id) ?? [])
        .slice(0, 5)
        .map((p) => ({
          id: p.id,
          ramo: p.ramo_nombre ?? 'Sin ramo',
          compania: p.compania_nombre,
        }));
      const motivo: CrossSellMotivo = {
        regla_nombre: regla.nombre,
        categorias_actuales: categoriasActuales,
        categoria_objetivo: { slug: objetivo.slug, nombre: objetivo.nombre },
        polizas_relacionadas: polizasRelacionadas,
      };

      const key = `${cliente.id}|${regla.categoria_objetivo_id}`;
      const actual = mejor.get(key);
      if (!actual || score > actual.prioridad_score) {
        mejor.set(key, {
          cliente_id: cliente.id,
          categoria_objetivo_id: regla.categoria_objetivo_id,
          regla_id: regla.id,
          prioridad_score: score,
          motivo,
        });
      }
    }
  }

  return [...mejor.values()].sort(
    (a, b) => b.prioridad_score - a.prioridad_score
  );
}
