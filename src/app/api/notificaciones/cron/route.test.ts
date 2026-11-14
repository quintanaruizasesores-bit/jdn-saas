// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const serviceClient = { from: vi.fn(), rpc: vi.fn() };
vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: vi.fn(async () => serviceClient),
}));

import { GET } from './route';

function req(auth?: string) {
  return new NextRequest('http://localhost/api/notificaciones/cron', {
    headers: auth ? { authorization: auth } : {},
  });
}

describe('GET /api/notificaciones/cron (autorización)', () => {
  beforeEach(() => {
    process.env.RESEND_API_KEY = 're_test';
    process.env.RESEND_FROM = 'Quintana <avisos@correo.com>';
  });
  afterEach(() => {
    delete process.env.CRON_SECRET;
    delete process.env.RESEND_API_KEY;
    delete process.env.RESEND_FROM;
    vi.clearAllMocks();
  });

  it('500 si falta CRON_SECRET', async () => {
    const r = await GET(req('Bearer x'));
    expect(r.status).toBe(500);
  });

  it('401 si el secreto no coincide', async () => {
    process.env.CRON_SECRET = 'supersecreto';
    const r = await GET(req('Bearer incorrecto'));
    expect(r.status).toBe(401);
  });

  it('401 sin header de autorización', async () => {
    process.env.CRON_SECRET = 'supersecreto';
    const r = await GET(req());
    expect(r.status).toBe(401);
  });

  it('503 si el secreto coincide pero el correo no está configurado', async () => {
    process.env.CRON_SECRET = 'supersecreto';
    delete process.env.RESEND_API_KEY;
    const r = await GET(req('Bearer supersecreto'));
    expect(r.status).toBe(503);
  });

  it('procesa (200) cuando el secreto coincide y no hay preferencias activas', async () => {
    process.env.CRON_SECRET = 'supersecreto';
    // listarPrefsActivas: select(...).eq('activo', true) -> { data: [] }
    const builder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: [], error: null }),
    };
    serviceClient.from.mockReturnValue(builder);

    const r = await GET(req('Bearer supersecreto'));
    expect(r.status).toBe(200);
    const body = await r.json();
    expect(body).toMatchObject({ ok: true, procesados: 0, enviados: 0 });
  });
});
