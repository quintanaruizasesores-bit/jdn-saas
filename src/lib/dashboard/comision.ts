/** Estimación del corredor sobre el premio; no representa comisiones cobradas. */
export const COMISION_RATE = 0.14;

export interface PolizaComision {
  fecha_inicio: string | null;
  prima: number | string | null;
}

export interface ComisionMensual {
  mes: string;
  etiqueta: string;
  comision: number;
  tendencia: number | null;
  polizas: number;
  enCurso: boolean;
}

/** Fechas de negocio independientes de la zona horaria del navegador. */
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

/**
 * Agrupa por inicio de vigencia, nunca por fecha de carga: importar una póliza
 * histórica no la convierte en producción nueva del mes de importación.
 * La tendencia es un promedio móvil de tres meses cerrados, sin proyecciones.
 */
export function calcularComisionMensual(
  polizas: readonly PolizaComision[],
  now = new Date()
): ComisionMensual[] {
  const { desde, hoy, mesActual } = periodoComision(now);
  const porMes = new Map<string, { premio: number; polizas: number }>();

  for (const poliza of polizas) {
    const fecha = poliza.fecha_inicio;
    if (!fecha || fecha < desde || fecha > hoy) continue;
    const mes = fecha.slice(0, 7);
    const total = porMes.get(mes) ?? { premio: 0, polizas: 0 };
    const premio = Number(poliza.prima ?? 0);
    total.premio += Number.isFinite(premio) ? premio : 0;
    total.polizas += 1;
    porMes.set(mes, total);
  }

  const primerMes = [...porMes.keys()].sort()[0];
  if (!primerMes) return [];

  const puntos: ComisionMensual[] = [];
  const [year, month] = primerMes.split('-').map(Number);
  const cursor = new Date(Date.UTC(year, month - 1, 1));

  // Comienza en el primer mes con datos, sin inventar ceros previos al histórico.
  // Los huecos posteriores sí se conservan para respetar los meses calendario.
  while (cursor.toISOString().slice(0, 7) <= mesActual) {
    const mes = cursor.toISOString().slice(0, 7);
    const total = porMes.get(mes);
    const comision = (total?.premio ?? 0) * COMISION_RATE;
    const enCurso = mes === mesActual;
    const index = puntos.length;
    puntos.push({
      mes,
      etiqueta: cursor.toLocaleDateString('es-AR', {
        month: 'short',
        year: '2-digit',
        timeZone: 'UTC',
      }),
      comision,
      tendencia:
        !enCurso && index >= 2
          ? (puntos[index - 2].comision +
              puntos[index - 1].comision +
              comision) /
            3
          : null,
      polizas: total?.polizas ?? 0,
      enCurso,
    });
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }

  return puntos;
}
