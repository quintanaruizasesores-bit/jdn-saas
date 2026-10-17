import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
vi.mock('./actividad.service', () => ({ logActividad: vi.fn() }));
import { darBajaPoliza, renovarPoliza, updatePoliza } from './polizas.service';

function mockClient() {
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
    const { client, q } = mockClient();
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
    const { client, q } = mockClient();
    await darBajaPoliza(client, 'p1', '2026-06-12');
    expect(q.update).toHaveBeenCalledWith({
      estado: 'BAJA',
      fecha_baja: '2026-06-12',
      comision_desde: '2026-06-12',
    });
  });
  it('normaliza fechas vacías sin tocar claves ausentes en un cambio parcial', async () => {
    const { client, q } = mockClient();
    await updatePoliza(client, 'p1', { fecha_baja: '', comision_desde: '' });
    expect(q.update).toHaveBeenCalledWith({
      fecha_baja: null,
      comision_desde: null,
    });
  });
});
