// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const sendEmailMock = vi.fn();
const emailConfiguradoMock = vi.fn(() => true);
vi.mock('@/lib/email/resend', () => ({
  sendEmail: (...a: unknown[]) => sendEmailMock(...a),
  emailConfigurado: () => emailConfiguradoMock(),
}));

const createClientMock = vi.fn();
vi.mock('@/lib/supabase/server', () => ({
  createClient: () => createClientMock(),
}));

import { POST } from './route';

interface Scenario {
  user?: { id: string } | null;
  prefsRow?: Record<string, unknown> | null;
  rateCount?: number;
  insertId?: string | null;
}

function supabaseMock(s: Scenario) {
  const update = vi.fn().mockReturnValue({
    eq: vi.fn().mockResolvedValue({ error: null }),
  });
  const from = vi.fn((table: string) => {
    if (table === 'notificacion_email_prefs') {
      return {
        select: vi.fn().mockReturnValue({
          maybeSingle: vi
            .fn()
            .mockResolvedValue({ data: s.prefsRow ?? null, error: null }),
        }),
      };
    }
    // notificacion_email_envios
    return {
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          gte: vi
            .fn()
            .mockResolvedValue({ count: s.rateCount ?? 0, error: null }),
        }),
      }),
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: s.insertId === null ? null : { id: s.insertId ?? 'envio-1' },
            error: s.insertId === null ? { message: 'x' } : null,
          }),
        }),
      }),
      update,
    };
  });
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: 'user' in s ? s.user : { id: 'u1' } },
      }),
    },
    from,
    __update: update,
  };
}

describe('POST /api/notificaciones/prueba', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://app.example.com';
    emailConfiguradoMock.mockReturnValue(true);
    sendEmailMock.mockResolvedValue({ id: 'resend-1' });
  });
  afterEach(() => vi.clearAllMocks());

  it('401 sin sesión', async () => {
    createClientMock.mockResolvedValue(supabaseMock({ user: null }));
    const r = await POST();
    expect(r.status).toBe(401);
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it('503 si el correo no está configurado', async () => {
    emailConfiguradoMock.mockReturnValue(false);
    createClientMock.mockResolvedValue(supabaseMock({}));
    const r = await POST();
    expect(r.status).toBe(503);
  });

  it('400 si no hay destino guardado', async () => {
    createClientMock.mockResolvedValue(
      supabaseMock({ prefsRow: { workspace_id: 'w1', destinatario: null } })
    );
    const r = await POST();
    expect(r.status).toBe(400);
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it('429 si ya se envió una prueba hace menos de un minuto', async () => {
    createClientMock.mockResolvedValue(
      supabaseMock({
        prefsRow: { workspace_id: 'w1', destinatario: 'a@b.com' },
        rateCount: 1,
      })
    );
    const r = await POST();
    expect(r.status).toBe(429);
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it('envía al destino guardado y marca ENVIADO', async () => {
    const sb = supabaseMock({
      prefsRow: {
        workspace_id: 'w1',
        destinatario: 'a@b.com',
        zona_horaria: 'America/Argentina/Buenos_Aires',
      },
      insertId: 'envio-9',
    });
    createClientMock.mockResolvedValue(sb);
    const r = await POST();
    expect(r.status).toBe(200);
    const body = await r.json();
    expect(body).toEqual({ ok: true, destinatario: 'a@b.com' });
    expect(sendEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'a@b.com',
        idempotencyKey: 'prueba-envio-9',
      })
    );
    expect(sb.__update).toHaveBeenCalledWith(
      expect.objectContaining({ estado: 'ENVIADO', provider_id: 'resend-1' })
    );
  });

  it('502 y marca ERROR si Resend falla', async () => {
    const sb = supabaseMock({
      prefsRow: { workspace_id: 'w1', destinatario: 'a@b.com' },
      insertId: 'envio-9',
    });
    createClientMock.mockResolvedValue(sb);
    sendEmailMock.mockRejectedValue(new Error('Resend 422'));
    const r = await POST();
    expect(r.status).toBe(502);
    expect(sb.__update).toHaveBeenCalledWith(
      expect.objectContaining({ estado: 'ERROR' })
    );
  });
});
