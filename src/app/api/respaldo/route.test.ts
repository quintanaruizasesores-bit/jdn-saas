// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
const mocks = vi.hoisted(() => ({
  user: { id: 'u1' } as { id: string } | null,
  role: 'ADMIN',
  rpc: vi.fn(),
  service: vi.fn(),
}));
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: mocks.user } }) },
    from: () => ({
      select: () => ({
        eq: () => ({
          single: async () => ({ data: { role: mocks.role }, error: null }),
        }),
      }),
    }),
  }),
  createServiceClient: async () => {
    mocks.service();
    return { rpc: mocks.rpc };
  },
}));
import { GET } from './route';
const req = () => new NextRequest('http://localhost/api/respaldo');
beforeEach(() => {
  vi.stubEnv('BACKUP_ADMIN_USER_IDS', 'u1');
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'solo-prueba');
  mocks.user = { id: 'u1' };
  mocks.role = 'ADMIN';
  mocks.service.mockClear();
  mocks.rpc.mockReset();
});
describe('endpoint de copia integral', () => {
  it('rechaza anónimos, roles ajenos y ADMIN sin habilitación antes de usar service_role', async () => {
    mocks.user = null;
    expect((await GET(req())).status).toBe(401);
    mocks.user = { id: 'u1' };
    mocks.role = 'OPERADOR';
    expect((await GET(req())).status).toBe(403);
    mocks.role = 'ADMIN';
    vi.stubEnv('BACKUP_ADMIN_USER_IDS', 'otro');
    expect((await GET(req())).status).toBe(403);
    expect(mocks.service).not.toHaveBeenCalled();
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
  it('entrega un archivo completo únicamente al administrador habilitado', async () => {
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
