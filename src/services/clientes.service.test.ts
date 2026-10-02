import { describe, it, expect, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { fetchClientes } from './clientes.service';

/**
 * Stub encadenable de Supabase: cada método devuelve el mismo builder y el
 * objeto es "thenable" para poder hacer `await query`. Registra las llamadas a
 * `.or()`, `.is()`, `.eq()` y `.range()` para poder inspeccionarlas.
 */
function makeSupabaseStub(resolved: { data: unknown; error: unknown; count?: number }) {
  const calls = {
    or: [] as string[],
    is: [] as [string, unknown][],
    eq: [] as [string, unknown][],
    range: null as [number, number] | null,
    order: [] as string[],
  };
  const builder: Record<string, unknown> = {
    select: vi.fn(() => builder),
    is: vi.fn((col: string, val: unknown) => {
      calls.is.push([col, val]);
      return builder;
    }),
    order: vi.fn((col: string) => {
      calls.order.push(col);
      return builder;
    }),
    range: vi.fn((a: number, b: number) => {
      calls.range = [a, b];
      return builder;
    }),
    or: vi.fn((f: string) => {
      calls.or.push(f);
      return builder;
    }),
    eq: vi.fn((col: string, val: unknown) => {
      calls.eq.push([col, val]);
      return builder;
    }),
    then: (resolve: (v: unknown) => unknown) => resolve(resolved),
  };
  const supabase = { from: vi.fn(() => builder) } as unknown as SupabaseClient;
  return { supabase, calls };
}

describe('fetchClientes', () => {
  it('sin search no agrega ningún filtro .or() y filtra deleted_at', async () => {
    const { supabase, calls } = makeSupabaseStub({ data: [], error: null, count: 0 });
    await fetchClientes(supabase, {});
    expect(calls.or).toHaveLength(0);
    expect(calls.is).toContainEqual(['deleted_at', null]);
    expect(calls.range).toEqual([0, 49]);
  });

  it('search de un token encadena un único .or() con todas las columnas', async () => {
    const { supabase, calls } = makeSupabaseStub({ data: [], error: null, count: 0 });
    await fetchClientes(supabase, { search: 'juan' });
    expect(calls.or).toHaveLength(1);
    expect(calls.or[0]).toContain('nombre.ilike.%juan%');
    expect(calls.or[0]).toContain('telefono.ilike.%juan%');
  });

  it('nombre completo encadena un .or() por token (AND)', async () => {
    const { supabase, calls } = makeSupabaseStub({ data: [], error: null, count: 0 });
    await fetchClientes(supabase, { search: 'juan perez' });
    expect(calls.or).toHaveLength(2);
    expect(calls.or[0]).toContain('nombre.ilike.%juan%');
    expect(calls.or[1]).toContain('apellido.ilike.%perez%');
  });

  it('respeta pageSize en el range', async () => {
    const { supabase, calls } = makeSupabaseStub({ data: [], error: null, count: 0 });
    await fetchClientes(supabase, { search: 'x', pageSize: 15 });
    expect(calls.range).toEqual([0, 14]);
  });

  it('propaga data/error del resultado', async () => {
    const err = { message: 'boom' };
    const { supabase } = makeSupabaseStub({ data: null, error: err, count: 0 });
    const res = await fetchClientes(supabase, { search: 'juan' });
    expect(res.error).toBe(err);
    expect(res.data).toBeNull();
  });
});
