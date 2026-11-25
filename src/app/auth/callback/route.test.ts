// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET } from './route';

const { exchangeCodeForSession } = vi.hoisted(() => ({
  exchangeCodeForSession: vi.fn(),
}));
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ auth: { exchangeCodeForSession } }),
}));

beforeEach(() => {
  exchangeCodeForSession.mockReset();
  exchangeCodeForSession.mockResolvedValue({ error: null });
});

describe('callback de Supabase', () => {
  it('canjea el código de recuperación y abre el formulario de contraseña', async () => {
    const response = await GET(
      new Request('https://app.test/auth/callback?type=recovery&code=test')
    );
    expect(exchangeCodeForSession).toHaveBeenCalledWith('test');
    expect(response.headers.get('location')).toBe(
      'https://app.test/recuperar/nueva-contrasena'
    );
  });

  it('permite pedir otro enlace si el código no se puede canjear', async () => {
    exchangeCodeForSession.mockResolvedValue({
      error: { code: 'flow_state_expired' },
    });
    const response = await GET(
      new Request('https://app.test/auth/callback?type=recovery&code=test')
    );
    expect(response.headers.get('location')).toBe(
      'https://app.test/recuperar?error=enlace'
    );
  });

  it('conserva el destino habitual para otros callbacks de autenticación', async () => {
    const response = await GET(
      new Request('https://app.test/auth/callback?code=test')
    );
    expect(response.headers.get('location')).toBe('https://app.test/dashboard');
  });
});
