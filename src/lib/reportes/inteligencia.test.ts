import { describe, expect, it } from 'vitest';
import {
  analizarCartera,
  validarFiltros,
  type DatosInteligencia,
} from './inteligencia';
import { normalizarProvincia, SIN_UBICACION, EXTERIOR } from './geografia';
import { calcularComisionMensual } from '@/lib/dashboard/comision';
import type { Cliente, Poliza, PolizaHistorial } from '@/types/database';

const now = new Date('2026-10-17T15:00:00Z');
const cliente = (
  id: string,
  provincia: string | null = 'Córdoba'
): Cliente => ({
  id,
  nombre: `Prueba ${id}`,
  apellido: 'Sintético',
  provincia,
  localidad: 'Villa de prueba',
  direccion: null,
  dni: null,
  observaciones: null,
  email: null,
  telefono: null,
  fecha_nacimiento: null,
  deleted_at: null,
  created_at: '2025-01-01T15:00:00Z',
  updated_at: '2025-01-01T15:00:00Z',
});
const poliza = (
  id: string,
  cliente_id: string,
  extra: Partial<Poliza> = {}
): Poliza => ({
  id,
  cliente_id,
  compania_id: 'cia',
  ramo_id: 'ramo',
  estado: 'VIGENTE',
  fecha_inicio: '2026-01-01',
  fecha_fin: null,
  fecha_baja: null,
  comision_desde: '2026-01-01',
  prima: 1000,
  detalle: null,
  legacy_id: null,
  created_at: '2026-01-01T15:00:00Z',
  updated_at: '2026-01-01T15:00:00Z',
  ...extra,
});
const datos = (
  ps: Poliza[],
  cs = [cliente('c1')],
  historial: PolizaHistorial[] = []
): DatosInteligencia => ({
  clientes: cs,
  polizas: ps,
  historial,
  companias: [
    {
      id: 'cia',
      nombre: 'Compañía de prueba',
      codigo: null,
      estado: 'ACTIVA',
      created_at: '2025-01-01',
    },
  ],
  ramos: [
    {
      id: 'ramo',
      nombre: 'Automotores',
      codigo: null,
      created_at: '2025-01-01',
    },
  ],
});
const filtro = { desde: '2026-09-01', hasta: '2026-10-17' };

