import {
  aporteComision,
  construirVersionesComision,
  mensualizarPrima,
  periodoComision,
  type HistorialComision,
  type PolizaComision,
} from './comision';

export type PolizaClienteTop = PolizaComision & {
  cliente_id: string;
  cliente?: {
    id: string;
    nombre: string | null;
    apellido: string | null;
    deleted_at?: string | null;
  } | null;
};

export interface ClienteTop {
  cliente_id: string;
  cliente_nombre: string;
  total_polizas: number;
  prima_total: number;
  comision_aproximada: number;
}

/** Ranking del premio mensual vigente, usando sólo versiones financieras válidas. */
export function calcularClientesTop(
  polizas: readonly PolizaClienteTop[],
  historial: readonly HistorialComision[],
  now = new Date(),
  limite = 10
): ClienteTop[] {
  const corte = periodoComision(now).hoy;
  const versiones = construirVersionesComision(polizas, now, historial);
  const grupos = new Map<string, ClienteTop>();
  const clientesIncompletos = new Set<string>();

  const puedeAportarAlCorte = (poliza: PolizaComision) =>
    poliza.estado === 'VIGENTE' &&
    (!poliza.fecha_inicio || poliza.fecha_inicio <= corte) &&
    (!poliza.fecha_baja || poliza.fecha_baja > corte) &&
    (poliza.fechasVerificadas === false ||
      !poliza.fecha_fin ||
      poliza.fecha_fin >= corte);

  for (const poliza of polizas) {
    const cliente = poliza.cliente;
    if (!cliente || cliente.deleted_at) continue;
    const version = (versiones.get(poliza.id) ?? []).findLast(
      (item) => item.desde <= corte
    )?.datos;
    if (!version) {
      if (puedeAportarAlCorte(poliza)) clientesIncompletos.add(cliente.id);
      continue;
    }
    const comision = aporteComision(version, corte);
    const premio = mensualizarPrima(version.prima, version.prima_periodicidad);
    if (
      typeof comision !== 'number' ||
      premio === null ||
      comision <= 0 ||
      premio <= 0
    ) {
      if (
        puedeAportarAlCorte(version) &&
        (typeof comision !== 'number' || premio === null)
      )
        clientesIncompletos.add(cliente.id);
      continue;
    }

    const nombre = `${cliente.nombre ?? ''} ${cliente.apellido ?? ''}`.trim();
    const actual = grupos.get(cliente.id) ?? {
      cliente_id: cliente.id,
      cliente_nombre: nombre || 'Cliente sin nombre',
      total_polizas: 0,
      prima_total: 0,
      comision_aproximada: 0,
    };
    actual.total_polizas++;
    actual.prima_total += premio;
    actual.comision_aproximada += comision;
    grupos.set(cliente.id, actual);
  }

  return [...grupos.values()]
    .filter((cliente) => !clientesIncompletos.has(cliente.cliente_id))
    .map((cliente) => ({
      ...cliente,
      prima_total: redondear(cliente.prima_total),
      comision_aproximada: redondear(cliente.comision_aproximada),
    }))
    .sort(
      (a, b) =>
        b.prima_total - a.prima_total ||
        b.comision_aproximada - a.comision_aproximada ||
        a.cliente_nombre.localeCompare(b.cliente_nombre, 'es')
    )
    .slice(0, Math.max(0, limite));
}

function redondear(valor: number) {
  return Math.round((valor + Number.EPSILON) * 100) / 100;
}
