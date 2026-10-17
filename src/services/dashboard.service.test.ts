import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { fetchComisionMensual } from './dashboard.service';
import type { PolizaComision } from '@/lib/dashboard/comision';

type Page = { data: unknown[] | null; error: Error | null };
function mockSupabase(
  polizas: Page[],
  historial: Page[] = [{ data: [], error: null }]
) {
  const query = (pages: Page[]) => {
    const result = {
      select: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn(),
    };
    for (const page of pages) result.range.mockResolvedValueOnce(page);
    return result;
  };
  const p = query(polizas),
    h = query(historial);
  const from = vi.fn((table: string) => (table === 'polizas' ? p : h));
  return { client: { from } as unknown as SupabaseClient, p, h, from };
}
const now = new Date('2026-06-17T15:00:00Z');
const row: PolizaComision = {
  id: 'p1',
  estado: 'VIGENTE',
  fecha_inicio: '2020-01-01',
  fecha_fin: null,
  prima: 100,
  comision_desde: '2020-01-01',
  prima_periodicidad: 'MENSUAL',
  fecha_baja: null,
};

describe('fetchComisionMensual', () => {
  it('incluye el ranking de diez clientes por premio mensual y comisión aproximada', async () => {
    const { client } = mockSupabase([
      {
        data: [
          {
            ...row,
            cliente_id: 'c1',
            cliente: {
              id: 'c1',
              nombre: 'Ana',
              apellido: 'Pérez',
              deleted_at: null,
            },
          },
        ],
        error: null,
      },
    ]);
    const result = await fetchComisionMensual(client, now);
    expect(result.topClientes).toEqual([
      {
        cliente_id: 'c1',
        cliente_nombre: 'Ana Pérez',
        total_polizas: 1,
        prima_total: 100,
        comision_aproximada: 14,
      },
    ]);
  });
  it('trae más de 1000 pólizas y conserva pólizas anteriores a la ventana de 12 meses', async () => {
    const { client, p, from } = mockSupabase([
      {
        data: Array.from({ length: 1000 }, (_, i) => ({ ...row, id: `p${i}` })),
        error: null,
      },
      { data: [{ ...row, id: 'p1000', prima: 500 }], error: null },
    ]);
    const result = await fetchComisionMensual(client, now);
    expect(result.resumen.comisionActual).toBeCloseTo(14070);
    expect(result.resumen.polizas).toBe(1001);
    expect(result.serie.every((p) => p.comision === 14070)).toBe(true);
    expect(from.mock.calls).toEqual([
      ['polizas'],
      ['polizas'],
      ['poliza_historial'],
    ]);
    expect(p.range.mock.calls).toEqual([
      [0, 999],
      [1000, 1999],
    ]);
  });
  it('pagina también el historial completo y lo utiliza para reconstruir el stock', async () => {
    const despues = {
      ...row,
      estado: 'BAJA' as const,
      fecha_baja: '2026-05-01',
      comision_desde: '2026-05-01',
    };
    const hist = {
      id: 'h',
      poliza_id: 'p1',
      datos_anteriores: row,
      datos_nuevos: despues,
      created_at: '2026-05-01T12:00:00Z',
      completo: true,
    };
    const { client, h } = mockSupabase(
      [{ data: [despues], error: null }],
      [
        {
          data: Array.from({ length: 1000 }, (_, i) => ({
            ...hist,
            id: `h${i}`,
          })),
          error: null,
        },
        { data: [{ ...hist, id: 'h1000' }], error: null },
      ]
    );
    const result = await fetchComisionMensual(client, now);
    expect(result.serie.find((p) => p.mes === '2026-04')?.comision).toBe(14);
    expect(result.resumen.comisionActual).toBe(0);
    expect(h.range.mock.calls).toEqual([
      [0, 999],
      [1000, 1999],
    ]);
    expect(h.lte).toHaveBeenCalledWith('created_at', now.toISOString());
  });
  it('no devuelve un cálculo parcial cuando falla una página de pólizas', async () => {
    const { client } = mockSupabase([
      { data: Array.from({ length: 1000 }, () => row), error: null },
      { data: null, error: new Error('página fallida') },
    ]);
    await expect(fetchComisionMensual(client, now)).rejects.toThrow(
      'página fallida'
    );
  });
  it('no presenta un histórico completo si falla la consulta del historial', async () => {
    const { client } = mockSupabase(
      [{ data: [row], error: null }],
      [{ data: null, error: new Error('historial fallido') }]
    );
    await expect(fetchComisionMensual(client, now)).rejects.toThrow(
      'historial fallido'
    );
  });
});

it('devuelve los datos para identificar y editar exactamente las pólizas pendientes del indicador', async () => {
  const { client } = mockSupabase([
    {
      data: [
        {
          ...row,
          id: 'pendiente',
          prima: 0,
          cliente: { nombre: 'Ana', apellido: 'Prueba' },
          compania: { nombre: 'Sancor', color: '#800020' },
          detalle: 'Auto de prueba',
        },
        row,
        { ...row, id: 'inactiva', estado: 'BAJA', prima: 0 },
      ],
      error: null,
    },
  ]);
  const result = await fetchComisionMensual(client, now);
  expect(result.pendientes).toEqual([
    {
      polizaId: 'pendiente',
      motivo: 'PREMIO',
      cliente: { nombre: 'Ana', apellido: 'Prueba' },
      compania: { nombre: 'Sancor', color: '#800020' },
      detalle: 'Auto de prueba',
    },
  ]);
  expect(result.pendientes.length).toBe(result.resumen.sinDatos);
});
