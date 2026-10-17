// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
const state = vi.hoisted(() => ({ user: null as { id: string } | null }));
vi.mock('@supabase/ssr', () => ({
  createServerClient: () => ({
    auth: { getUser: async () => ({ data: { user: state.user } }) },
  }),
}));
import { updateSession } from './middleware';
beforeEach(() => {
  state.user = null;
});
describe('sesión de APIs y páginas', () => {
  it('una API sin sesión recibe JSON privado 401, nunca HTML de login como archivo', async () => {
    const r = await updateSession(
      new NextRequest('http://localhost/api/respaldo')
    );
    expect(r.status).toBe(401);
    expect(r.headers.get('Content-Type')).toContain('application/json');
    expect(r.headers.get('Cache-Control')).toBe('private, no-store');
    expect(r.headers.get('Location')).toBeNull();
  });
  it('mantiene la navegación al login en páginas privadas', async () => {
    const r = await updateSession(new NextRequest('http://localhost/reportes'));
    expect(r.status).toBe(307);
    expect(r.headers.get('Location')).toContain('/login?redirect=%2Freportes');
  });
  it('permite continuar una API autenticada usando la sesión existente', async () => {
    state.user = { id: 'prueba' };
    const r = await updateSession(
      new NextRequest('http://localhost/api/inteligencia')
    );
    expect(r.headers.get('x-middleware-next')).toBe('1');
  });
});
