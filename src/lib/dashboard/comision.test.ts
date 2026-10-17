import { describe, expect, it } from 'vitest';
import {
  calcularComisionMensual,
  mensualizarPrima,
  periodoComision,
  type HistorialComision,
  type PolizaComision,
} from './comision';

const now = new Date('2026-06-17T15:00:00Z');
const poliza = (overrides: Partial<PolizaComision> = {}): PolizaComision => ({
  id: 'p1',
  estado: 'VIGENTE',
  fecha_inicio: '2026-01-01',
  fecha_fin: null,
  prima: 1000,
  prima_periodicidad: 'MENSUAL',
  fecha_baja: null,
  comision_desde: '2026-01-01',
  updated_at: '2026-01-01T12:00:00Z',
  ...overrides,
});
const evento = (
  antes: PolizaComision,
  despues: PolizaComision,
  id = 'h1'
): HistorialComision => ({
  id,
  poliza_id: despues.id,
  datos_anteriores: { ...antes },
  datos_nuevos: { ...despues },
  completo: true,
  fecha_efecto: despues.comision_desde,
  created_at: `${despues.comision_desde}T12:00:00Z`,
});
const importe = (
  data: ReturnType<typeof calcularComisionMensual>,
  mes: string
) => data.serie.find((p) => p.mes === mes)!.comision;

