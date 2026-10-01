import { describe, it, expect } from 'vitest';
import { calculateRiskScore, type RiskInput } from './calculate-risk-score';

type S = RiskInput['siniestros'][number];

const siniestro = (over: Partial<S> = {}): S => ({
  tipo: 'OTROS',
  responsabilidad: 'INDETERMINADA',
  monto_estimado: 0,
  ...over,
});

describe('calculateRiskScore', () => {
  it('sin datos → score 0, nivel bajo, sin alertas', () => {
    const r = calculateRiskScore({ siniestros: [], totalPolizas: 0 });
    expect(r.score).toBe(0);
    expect(r.nivel).toBe('bajo');
    expect(r.alertas).toEqual([]);
  });

  it('un choque responsable con una póliza → score 5, bajo', () => {
    const r = calculateRiskScore({
      siniestros: [siniestro({ tipo: 'CHOQUE', responsabilidad: 'RESPONSABLE' })],
      totalPolizas: 1,
    });
    expect(r.score).toBe(5);
    expect(r.nivel).toBe('bajo');
  });

  it('dos robos con una póliza → score 65, alto, con alerta', () => {
    const r = calculateRiskScore({
      siniestros: [siniestro({ tipo: 'ROBO' }), siniestro({ tipo: 'ROBO' })],
      totalPolizas: 1,
    });
    // robos>=2: +50 ; totalEv 2: +5 ; frecuencia 2/1>=1.5: +10 = 65
    expect(r.score).toBe(65);
    expect(r.nivel).toBe('alto');
    expect(r.alertas.length).toBe(1);
  });

  it('tres choques responsables → score 40, medio, dos alertas', () => {
    const r = calculateRiskScore({
      siniestros: [
        siniestro({ tipo: 'CHOQUE', responsabilidad: 'RESPONSABLE' }),
        siniestro({ tipo: 'CHOQUE', responsabilidad: 'RESPONSABLE' }),
        siniestro({ tipo: 'CHOQUE', responsabilidad: 'RESPONSABLE' }),
      ],
      totalPolizas: 1,
    });
    // choques*5 = 15 ; totalEv 3: +5 ; frecuencia 3/1>=3: +20 = 40
    expect(r.score).toBe(40);
    expect(r.nivel).toBe('medio');
    expect(r.alertas.length).toBe(2);
  });

  it('monto exacto 999 → componente de monto = 9 (log10(1000)*3)', () => {
    const r = calculateRiskScore({
      siniestros: [siniestro({ monto_estimado: 999 })],
      totalPolizas: 0,
    });
    expect(r.score).toBe(9);
    expect(r.nivel).toBe('bajo');
  });

  it('escenario extremo → score clamp a 100, alto', () => {
    const r = calculateRiskScore({
      siniestros: Array.from({ length: 8 }, () => siniestro({ tipo: 'ROBO', monto_estimado: 200000 })),
      totalPolizas: 1,
    });
    expect(r.score).toBe(100);
    expect(r.nivel).toBe('alto');
    expect(r.alertas.length).toBe(4);
  });

  it('nunca produce score < 0 ni > 100 en ningún escenario', () => {
    const escenarios: RiskInput[] = [
      { siniestros: [], totalPolizas: 0 },
      { siniestros: [siniestro()], totalPolizas: 0 },
      { siniestros: Array.from({ length: 50 }, () => siniestro({ tipo: 'ROBO', monto_estimado: 9e9 })), totalPolizas: 1 },
      { siniestros: [siniestro({ monto_estimado: -5000 })], totalPolizas: 3 },
    ];
    for (const e of escenarios) {
      const { score } = calculateRiskScore(e);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
      expect(Number.isInteger(score)).toBe(true);
    }
  });

  it('monto NaN se trata como 0 (sin NaN en el resultado)', () => {
    const r = calculateRiskScore({
      siniestros: [siniestro({ monto_estimado: NaN })],
      totalPolizas: 0,
    });
    expect(Number.isFinite(r.score)).toBe(true);
    expect(r.score).toBe(0);
  });

  it('monto Infinity queda acotado por el cap de 15', () => {
    const r = calculateRiskScore({
      siniestros: [siniestro({ monto_estimado: Infinity })],
      totalPolizas: 1,
    });
    // monto cap 15 ; totalEv 1 y frecuencia 1/1 no suman → 15
    expect(Number.isFinite(r.score)).toBe(true);
    expect(r.score).toBe(15);
    expect(r.nivel).toBe('bajo');
  });

  it('monto negativo se ignora (no resta)', () => {
    const r = calculateRiskScore({
      siniestros: [siniestro({ monto_estimado: -100000 })],
      totalPolizas: 1,
    });
    expect(r.score).toBe(0);
  });

  it('cero pólizas no provoca división por cero en la frecuencia', () => {
    const r = calculateRiskScore({
      siniestros: Array.from({ length: 5 }, () => siniestro()),
      totalPolizas: 0,
    });
    // totalEv 5: +10 ; frecuencia omitida por totalPolizas=0
    expect(r.score).toBe(10);
    expect(Number.isFinite(r.score)).toBe(true);
  });

  it('es determinista: misma entrada → mismo resultado', () => {
    const input: RiskInput = {
      siniestros: [siniestro({ tipo: 'ROBO' }), siniestro({ tipo: 'CHOQUE', responsabilidad: 'RESPONSABLE' })],
      totalPolizas: 2,
    };
    expect(calculateRiskScore(input)).toEqual(calculateRiskScore(input));
  });
});
