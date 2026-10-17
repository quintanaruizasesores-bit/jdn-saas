import {
  COMISION_RATE,
  PERIODICIDAD_LEGACY_CONFIRMADA,
  type ComisionDashboard,
  type ComisionMensual,
  type HistorialComision,
  type PolizaComision,
} from './comision-modelo';
import type { PrimaPeriodicidad } from '@/types/database';

export { COMISION_RATE } from './comision-modelo';
export type {
  ComisionDashboard,
  ComisionMensual,
  HistorialComision,
  PolizaComision,
} from './comision-modelo';

/** null: importe/periodicidad sin confirmar; UNICA no aporta al stock recurrente. */
export function mensualizarPrima(
  importe: number | string | null,
  periodicidad?: PrimaPeriodicidad | null
): number | null {
  if (importe === null || importe === '' || !periodicidad) return null;
  const valor = Number(importe);
  if (!Number.isFinite(valor) || valor <= 0) return null;
  const meses: Record<PrimaPeriodicidad, number> = {
    MENSUAL: 1,
    BIMESTRAL: 2,
    TRIMESTRAL: 3,
    CUATRIMESTRAL: 4,
    SEMESTRAL: 6,
    ANUAL: 12,
    UNICA: Infinity,
  };
  return periodicidad in meses ? valor / meses[periodicidad] : null;
}

export function periodoComision(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Argentina/Cordoba',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)!.value;
  const hoy = `${part('year')}-${part('month')}-${part('day')}`;
  const mesActual = hoy.slice(0, 7);
  const desde = new Date(
    Date.UTC(Number(part('year')), Number(part('month')) - 12, 1)
  )
    .toISOString()
    .slice(0, 10);
  return { desde, hoy, mesActual };
}

function esFecha(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(`${value}T12:00:00Z`)) &&
    new Date(`${value}T12:00:00Z`).toISOString().slice(0, 10) === value
  );
}

type Version = { datos: PolizaComision; desde: string; orden: string };

/** Los diffs legacy no permiten reconstruir versiones financieras completas. */
function version(
  datos: Record<string, unknown> | PolizaComision | null,
  orden: string
): Version | null {
  if (!datos || !esFecha(datos.comision_desde)) return null;
  if (!['VIGENTE', 'BAJA', 'HISTORICA'].includes(String(datos.estado)))
    return null;
  if (
    [
      'fecha_inicio',
      'fecha_fin',
      'prima',
      'prima_periodicidad',
      'fecha_baja',
    ].some((key) => !(key in datos))
  )
    return null;
  return {
    datos: datos as unknown as PolizaComision,
    desde: datos.comision_desde,
    orden,
  };
}

function aporte(datos: PolizaComision, corte: string): number | null {
  if (datos.fecha_baja && !esFecha(datos.fecha_baja)) return null;
  if (datos.fecha_baja && corte >= datos.fecha_baja) return 0;
  // Un estado inactivo observado en una versión acreditada no aporta desde ella.
  if (datos.estado !== 'VIGENTE') return 0;
  if (datos.fechasVerificadas === false) return null;
  if (!esFecha(datos.fecha_inicio)) return null;
  if (datos.fecha_inicio > corte) return 0;
  if (datos.fecha_fin && !esFecha(datos.fecha_fin)) return null;
  if (datos.fecha_fin && datos.fecha_fin < datos.fecha_inicio) return null;
  if (datos.fecha_fin && corte > datos.fecha_fin) return 0; // fin de vigencia inclusivo
  const mensual = mensualizarPrima(datos.prima, datos.prima_periodicidad);
  return mensual === null ? null : mensual * COMISION_RATE;
}

/**
 * Stock al cierre del mes; hoy para el mes en curso. Sin prorrateo, cobros ni
 * proyecciones. Una versión por id evita duplicar renovaciones en la misma fila.
 * Los cortes sin cobertura completa son null, nunca falsos ceros o subtotales.
 */
