// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { recoverAction, restablecerContrasenaAction } from './actions';

const auth = vi.hoisted(() => ({
  getUser: vi.fn(),
  resetPasswordForEmail: vi.fn(),
  updateUser: vi.fn(),
  signOut: vi.fn(),
}));
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ auth }),
}));
vi.mock('next/navigation', () => ({
  redirect: (path: string) => {
    throw new Error(path);
  },
}));

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://app.test/');
  auth.getUser.mockResolvedValue({ data: { user: { id: 'cuenta-prueba' } } });
  auth.updateUser.mockResolvedValue({ error: null });
  auth.signOut.mockResolvedValue({ error: null });
});

afterEach(() => vi.unstubAllEnvs());

describe('recuperación de contraseña', () => {
  it('solicita el correo con la URL exacta del callback', async () => {
    const form = new FormData();
    form.set('email', 'prueba@example.test');
    auth.resetPasswordForEmail.mockResolvedValue({ error: null });
    await expect(recoverAction({}, form)).resolves.toEqual({ success: true });
    expect(auth.resetPasswordForEmail).toHaveBeenCalledWith(
      'prueba@example.test',
      {
        redirectTo: 'https://app.test/auth/callback?type=recovery',
      }
    );
  });

  it('rechaza contraseñas distintas sin consultar Supabase', async () => {
    const form = new FormData();
    form.set('password', 'prueba123');
    form.set('confirmPassword', 'distinta123');
    await expect(
      restablecerContrasenaAction('cuenta-prueba', { error: '' }, form)
    ).resolves.toEqual({
      error: 'Las contraseñas no coinciden',
    });
    expect(auth.updateUser).not.toHaveBeenCalled();
  });

  it('no cambia la contraseña si la sesión pertenece a otra cuenta', async () => {
    const form = new FormData();
    form.set('password', 'prueba123');
    form.set('confirmPassword', 'prueba123');
    await expect(
      restablecerContrasenaAction('otra-cuenta', { error: '' }, form)
    ).rejects.toThrow('/recuperar?error=enlace');
    expect(auth.updateUser).not.toHaveBeenCalled();
  });

  it('guarda la contraseña con Supabase y vuelve al inicio de sesión', async () => {
    const form = new FormData();
    form.set('password', 'prueba123');
    form.set('confirmPassword', 'prueba123');
    await expect(
      restablecerContrasenaAction('cuenta-prueba', { error: '' }, form)
    ).rejects.toThrow('/login?estado=contrasena-actualizada');
    expect(auth.updateUser).toHaveBeenCalledWith({ password: 'prueba123' });
    expect(auth.signOut).toHaveBeenCalledOnce();
  });
});
