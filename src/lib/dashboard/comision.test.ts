import { describe, expect, it } from 'vitest';
import { calcularComisionMensual, periodoComision } from './comision';

const now = new Date('2026-10-17T15:00:00Z');

describe('comisión mensual', () => {
  it('atribuye las cargas históricas al inicio de vigencia, nunca al día de carga', () => {
    const polizas = [
      {
        fecha_inicio: '2026-07-01',
        prima: 1000,
        created_at: '2026-10-17T12:00:00Z',
      },
      {
        fecha_inicio: '2026-07-31',
        prima: '2000',
        created_at: '2026-10-17T12:00:00Z',
      },
      { fecha_inicio: null, prima: 50000, created_at: '2026-10-17T12:00:00Z' },
    ];
    const puntos = calcularComisionMensual(polizas, now);
    expect(puntos[0]).toMatchObject({ mes: '2026-07', polizas: 2 });
    expect(puntos[0].comision).toBeCloseTo(420);
    expect(puntos.at(-1)).toMatchObject({
      mes: '2026-10',
      polizas: 0,
      comision: 0,
    });
  });

  it('promedia tres meses calendario completos, incluyendo meses intermedios sin pólizas', () => {
    const puntos = calcularComisionMensual(
      [
        { fecha_inicio: '2026-06-01', prima: 3000 },
        { fecha_inicio: '2026-08-01', prima: 6000 },
        { fecha_inicio: '2026-09-01', prima: 9000 },
        { fecha_inicio: '2026-10-01', prima: 999999 },
      ],
      now
    );
    expect(puntos.map((p) => p.mes)).toEqual([
      '2026-06',
      '2026-07',
      '2026-08',
      '2026-09',
      '2026-10',
    ]);
    expect(puntos[0].tendencia).toBeNull();
    expect(puntos[1]).toMatchObject({ comision: 0, tendencia: null });
    expect(puntos[2].tendencia).toBeCloseTo(420);
    expect(puntos[3].tendencia).toBeCloseTo(700);
    expect(puntos[4]).toMatchObject({ enCurso: true, tendencia: null });
  });

  it('no fabrica meses de actividad antes del primer registro ni una tendencia con sólo dos meses cerrados', () => {
    const puntos = calcularComisionMensual(
      [{ fecha_inicio: '2026-08-01', prima: 1000 }],
      now
    );
    expect(puntos).toHaveLength(3);
    expect(puntos.every((p) => p.tendencia === null)).toBe(true);
  });

  it('excluye inicios futuros incluso dentro del mes actual y limita la ventana a 12 meses', () => {
    const puntos = calcularComisionMensual(
      [
        { fecha_inicio: '2025-10-31', prima: 50000 },
        { fecha_inicio: '2025-11-01', prima: 1000 },
        { fecha_inicio: '2026-10-17', prima: 2000 },
        { fecha_inicio: '2026-10-18', prima: 50000 },
        { fecha_inicio: '2026-11-01', prima: 50000 },
      ],
      now
    );
    expect(puntos).toHaveLength(12);
    expect(puntos[0]).toMatchObject({ mes: '2025-11', comision: 140 });
    expect(puntos.at(-1)).toMatchObject({
      mes: '2026-10',
      comision: 280,
      polizas: 1,
    });
  });

  it('mantiene el cero de una póliza sin premio y no produce NaN', () => {
    const puntos = calcularComisionMensual(
      [
        { fecha_inicio: '2026-10-01', prima: null },
        { fecha_inicio: '2026-10-02', prima: 'inválido' },
      ],
      now
    );
    expect(puntos[0]).toMatchObject({
      comision: 0,
      polizas: 2,
      tendencia: null,
    });
  });

  it('devuelve una serie vacía sin pólizas con fecha válida en el período', () => {
    expect(calcularComisionMensual([], now)).toEqual([]);
    expect(
      calcularComisionMensual([{ fecha_inicio: null, prima: 1000 }], now)
    ).toEqual([]);
  });

  it('respeta el mes y día argentinos en el cambio de mes UTC', () => {
    const cambioMes = new Date('2026-11-01T01:00:00Z');
    expect(periodoComision(cambioMes)).toEqual({
      desde: '2025-11-01',
      hoy: '2026-10-31',
      mesActual: '2026-10',
    });
    const puntos = calcularComisionMensual(
      [
        { fecha_inicio: '2026-10-01', prima: 1000 },
        { fecha_inicio: '2026-11-01', prima: 5000 },
      ],
      cambioMes
    );
    expect(puntos).toHaveLength(1);
    expect(puntos[0]).toMatchObject({
      mes: '2026-10',
      enCurso: true,
      comision: 140,
    });
  });
});