describe('inteligencia de cartera con evidencia', () => {
  it('deduplica asegurados, reconcilia geografía y separa segmentos', () => {
    const d = datos(
      [
        poliza('p1', 'c1'),
        poliza('p2', 'c1'),
        poliza('p3', 'c2'),
        poliza('p4', 'c3'),
        poliza('p5', 'c4'),
      ],
      [
        cliente('c1', 'CBA'),
        cliente('c2', 'Bs. As.'),
        cliente('c3', 'sin revisar'),
        cliente('c4', 'Uruguay'),
      ]
    );
    const r = analizarCartera(d, filtro, now);
    expect(r.metricas).toMatchObject({
      asegurados: 4,
      polizas: 5,
      promedio: 1.25,
      comision: 700,
      acumulado: 1400,
    });
    expect(r.geografia!.find((g) => g.id === '14')).toMatchObject({
      asegurados: 1,
      polizas: 2,
      porcentaje: 25,
    });
    expect(r.geografia!.reduce((n, g) => n + g.asegurados, 0)).toBe(
      r.metricas.asegurados
    );
    expect(r.geografia!.find((g) => g.id === SIN_UBICACION)?.asegurados).toBe(
      1
    );
    expect(r.geografia!.find((g) => g.id === EXTERIOR)?.asegurados).toBe(1);
    expect(
      r.segmentos!.find((s) => s.cantidad === 2)?.clientes.map((c) => c.id)
    ).toEqual(['c1']);
    expect(r.segmentos!.reduce((n, g) => n + g.clientes.length, 0)).toBe(4);
    expect(d.clientes[0].provincia).toBe('CBA');
  });
  it('aplica filtros a todos los resultados sin duplicar clientes', () => {
    const d = datos(
      [
        poliza('p1', 'c1'),
        poliza('p2', 'c1', { compania_id: 'otra' }),
        poliza('p3', 'c2'),
      ],
      [cliente('c1'), cliente('c2', 'CABA')]
    );
    const r = analizarCartera(
      d,
      { ...filtro, compania: 'cia', provincia: '14' },
      now
    );
    expect(r.metricas).toMatchObject({
      asegurados: 1,
      polizas: 1,
      comision: 140,
      acumulado: 280,
      promedio: 1,
    });
    expect(r.serie.every((s) => s.polizas === 1 && s.comision === 140)).toBe(
      true
    );
    expect(r.companias).toHaveLength(1);
    expect(r.ramos).toHaveLength(1);
    expect(r.geografia).toHaveLength(1);
    expect(r.segmentos![0].clientes).toHaveLength(1);
  });
  it('suma versiones financieras sin extrapolar el premio actual y respeta baja efectiva', () => {
    const p = poliza('p1', 'c1', {
      estado: 'BAJA',
      fecha_baja: '2026-10-10',
      comision_desde: '2026-10-10',
      prima: 2000,
    });
    const anterior = {
      ...p,
      estado: 'VIGENTE',
      fecha_baja: null,
      comision_desde: '2026-01-01',
      prima: 1000,
      prima_periodicidad: 'MENSUAL',
    };
    const h: PolizaHistorial = {
      id: 'h1',
      poliza_id: 'p1',
      usuario_id: null,
      tipo: 'BAJA',
      datos_anteriores: anterior,
      datos_nuevos: { ...p, prima_periodicidad: 'MENSUAL' },
      nota: null,
      created_at: '2026-10-10T12:00:00Z',
      completo: true,
      fecha_efecto: '2026-10-10',
      version_orden: 1,
    };
    const d = datos([p], [cliente('c1')], [h]);
    const r = analizarCartera(d, filtro, now);
    expect(r.serie.map((s) => s.comision)).toEqual([140, 0]);
    expect(r.metricas).toMatchObject({
      comision: 0,
      acumulado: 140,
      polizas: 0,
      bajas: 1,
    });
    expect(r.motivos).toEqual({ baja: 1, vencimiento: 0, historica: 0 });
    const antes = analizarCartera(
      d,
      { desde: '2026-10-01', hasta: '2026-10-09' },
      now
    );
    expect(antes.metricas.comision).toBe(140);
    const corte = analizarCartera(
      d,
      { desde: '2026-10-01', hasta: '2026-10-10' },
      now
    );
    expect(corte.metricas.comision).toBe(0);
  });
  it('coincide con la serie del dashboard para los mismos cortes completos', () => {
    const d = datos([poliza('p1', 'c1'), poliza('p2', 'c1', { prima: 2500 })]);
    const r = analizarCartera(
      d,
      { desde: '2026-01-01', hasta: '2026-10-17' },
      now
    );
    const serie = calcularComisionMensual(d.polizas, now, d.historial).serie;
    r.serie.forEach((p) =>
      expect(p.comision).toBe(serie.find((s) => s.mes === p.mes)?.comision)
    );
    expect(r.metricas.acumulado).toBe(4900);
  });
  it('no acredita meses anteriores a la primera observación ni acumula un subtotal incompleto', () => {
    const d = datos([poliza('p1', 'c1', { comision_desde: '2026-10-17' })]);
    const r = analizarCartera(d, filtro, now);
    expect(r.metricas.comision).toBe(140);
    expect(r.metricas.acumulado).toBeNull();
    expect(r.serie[0].polizas).toBeNull();
    expect(r.serie[0].comision).toBeNull();
    const pasado = analizarCartera(
      d,
      { desde: '2026-09-01', hasta: '2026-09-30' },
      now
    );
    expect(pasado.geografia).toBeNull();
    expect(pasado.metricas.asegurados).toBeNull();
  });
  it('distingue importe faltante, cartera vacía y división sin asegurados', () => {
    const r = analizarCartera(
      datos([poliza('p1', 'c1', { prima: 0 })]),
      filtro,
      now
    );
    expect(r.metricas.asegurados).toBe(1);
    expect(r.metricas.comision).toBeNull();
    expect(r.metricas.acumulado).toBeNull();
    const vacio = analizarCartera(datos([]), filtro, now);
    expect(vacio.metricas).toMatchObject({
      asegurados: 0,
      polizas: 0,
      comision: 0,
      acumulado: 0,
      promedio: null,
    });
  });
  it('fin inclusivo y baja/exclusión desde la fecha efectiva; no acepta fechas legacy ambiguas', () => {
    const d = datos([
      poliza('p1', 'c1', { fecha_fin: '2026-10-17' }),
      poliza('p2', 'c1', {
        legacy_id: 1,
        fecha_fin: '2020-01-01',
        comision_desde: null,
      }),
    ]);
    const r = analizarCartera(
      d,
      { desde: '2026-10-17', hasta: '2026-10-17' },
      now
    );
    expect(r.metricas.polizas).toBe(2);
    expect(r.metricas.vencimientos).toBe(1);
    expect(r.calidad.finLegacyAmbiguo).toBe(1);
    const eliminado = cliente('c1');
    eliminado.deleted_at = '2026-10-17T03:00:00Z';
    expect(
      analizarCartera(datos([poliza('p1', 'c1')], [eliminado]), filtro, now)
        .metricas.polizas
    ).toBe(0);
  });
  it('primer alta registral se calcula antes de filtrar compañías o renovaciones', () => {
    const d = datos([
      poliza('p1', 'c1', { compania_id: 'otra' }),
      poliza('p2', 'c1', { created_at: '2026-10-01T03:00:00Z' }),
    ]);
    expect(
      analizarCartera(d, { ...filtro, compania: 'cia' }, now).metricas.nuevos
    ).toBe(0);
  });
  it('no interpreta fotos iniciales como altas; distingue vencimientos de bajas', () => {
    const d = datos([poliza('p1', 'c1', { fecha_fin: '2026-09-30' })]);
    const r = analizarCartera(d, filtro, now);
    expect(r.metricas.bajas).toBe(1);
    expect(r.motivos?.vencimiento).toBe(1);
    expect(r.serie.map((s) => s.altas)).toEqual([0, 0]);
    expect(r.serie.map((s) => s.bajas)).toEqual([0, 1]);
  });
  it('rechaza rangos inválidos, futuros y mayores a 36 meses', () => {
    for (const f of [
      { desde: '2026-02-30', hasta: '2026-10-17' },
      { desde: '2026-10-18', hasta: '2026-10-18' },
      { desde: '2020-01-01', hasta: '2026-10-17' },
    ])
      expect(() => validarFiltros(f, '2026-10-17')).toThrow();
  });
  it('una renovación sin interrupción mantiene una sola póliza y no genera altas ni bajas', () => {
    const p = poliza('p1', 'c1', {
      fecha_inicio: '2026-10-01',
      fecha_fin: '2027-09-30',
      comision_desde: '2026-10-01',
      prima: 2000,
    });
    const h: PolizaHistorial = {
      id: 'h1',
      poliza_id: 'p1',
      usuario_id: null,
      tipo: 'RENOVACION',
      nota: null,
      created_at: '2026-10-01T12:00:00Z',
      completo: true,
      fecha_efecto: '2026-10-01',
      version_orden: 1,
      datos_anteriores: {
        ...p,
        fecha_inicio: '2026-01-01',
        fecha_fin: '2026-09-30',
        comision_desde: '2026-01-01',
        prima: 1000,
        prima_periodicidad: 'MENSUAL',
      },
      datos_nuevos: { ...p, prima_periodicidad: 'MENSUAL' },
    };
    const r = analizarCartera(datos([p], [cliente('c1')], [h]), filtro, now);
    expect(r.serie.map((s) => s.comision)).toEqual([140, 280]);
    expect(r.metricas).toMatchObject({
      polizas: 1,
      asegurados: 1,
      acumulado: 420,
      bajas: 0,
      nuevos: 0,
    });
    expect(
      r.serie.every((s) => s.altas === 0 && s.bajas === 0 && s.neto === 0)
    ).toBe(true);
  });
});
it('filtrar por estado no transforma la falta de historia en cero', () => {
  const d = datos([
    poliza('p1', 'c1', {
      estado: 'BAJA',
      fecha_baja: '2026-10-17',
      comision_desde: '2026-10-17',
    }),
  ]);
  const r = analizarCartera(
    d,
    { desde: '2026-09-01', hasta: '2026-09-30', estado: 'VIGENTE' },
    now
  );
  expect(r.metricas.polizas).toBeNull();
  expect(r.metricas.asegurados).toBeNull();
  expect(r.calidad.sinHistoria).toBe(1);
});

describe('normalización geográfica conservadora', () => {
  it.each([
    ['Córdoba', '14'],
    ['Cordoba', '14'],
    ['CBA', '14'],
    ['Bs. As.', '06'],
    ['Capital Federal', '02'],
    ['CABA', '02'],
    ['Provincia de Buenos Aires', '06'],
    ['Neuquén', '58'],
    ['Tierra del Fuego, Antártida e Islas del Atlántico Sur', '94'],
    ['Uruguay', EXTERIOR],
    ['Montevideo', SIN_UBICACION],
    ['Santiago', SIN_UBICACION],
    ['', SIN_UBICACION],
  ])('%s → %s', (s, id) => expect(normalizarProvincia(s)).toBe(id));
});
