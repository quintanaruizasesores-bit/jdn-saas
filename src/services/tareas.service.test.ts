import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { fetchTareas } from './tareas.service';

function mockClient() {
  const query = {
    select: vi.fn(),
    order: vi.fn(),
    eq: vi.fn(),
  };
  query.select.mockReturnValue(query);
  query.order.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  const client = {
    from: vi.fn().mockReturnValue(query),
  } as unknown as SupabaseClient;
  return { client, query };
}

describe('fetchTareas', () => {
  it('filtra por poliza_id cuando se provee', () => {
    const { client, query } = mockClient();
    fetchTareas(client, { poliza_id: 'p1' });
    expect(query.eq).toHaveBeenCalledWith('poliza_id', 'p1');
    expect(query.eq).not.toHaveBeenCalledWith('siniestro_id', expect.anything());
  });

  it('filtra por siniestro_id cuando se provee', () => {
    const { client, query } = mockClient();
    fetchTareas(client, { siniestro_id: 's1' });
    expect(query.eq).toHaveBeenCalledWith('siniestro_id', 's1');
  });

  it('combina cliente_id y estado con los nuevos filtros', () => {
    const { client, query } = mockClient();
    fetchTareas(client, { cliente_id: 'c1', estado: 'PENDIENTE', poliza_id: 'p1' });
    expect(query.eq).toHaveBeenCalledWith('cliente_id', 'c1');
    expect(query.eq).toHaveBeenCalledWith('estado', 'PENDIENTE');
    expect(query.eq).toHaveBeenCalledWith('poliza_id', 'p1');
  });

  it('no aplica filtros opcionales cuando no se proveen', () => {
    const { client, query } = mockClient();
    fetchTareas(client);
    expect(query.eq).not.toHaveBeenCalled();
  });
});
