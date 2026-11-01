import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { fetchTareasAlertas } from './tareas-alertas.service';

describe('fetchTareasAlertas', () => {
  it('consulta solo pendientes con vencimiento hasta el límite y cuenta todos', async () => {
    const query = {
      select: vi.fn(),
      eq: vi.fn(),
      lte: vi.fn(),
      order: vi.fn(),
      limit: vi.fn(),
    };
    query.select.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    query.lte.mockReturnValue(query);
    query.order.mockReturnValue(query);
    query.limit.mockResolvedValue({
      data: [{ id: 't1', titulo: 'Llamar', fecha_vencimiento: '2026-11-01' }],
      count: 12,
      error: null,
    });
    const client = {
      from: vi.fn().mockReturnValue(query),
    } as unknown as SupabaseClient;

    await expect(fetchTareasAlertas(client, '2026-11-08')).resolves.toEqual({
      count: 12,
      items: [{ id: 't1', titulo: 'Llamar', fecha_vencimiento: '2026-11-01' }],
    });
    expect(client.from).toHaveBeenCalledWith('tareas');
    expect(query.select).toHaveBeenCalledWith('id, titulo, fecha_vencimiento', {
      count: 'exact',
    });
    expect(query.eq).toHaveBeenCalledWith('estado', 'PENDIENTE');
    expect(query.lte).toHaveBeenCalledWith('fecha_vencimiento', '2026-11-08');
    expect(query.limit).toHaveBeenCalledWith(5);
  });
});