export function calcularComisionMensual(
  polizas: readonly PolizaComision[],
  now = new Date(),
  historial: readonly HistorialComision[] = []
): ComisionDashboard {
  const { desde, hoy, mesActual } = periodoComision(now);
  const versiones = new Map<string, Version[]>();
  const add = (id: string, item: Version | null) => {
    if (!item) return;
    const list = versiones.get(id) ?? [];
    list.push(item);
    versiones.set(id, list);
  };
  for (const event of historial) {
    if (!event.completo || Date.parse(event.created_at) > now.getTime())
      continue;
    const orden = `${Date.parse(event.created_at).toString().padStart(16, '0')}:${String(event.version_orden ?? 0).padStart(20, '0')}`;
    add(
      event.poliza_id,
      version(event.datos_anteriores, `${orden}:0:${event.id}`)
    );
    add(event.poliza_id, version(event.datos_nuevos, `${orden}:1:${event.id}`));
  }
  for (const poliza of polizas) {
    // Compatibilidad sin migración: sólo se conoce la foto actual, no el pasado.
    const actual: PolizaComision = {
      ...poliza,
      prima_periodicidad:
        'prima_periodicidad' in poliza
          ? poliza.prima_periodicidad
          : PERIODICIDAD_LEGACY_CONFIRMADA,
      fecha_baja: poliza.fecha_baja ?? null,
      comision_desde: poliza.comision_desde ?? hoy,
      fechasVerificadas: !(
        poliza.legacy_id != null &&
        poliza.fecha_fin &&
        !poliza.comision_desde
      ),
    };
    add(
      poliza.id,
      version(
        actual,
        `${Date.parse(poliza.updated_at ?? now.toISOString())
          .toString()
          .padStart(16, '0')}:${'9'.repeat(20)}:2`
      )
    );
  }
  for (const list of versiones.values())
    list.sort(
      (a, b) => a.desde.localeCompare(b.desde) || a.orden.localeCompare(b.orden)
    );

  const serie: ComisionMensual[] = [];
  const cursor = new Date(`${desde}T12:00:00Z`);
  for (let i = 0; i < 12; i++) {
    const mes = cursor.toISOString().slice(0, 7);
    const enCurso = mes === mesActual;
    const corte = enCurso
      ? hoy
      : new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 0))
          .toISOString()
          .slice(0, 10);
    let comisionConocida = 0;
    let cantidad = 0;
    let sinDatos = 0;
    for (const poliza of polizas) {
      const list = versiones.get(poliza.id) ?? [];
      const vigente = list.findLast((v) => v.desde <= corte);
      let valor: number | null = null;
      if (vigente) valor = aporte(vigente.datos, corte);
      else if (
        list[0] &&
        esFecha(list[0].datos.fecha_inicio) &&
        list[0].desde <= list[0].datos.fecha_inicio &&
        corte < list[0].datos.fecha_inicio
      )
        valor = 0;
      if (valor === null) sinDatos++;
      else {
        comisionConocida += valor;
        if (valor > 0) cantidad++;
      }
    }
    const comision = sinDatos ? null : redondear(comisionConocida);
    const previo = serie.at(-1)?.comision;
    const variacion =
      comision !== null && previo != null ? redondear(comision - previo) : null;
    serie.push({
      mes,
      corte,
      enCurso,
      etiqueta: cursor.toLocaleDateString('es-AR', {
        month: 'short',
        year: '2-digit',
        timeZone: 'UTC',
      }),
      comision,
      comisionConocida: redondear(comisionConocida),
      polizas: cantidad,
      sinDatos,
      variacion,
      variacionPorcentual:
        variacion !== null && previo != null && previo > 0
          ? (variacion / previo) * 100
          : null,
    });
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  const actual = serie[serie.length - 1];
  return {
    serie,
    totalPolizas: polizas.length,
    resumen: {
      comisionActual: actual.comision,
      variacion: actual.variacion,
      variacionPorcentual: actual.variacionPorcentual,
      polizas: actual.polizas,
      sinDatos: actual.sinDatos,
      anualizada:
        actual.comision === null ? null : redondear(actual.comision * 12),
    },
  };
}

function redondear(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function formatVariacion(valor: number | null): string {
  if (valor === null) return 'Sin comparación';
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
    signDisplay: 'exceptZero',
  }).format(valor);
}