describe('stock mensual recurrente', () => {
  it('una póliza anterior a la ventana sigue aportando en los doce meses sin altas', () => {
    const data = calcularComisionMensual(
      [poliza({ fecha_inicio: '2020-01-01', comision_desde: '2020-01-01' })],
      now
    );
    expect(data.serie).toHaveLength(12);
    expect(data.serie.every((p) => p.comision === 140 && p.polizas === 1)).toBe(
      true
    );
  });

  it('reproduce el ejemplo: nuevas, estabilidad y baja sin acumular comisiones indefinidamente', () => {
    const cartera = [
      poliza({ id: 'base', prima: 90000 / 0.14 }),
      poliza({
        id: 'feb',
        prima: 20000 / 0.14,
        fecha_inicio: '2026-02-01',
        comision_desde: '2026-02-01',
      }),
      poliza({
        id: 'mar',
        prima: 15000 / 0.14,
        fecha_inicio: '2026-03-01',
        comision_desde: '2026-03-01',
      }),
      poliza({
        id: 'jun',
        prima: 30000 / 0.14,
        fecha_inicio: '2026-06-01',
        comision_desde: '2026-06-01',
      }),
    ];
    const bajaAntes = poliza({ id: 'baja', prima: 10000 / 0.14 });
    const baja = poliza({
      ...bajaAntes,
      estado: 'BAJA',
      fecha_baja: '2026-05-01',
      comision_desde: '2026-05-01',
    });
    const data = calcularComisionMensual([...cartera, baja], now, [
      evento(bajaAntes, baja),
    ]);
    expect(
      ['01', '02', '03', '04', '05', '06'].map((m) =>
        importe(data, `2026-${m}`)
      )
    ).toEqual([100000, 120000, 135000, 135000, 125000, 155000]);
  });

  it('una nueva póliza incrementa el stock desde su inicio, sin aportar antes', () => {
    const data = calcularComisionMensual(
      [
        poliza(),
        poliza({
          id: 'p2',
          fecha_inicio: '2026-03-15',
          comision_desde: '2026-02-01',
          prima: 2000,
        }),
      ],
      now
    );
    expect(importe(data, '2026-02')).toBe(140);
    expect(importe(data, '2026-03')).toBe(420);
    expect(importe(data, '2026-04')).toBe(420);
  });

  it('respeta vencimiento inclusivo al corte mensual y no prolonga indefinidamente', () => {
    const data = calcularComisionMensual(
      [poliza({ fecha_fin: '2026-04-30' })],
      now
    );
    expect(importe(data, '2026-04')).toBe(140);
    expect(importe(data, '2026-05')).toBe(0);
  });

  it('reconstruye una baja sin aplicar el estado actual a meses anteriores', () => {
    const antes = poliza();
    const despues = poliza({
      estado: 'BAJA',
      fecha_baja: '2026-05-10',
      comision_desde: '2026-05-10',
    });
    const data = calcularComisionMensual([despues], now, [
      evento(antes, despues),
    ]);
    expect(importe(data, '2026-04')).toBe(140);
    expect(importe(data, '2026-05')).toBe(0);
    expect(data.resumen.comisionActual).toBe(0);
  });

  it('una renovación VIGENTE a VIGENTE reemplaza al mismo id sin duplicar y conserva el premio previo', () => {
    const antes = poliza({ fecha_fin: '2026-03-31' });
    const despues = poliza({
      fecha_inicio: '2026-04-01',
      fecha_fin: '2027-03-31',
      comision_desde: '2026-04-01',
      prima: 2000,
    });
    const data = calcularComisionMensual([despues], now, [
      evento(antes, despues),
    ]);
    expect(importe(data, '2026-03')).toBe(140);
    expect(importe(data, '2026-04')).toBe(280);
    expect(data.resumen.polizas).toBe(1);
  });

  it('una renovación futura no reemplaza todavía la versión que aporta hoy', () => {
    const antes = poliza({ fecha_fin: '2026-06-30' });
    const despues = poliza({
      fecha_inicio: '2026-07-01',
      fecha_fin: '2027-06-30',
      comision_desde: '2026-07-01',
      prima: 2000,
    });
    const hist = evento(antes, despues);
    hist.created_at = '2026-06-10T12:00:00Z';
    const data = calcularComisionMensual([despues], now, [hist]);
    expect(data.resumen.comisionActual).toBe(140);
    expect(data.serie.at(-1)?.corte).toBe('2026-06-17');
  });

  it('no incorpora pólizas que comienzan después de hoy, incluso dentro del mes en curso', () => {
    const data = calcularComisionMensual(
      [
        poliza(),
        poliza({
          id: 'futuro',
          fecha_inicio: '2026-06-20',
          comision_desde: '2026-06-01',
          prima: 900000,
        }),
      ],
      now
    );
    expect(data.resumen.comisionActual).toBe(140);
    expect(data.resumen.polizas).toBe(1);
    expect(data.serie.at(-1)).toMatchObject({
      enCurso: true,
      corte: '2026-06-17',
    });
  });

  it('usa la prima histórica que corresponde, no el último importe en toda la serie', () => {
    const antes = poliza();
    const despues = poliza({ prima: 3000, comision_desde: '2026-04-01' });
    const data = calcularComisionMensual([despues], now, [
      evento(antes, despues),
    ]);
    expect(importe(data, '2026-03')).toBe(140);
    expect(importe(data, '2026-04')).toBe(420);
  });

  it('no inventa un histórico cuando sólo existe la foto actual de una póliza legacy', () => {
    const legacy: PolizaComision = {
      id: 'legacy',
      estado: 'VIGENTE',
      fecha_inicio: '2025-01-01',
      fecha_fin: null,
      prima: 1000,
    };
    const data = calcularComisionMensual([legacy], now, [
      {
        id: 'h',
        poliza_id: 'legacy',
        datos_anteriores: { prima: 500 },
        datos_nuevos: { prima: 1000 },
        created_at: '2026-05-01T12:00:00Z',
      },
    ]);
    expect(data.serie.slice(0, -1).every((p) => p.comision === null)).toBe(
      true
    );
    expect(data.resumen.comisionActual).toBe(140); // periodicidad mensual confirmada por usuario
    expect(data.resumen.variacion).toBeNull();
  });

  it('conserva una foto observada desde su fecha, sin extenderla al inicio importado', () => {
    const data = calcularComisionMensual(
      [poliza({ comision_desde: '2026-04-15' })],
      now
    );
    expect(importe(data, '2026-03')).toBeNull();
    expect(importe(data, '2026-04')).toBe(140);
    expect(importe(data, '2026-05')).toBe(140);
  });

  it('no presenta un subtotal conocido como total completo ni anualiza datos incompletos', () => {
    const data = calcularComisionMensual(
      [poliza(), poliza({ id: 'sin-prima', prima: 0 })],
      now
    );
    expect(data.resumen).toMatchObject({
      comisionActual: null,
      sinDatos: 1,
      polizas: 1,
      anualizada: null,
      variacion: null,
    });
    expect(data.serie.at(-1)?.comisionConocida).toBe(140);
  });

  it('marca las fechas legacy ambiguas sin modificarlas ni inferir fecha de baja', () => {
    const data = calcularComisionMensual(
      [poliza({ legacy_id: 3, fecha_fin: '2026-12-01', comision_desde: null })],
      now
    );
    expect(data.resumen.comisionActual).toBeNull();
  });

  it('calcula variación y todos los indicadores desde el último punto de la misma serie', () => {
    const data = calcularComisionMensual(
      [
        poliza(),
        poliza({
          id: 'junio',
          fecha_inicio: '2026-06-01',
          comision_desde: '2026-06-01',
        }),
      ],
      now
    );
    const actual = data.serie.at(-1)!;
    expect(actual.variacion).toBe(140);
    expect(actual.variacionPorcentual).toBe(100);
    expect(data.resumen).toMatchObject({
      comisionActual: actual.comision,
      variacion: actual.variacion,
      polizas: actual.polizas,
      anualizada: 3360,
    });
  });

  it('no divide por cero cuando la cartera comienza a aportar', () => {
    const data = calcularComisionMensual(
      [poliza({ fecha_inicio: '2026-06-01', comision_desde: '2026-06-01' })],
      now
    );
    expect(data.resumen.variacion).toBe(140);
    expect(data.resumen.variacionPorcentual).toBeNull();
  });

  it('cartera sin pólizas tiene doce ceros reales', () => {
    const data = calcularComisionMensual([], now);
    expect(data.serie).toHaveLength(12);
    expect(data.serie.every((p) => p.comision === 0)).toBe(true);
    expect(data.resumen.polizas).toBe(0);
  });

  it('respeta el calendario argentino en el cambio de mes UTC', () => {
    expect(periodoComision(new Date('2026-07-01T01:00:00Z'))).toEqual({
      desde: '2025-07-01',
      hoy: '2026-06-30',
      mesActual: '2026-06',
    });
  });
});

describe('periodicidad explícita', () => {
  it.each([
    ['MENSUAL', 1200],
    ['BIMESTRAL', 600],
    ['TRIMESTRAL', 400],
    ['CUATRIMESTRAL', 300],
    ['SEMESTRAL', 200],
    ['ANUAL', 100],
    ['UNICA', 0],
  ] as const)(
    '%s convierte sólo según su período declarado',
    (periodo, esperado) => {
      expect(mensualizarPrima(1200, periodo)).toBe(esperado);
    }
  );
  it('la periodicidad desconocida no se transforma en mensual ni anual', () => {
    expect(mensualizarPrima(1200, null)).toBeNull();
    const data = calcularComisionMensual(
      [poliza({ prima_periodicidad: null })],
      now
    );
    expect(data.resumen.comisionActual).toBeNull();
  });
  it.each([null, 0, -100, NaN, Infinity, 'incorrecto'])(
    'importe inválido %s no fabrica un cero',
    (valor) => {
      expect(mensualizarPrima(valor, 'MENSUAL')).toBeNull();
    }
  );
});
