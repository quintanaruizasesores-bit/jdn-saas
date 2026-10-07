import { describe, it, expect, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { fetchClientesConCumple } from './cumpleanos.service';

/** Stub encadenable de Supabase (mismo patrón que clientes.service.test). */
function makeSupabaseStub(resolved: { data: unknown; error: unknown }) {
  const calls = {
    from: null as string | null,
    select: null as string | null,
    is: [] as [string, unknown][],
    not: [] as [string, string, unknown][],
    order: [] as string[],
  };
  const builder: Record<string, unknown> = {
    select: vi.fn((cols: string) => {
      calls.select = cols;
      return builder;
    }),
    is: vi.fn((col: string, val: unknown) => {
      calls.is.push([col, val]);
      return builder;
    }),
    not: vi.fn((col: string, op: string, val: unknown) => {
      calls.not.push([col, op, val]);
      return builder;
    }),
    order: vi.fn((col: string) => {
      calls.order.push(col);
      return builder;
    }),
    then: (resolve: (v: unknown) => unknown) => resolve(resolved),
  };
  const supabase = {
    from: vi.fn((t: string) => {
      calls.from = t;
      return builder;
    }),
  } as unknown as SupabaseClient;
  return { supabase, calls };
}

describe('fetchClientesConCumple', () => {
  it('filtra activos con fecha de nacimiento y ordena por nombre', async () => {
    const { supabase, calls } = makeSupabaseStub({ data: [{ id: 'a' }], error: null });
    const result = await fetchClientesConCumple(supabase);

    expect(calls.from).toBe('clientes');
    expect(calls.is).toContainEqual(['deleted_at', null]);
    expect(calls.not).toContainEqual(['fecha_nacimiento', 'is', null]);
    expect(calls.order).toEqual(['apellido', 'nombre']);
    expect(result).toEqual([{ id: 'a' }]);
  });

  it('propaga el error', async () => {
    const { supabase } = makeSupabaseStub({ data: null, error: new Error('boom') });
    await expect(fetchClientesConCumple(supabase)).rejects.toThrow('boom');
  });
});
