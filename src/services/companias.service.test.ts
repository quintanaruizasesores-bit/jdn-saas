import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { fetchTodasCompanias } from './companias.service';

describe('fetchTodasCompanias', () => {
  it('recorre todas las páginas sin recortar el catálogo', async () => {
    const range = vi
      .fn()
      .mockResolvedValueOnce({
        data: Array.from({ length: 1000 }, (_, i) => ({
          id: `c${i}`,
          nombre: `Compañía ${i}`,
          color: null,
        })),
        count: 1001,
        error: null,
      })
      .mockResolvedValueOnce({
        data: [{ id: 'sancor', nombre: 'SANCOR', color: '#881337' }],
        count: 1001,
        error: null,
      });
    const query = { select: vi.fn(), order: vi.fn(), range };
    query.select.mockReturnValue(query);
    query.order.mockReturnValue(query);
    const client = {
      from: vi.fn().mockReturnValue(query),
    } as unknown as SupabaseClient;

    const result = await fetchTodasCompanias(client);

    expect(result).toHaveLength(1001);
    expect(result.at(-1)?.id).toBe('sancor');
    expect(range).toHaveBeenNthCalledWith(1, 0, 999);
    expect(range).toHaveBeenNthCalledWith(2, 1000, 1999);
  });

  it('continúa cuando el servidor aplica un límite menor al solicitado', async () => {
    const range = vi
      .fn()
      .mockResolvedValueOnce({
        data: Array.from({ length: 100 }, (_, i) => ({
          id: `c${i}`,
          nombre: `Compañía ${i}`,
          color: null,
        })),
        count: 101,
        error: null,
      })
      .mockResolvedValueOnce({
        data: [{ id: 'sancor', nombre: 'SANCOR', color: null }],
        count: 101,
        error: null,
      });
    const query = { select: vi.fn(), order: vi.fn(), range };
    query.select.mockReturnValue(query);
    query.order.mockReturnValue(query);
    const client = {
      from: vi.fn().mockReturnValue(query),
    } as unknown as SupabaseClient;

    const result = await fetchTodasCompanias(client);

    expect(result).toHaveLength(101);
    expect(range).toHaveBeenNthCalledWith(2, 100, 1099);
  });
});
