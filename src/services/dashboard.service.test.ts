import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { fetchComisionMensual } from './dashboard.service';

function mockSupabase(
  pages: {
    data: { fecha_inicio: string; prima: number }[] | null;
    error: Error | null;
  }[]
) {
  const query = {
    select: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    range: vi.fn(),
  };
  for (const page of pages) query.range.mockResolvedValueOnce(page);
  const from = vi.fn().mockReturnValue(query);
  return { client: { from } as unknown as SupabaseClient, query, from };
}

describe('fetchComisionMensual', () => {
  const now = new Date('2026-10-17T15:00:00Z');

  it('incluye más de 1000 pólizas sin truncar la comisión y filtra por vigencia', async () => {
    const { client, query, from } = mockSupabase([
      {
        data: Array.from({ length: 1000 }, () => ({
          fecha_inicio: '2026-09-01',
          prima: 100,
        })),
        error: null,
      },
      { data: [{ fecha_inicio: '2026-09-20', prima: 500 }], error: null },
    ]);
    const puntos = await fetchComisionMensual(client, now);
    expect(puntos[0]).toMatchObject({ mes: '2026-09', polizas: 1001 });
    expect(puntos[0].comision).toBeCloseTo(14070);
    expect(from).toHaveBeenCalledWith('polizas');
    expect(query.gte).toHaveBeenCalledWith('fecha_inicio', '2025-11-01');
    expect(query.lte).toHaveBeenCalledWith('fecha_inicio', '2026-10-17');
    expect(query.range.mock.calls).toEqual([
      [0, 999],
      [1000, 1999],
    ]);
  });

  it('propaga errores de páginas posteriores para no presentar totales parciales', async () => {
    const error = new Error('No se pudo cargar la segunda página');
    const { client } = mockSupabase([
      {
        data: Array.from({ length: 1000 }, () => ({
          fecha_inicio: '2026-09-01',
          prima: 100,
        })),
        error: null,
      },
      { data: null, error },
    ]);
    await expect(fetchComisionMensual(client, now)).rejects.toThrow(error);
  });
});
