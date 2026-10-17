import {
  COMISION_RATE,
  PERIODICIDAD_LEGACY_CONFIRMADA,
  type ComisionDashboard,
  type ComisionPendiente,
  type MotivoComisionPendiente,
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

export type VersionComision = {
  datos: PolizaComision;
  desde: string;
  orden: string;
};
type Version = VersionComision;

/** Los diffs legacy no permiten reconstruir versiones financieras completas. */
function version(
  datos: Record<string, unknown> | PolizaComision | null,
  orden: string,
  observadoDesde?: string
): Version | null {
  if (!datos) return null;
  const desde = datos.comision_desde ?? observadoDesde;
  if (!esFecha(desde)) return null;
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
    datos: {
      ...datos,
      comision_desde: desde,
      fechasVerificadas:
        datos.fechasVerificadas ??
        !(datos.legacy_id != null && datos.fecha_fin && !datos.comision_desde),
    } as unknown as PolizaComision,
    desde,
    orden,
  };
}

export function aporteComision(
  datos: PolizaComision,
  corte: string
): number | MotivoComisionPendiente {
  if (datos.fecha_baja && !esFecha(datos.fecha_baja)) return 'FECHAS';
  if (datos.fecha_baja && corte >= datos.fecha_baja) return 0;
  // Un estado inactivo observado en una versión acreditada no aporta desde ella.
  if (datos.estado !== 'VIGENTE') return 0;
  // La versión VIGENTE acredita el aporte desde que fue observada, aunque falte
  // el inicio contractual. No acredita períodos anteriores a esa observación.
  if (datos.fecha_inicio && !esFecha(datos.fecha_inicio)) return 'FECHAS';
  if (esFecha(datos.fecha_inicio) && datos.fecha_inicio > corte) return 0;
  const finAmbiguo = datos.fechasVerificadas === false;
  if (!finAmbiguo && datos.fecha_fin) {
    if (!esFecha(datos.fecha_fin)) return 'FECHAS';
    if (datos.fecha_inicio && datos.fecha_fin < datos.fecha_inicio)
      return 'FECHAS';
    if (corte > datos.fecha_fin) return 0; // fin de vigencia inclusivo
  }
  const mensual = mensualizarPrima(datos.prima, datos.prima_periodicidad);
  if (mensual === null) {
    return mensualizarPrima(datos.prima, 'MENSUAL') === null
      ? 'PREMIO'
      : 'PERIODICIDAD';
  }
  return mensual * COMISION_RATE;
}

/**
 * Stock al cierre del mes; hoy para el mes en curso. Sin prorrateo, cobros ni
 * proyecciones. Una versión por id evita duplicar renovaciones en la misma fila.
 * El mes actual suma los importes cargados; los faltantes se informan aparte.
 * Los meses cerrados sin cobertura histórica suficiente siguen siendo null.
 */
export function calcularComisionMensual(
  polizas: readonly PolizaComision[],
  now = new Date(),
  historial: readonly HistorialComision[] = []
): ComisionDashboard {
  const { desde, hoy, mesActual } = periodoComision(now);
  const versiones = construirVersionesComision(polizas, now, historial);
  const serie: ComisionMensual[] = [];
  const pendientes: ComisionPendiente[] = [];
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
    let sinHistorial = 0;
    for (const poliza of polizas) {
      const list = versiones.get(poliza.id) ?? [];
      const vigente = list.findLast((v) => v.desde <= corte);
      let valor: number | MotivoComisionPendiente = 'VERSION';
      if (vigente) valor = aporteComision(vigente.datos, corte);
      else if (
        list[0] &&
        esFecha(list[0].datos.fecha_inicio) &&
        list[0].desde <= list[0].datos.fecha_inicio &&
        corte < list[0].datos.fecha_inicio
      )
        valor = 0;
      else sinHistorial++;
      if (typeof valor !== 'number') {
        sinDatos++;
        if (enCurso) pendientes.push({ polizaId: poliza.id, motivo: valor });
      } else {
        comisionConocida += valor;
        if (valor > 0) cantidad++;
      }
    }
    const comision =
      !enCurso && sinHistorial ? null : redondear(comisionConocida);
    const puntoPrevio = serie.at(-1);
    const previo = puntoPrevio?.comision;
    const variacion =
      !sinDatos && !puntoPrevio?.sinDatos && comision !== null && previo != null
        ? redondear(comision - previo)
        : null;
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
      sinHistorial,
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
    pendientes,
    totalPolizas: polizas.length,
    resumen: {
      comisionActual: actual.comision,
      variacion: actual.variacion,
      variacionPorcentual: actual.variacionPorcentual,
      polizas: actual.polizas,
      sinDatos: actual.sinDatos,
      anualizada:
        actual.sinDatos || actual.comision === null
          ? null
          : redondear(actual.comision * 12),
    },
  };
}

/** Índice compartido con Reportes; conserva las reglas financieras del dashboard. */
export function construirVersionesComision(
  polizas: readonly PolizaComision[],
  now = new Date(),
  historial: readonly HistorialComision[] = []
) {
  const { hoy } = periodoComision(now);
  const versiones = new Map<string, Version[]>();
  const add = (id: string, item: Version | null) => {
    if (!item) return;
    const list = versiones.get(id) ?? [];
    list.push(item);
    versiones.set(id, list);
  };
  for (const event of historial) {
    if (
      !event.completo ||
      !Number.isFinite(Date.parse(event.created_at)) ||
      Date.parse(event.created_at) > now.getTime()
    )
      continue;
    const orden = `${Date.parse(event.created_at).toString().padStart(16, '0')}:${String(event.version_orden ?? 0).padStart(20, '0')}`;
    add(
      event.poliza_id,
      version(event.datos_anteriores, `${orden}:0:${event.id}`)
    );
    // La foto completa de 007 acredita el estado observado desde su registro,
    // aunque no tenga fecha contractual de inicio o fecha de efecto anterior.
    add(
      event.poliza_id,
      version(
        event.datos_nuevos,
        `${orden}:1:${event.id}`,
        !event.fecha_efecto && !event.datos_nuevos?.comision_desde
          ? periodoComision(new Date(event.created_at)).hoy
          : undefined
      )
    );
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

  return versiones;
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
