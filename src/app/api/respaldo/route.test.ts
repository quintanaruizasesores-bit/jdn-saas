// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
const mocks = vi.hoisted(() => ({
  user: { id: 'u1' } as { id: string } | null,
  rpc: vi.fn(),
}));
// La exportación corre con la sesión del usuario: no hay service_role. La RLS
// por workspace (migración 013) aísla las lecturas; las RPC (SECURITY INVOKER,
// migración 014) solo devuelven la cartera del propio usuario.
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: mocks.user } }) },
    rpc: mocks.rpc,
  }),
}));
import { GET } from './route';
const req = () => new NextRequest('http://localhost/api/respaldo');
beforeEach(() => {
  mocks.user = { id: 'u1' };
  mocks.rpc.mockReset();
});
describe('endpoint de copia integral', () => {
  it('rechaza anónimos sin tocar la base', async () => {
    mocks.user = null;
    expect((await GET(req())).status).toBe(401);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it('no descarga un esquema sin verificar y no cachea errores', async () => {
    mocks.rpc.mockResolvedValue({
      error: { message: 'función ausente' },
      data: null,
    });
    const response = await GET(req());
    expect(response.status).toBe(503);
    expect(response.headers.get('Cache-Control')).toContain('no-store');
  });
  it('entrega un archivo completo a cualquier usuario autenticado (RLS lo aísla)', async () => {
    mocks.rpc.mockResolvedValue({
      error: null,
      data: { tablas: [], relaciones: [] },
    });
    const response = await GET(req());
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Disposition')).toMatch(
      /quintana_ruiz_respaldo_\d{4}-\d{2}-\d{2}.xlsx/
    );
    const buffer = Buffer.from(await response.arrayBuffer());
    expect(buffer.subarray(0, 2).toString()).toBe('PK');
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
  });
});
