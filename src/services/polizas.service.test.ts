import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
vi.mock('./actividad.service', () => ({ logActividad: vi.fn() }));
import {
  darBajaPoliza,
  fetchPolizas,
  renovarPoliza,
  updatePoliza,
} from './polizas.service';

function makeSupabase(
  rows: { id: string; detalle: string; created_at: string }[]
) {
  const calls = { exactas: 0, aproximadas: 0 };
  const supabase = {
    from: vi.fn((table: string) => {
      expect(table).toBe('polizas');
      let mode: 'exactas' | 'aproximadas' = 'exactas';
      const builder = {
        select: vi.fn(() => builder),
        order: vi.fn(() => builder),
        eq: vi.fn(() => builder),
        gt: vi.fn(() => builder),
        ilike: vi.fn(() => {
          mode = 'exactas';
          calls.exactas++;
          return builder;
        }),
        or: vi.fn(() => {
          mode = 'aproximadas';
          calls.aproximadas++;
          return builder;
        }),
        range: vi.fn((from: number, to: number) =>
          Promise.resolve({
            data: rows
              .filter((row) =>
                mode === 'exactas'
                  ? /ABC.*123/i.test(row.detalle)
                  : /ABC|123/i.test(row.detalle)
              )
              .slice(from, to + 1),
            error: null,
          })
        ),
        in: vi.fn((_col: string, ids: string[]) =>
          Promise.resolve({
            data: rows.filter((row) => ids.includes(row.id)),
            error: null,
            status: 200,
            statusText: 'OK',
          })
        ),
      };
      return builder;
    }),
  } as unknown as SupabaseClient;
  return { supabase, calls };
}

describe('fetchPolizas por patente', () => {
  it('devuelve sólo la patente exacta aunque el detalle contenga otros fragmentos', async () => {
    const { supabase, calls } = makeSupabase([
      { id: 'otra', detalle: 'Auto ABC1234', created_at: '2026-03-01' },
      { id: 'exacta', detalle: 'Auto ABC-123', created_at: '2026-01-01' },
    ]);
    const result = await fetchPolizas(supabase, { search: 'abc123' });
    expect(result.data?.map((row) => row.id)).toEqual(['exacta']);
    expect(result.count).toBe(1);
    expect(calls.aproximadas).toBe(0);
  });

  it('ofrece una variante de un carácter sólo si no hay patente exacta', async () => {
    const { supabase } = makeSupabase([
      { id: 'distante', detalle: 'Auto XYZ123', created_at: '2026-03-01' },
      { id: 'similar', detalle: 'Auto ABD123', created_at: '2026-01-01' },
    ]);
    const result = await fetchPolizas(supabase, { search: 'ABC123' });
    expect(result.data?.map((row) => row.id)).toEqual(['similar']);
    expect(result.count).toBe(1);
    expect('coincidenciaPatente' in result && result.coincidenciaPatente).toBe(
      'similar'
    );
  });

  it('pagina después de descartar coincidencias parciales', async () => {
    const { supabase } = makeSupabase([
      { id: 'no', detalle: 'ABC1234', created_at: '2026-04-01' },
      { id: 'nueva', detalle: 'ABC123', created_at: '2026-03-01' },
      { id: 'vieja', detalle: 'ABC-123', created_at: '2026-01-01' },
    ]);
    const result = await fetchPolizas(supabase, {
      search: 'ABC123',
      page: 1,
      pageSize: 1,
    });
    expect(result.data?.map((row) => row.id)).toEqual(['vieja']);
    expect(result.count).toBe(2);
  });
});

function mockMutationClient() {
  const q = {
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: { id: 'p1' }, error: null }),
  };
  return {
    q,
    client: { from: vi.fn().mockReturnValue(q) } as unknown as SupabaseClient,
  };
}

describe('mutaciones de la cartera recurrente', () => {
  it('una renovación actualiza la misma póliza y registra la fecha efectiva sin crear un duplicado', async () => {
    const { client, q } = mockMutationClient();
    await renovarPoliza(client, 'p1', {
      fecha_inicio: '2026-07-01',
      fecha_fin: '2027-06-30',
      prima: 5000,
    });
    expect(q.eq).toHaveBeenCalledWith('id', 'p1');
    expect(q.update).toHaveBeenCalledWith({
      estado: 'VIGENTE',
      fecha_inicio: '2026-07-01',
      fecha_fin: '2027-06-30',
      prima: 5000,
      fecha_baja: null,
      comision_desde: '2026-07-01',
    });
  });
  it('la baja guarda una fecha efectiva explícita y no sólo el estado actual', async () => {
    const { client, q } = mockMutationClient();
    await darBajaPoliza(client, 'p1', '2026-06-12');
    expect(q.update).toHaveBeenCalledWith({
      estado: 'BAJA',
      fecha_baja: '2026-06-12',
      comision_desde: '2026-06-12',
    });
  });
  it('normaliza fechas vacías sin tocar claves ausentes en un cambio parcial', async () => {
    const { client, q } = mockMutationClient();
    await updatePoliza(client, 'p1', { fecha_baja: '', comision_desde: '' });
    expect(q.update).toHaveBeenCalledWith({
      fecha_baja: null,
      comision_desde: null,
    });
  });
});
