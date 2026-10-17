import { describe, expect, it } from 'vitest';
import { calcularClientesTop, type PolizaClienteTop } from './clientes-top';

const now = new Date('2026-10-17T15:00:00Z');
const poliza = (
  id: string,
  clienteId: string,
  prima: number,
  nombre = `Cliente ${clienteId}`,
  extra: Partial<PolizaClienteTop> = {}
): PolizaClienteTop => ({
  id,
  cliente_id: clienteId,
  estado: 'VIGENTE',
  fecha_inicio: '2026-01-01',
  fecha_fin: null,
  prima,
  prima_periodicidad: 'MENSUAL',
  fecha_baja: null,
  comision_desde: '2026-01-01',
  cliente: {
    id: clienteId,
    nombre,
    apellido: 'Test',
    deleted_at: null,
  },
  ...extra,
});

describe('ranking de clientes del tablero', () => {
  it('suma premio mensual por asegurado y calcula comisión aproximada al 14%', () => {
    const ranking = calcularClientesTop(
      [
        poliza('p1', 'c1', 1000),
        poliza('p2', 'c1', 2000),
        poliza('p3', 'c2', 2500),
      ],
      [],
      now
    );
    expect(ranking).toEqual([
      {
        cliente_id: 'c1',
        cliente_nombre: 'Cliente c1 Test',
        total_polizas: 2,
        prima_total: 3000,
        comision_aproximada: 420,
      },
      {
        cliente_id: 'c2',
        cliente_nombre: 'Cliente c2 Test',
        total_polizas: 1,
        prima_total: 2500,
        comision_aproximada: 350,
      },
    ]);
  });

  it('ordena por premio descendente y omite pólizas no vigentes o clientes dados de baja', () => {
    const ranking = calcularClientesTop(
      [
        poliza('p1', 'c1', 1000),
        poliza('p2', 'c2', 5000),
        poliza('p3', 'c3', 9000, 'Dado de baja', {
          cliente: {
            id: 'c3',
            nombre: 'Dado de baja',
            apellido: 'Test',
            deleted_at: '2026-01-01T00:00:00Z',
          },
        }),
        poliza('p4', 'c4', 12000, 'Póliza baja', { estado: 'BAJA' }),
      ],
      [],
      now
    );
    expect(ranking.map((item) => item.cliente_id)).toEqual(['c2', 'c1']);
  });

  it('no rankea premios parciales si el cliente tiene otra póliza vigente sin importe', () => {
    const ranking = calcularClientesTop(
      [
        poliza('p1', 'c1', 1000),
        poliza('p2', 'c1', 0),
        poliza('p3', 'c2', 500),
      ],
      [],
      now
    );
    expect(ranking.map((item) => item.cliente_id)).toEqual(['c2']);
  });

  it('limita la lista a diez clientes', () => {
    const ranking = calcularClientesTop(
      Array.from({ length: 12 }, (_, i) =>
        poliza(`p${i}`, `c${i}`, (i + 1) * 100)
      ),
      [],
      now
    );
    expect(ranking).toHaveLength(10);
    expect(ranking[0].cliente_id).toBe('c11');
    expect(ranking.at(-1)?.cliente_id).toBe('c2');
  });
});
