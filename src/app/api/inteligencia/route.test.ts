// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
const m = vi.hoisted(() => ({
  user: { id: 'u1' } as { id: string } | null,
  cargar: vi.fn(),
  client: { auth: { getUser: vi.fn() } },
}));
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => m.client,
}));
vi.mock('@/services/inteligencia.service', () => ({
  cargarInteligencia: m.cargar,
}));
import { GET } from './route';
beforeEach(() => {
  m.user = { id: 'u1' };
  m.client.auth.getUser.mockImplementation(async () => ({
    data: { user: m.user },
  }));
  m.cargar.mockReset();
  m.cargar.mockResolvedValue({
    clientes: [],
    polizas: [],
    historial: [],
    companias: [],
    ramos: [],
  });
});
const request = (query = 'desde=2026-01-01&hasta=2026-01-31') =>
  new NextRequest(`http://localhost/api/inteligencia?${query}`);
describe('endpoint analítico con RLS de la sesión', () => {
  it('no lee la cartera para usuarios sin sesión', async () => {
    m.user = null;
    expect((await GET(request())).status).toBe(401);
    expect(m.cargar).not.toHaveBeenCalled();
  });
  it('valida filtros antes de consultar datos', async () => {
    for (const query of [
      'desde=2026-02-30&hasta=2026-03-01',
      'desde=2026-01-01&hasta=2026-01-31&estado=OTRO',
      'desde=2026-01-01&hasta=2026-01-31&compania=arbitraria',
    ])
      expect((await GET(request(query))).status).toBe(400);
    expect(m.cargar).not.toHaveBeenCalled();
  });
  it('acepta rangos históricos de varios años dentro del límite documentado', async () => {
    expect(
      (await GET(request('desde=2022-01-01&hasta=2026-10-17'))).status
    ).toBe(200);
    expect(m.cargar).toHaveBeenCalledTimes(1);
  });
  it('usa el cliente de la sesión, no cachea y no devuelve una cartera falsa si falla la lectura', async () => {
    const response = await GET(request());
    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
    expect(m.cargar).toHaveBeenCalledWith(m.client);
    expect((await response.json()).metricas.asegurados).toBe(0);
    m.cargar.mockRejectedValue(new Error('RLS / conexión'));
    expect((await GET(request())).status).toBe(503);
  });
});
