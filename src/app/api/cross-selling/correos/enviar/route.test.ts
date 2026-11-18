// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const sendEmailMock = vi.fn();
const emailConfiguradoMock = vi.fn(() => true);
vi.mock('@/lib/email/resend', () => ({
  sendEmail: (...a: unknown[]) => sendEmailMock(...a),
  emailConfigurado: () => emailConfiguradoMock(),
}));

const emailSuprimidoMock = vi.fn(async () => false);
const contarEnviosPreviosMock = vi.fn(async () => 0);
vi.mock('@/services/crosssell.service', () => ({
  CORREO_TABLE: 'crosssell_correo',
  emailSuprimido: (...a: unknown[]) => emailSuprimidoMock(...(a as [])),
  contarEnviosPrevios: (...a: unknown[]) => contarEnviosPreviosMock(...(a as [])),
  logCrossSellEvento: vi.fn(async () => ({ error: null })),
}));

const createClientMock = vi.fn();
vi.mock('@/lib/supabase/server', () => ({
  createClient: () => createClientMock(),
}));

import { POST } from './route';

const CORREO_ID = '11111111-1111-4111-8111-111111111111';
const CORREO = {
  id: CORREO_ID,
  workspace_id: 'ws-1',
  cliente_id: 'cli-1',
  oportunidad_id: 'op-1',
  categoria_objetivo_id: 'cat-1',
  estado: 'BORRADOR',
  asunto: 'Hola Juan',
  cuerpo_text: 'Mensaje de prueba',
  destinatario_email: 'cli@example.com',
};

interface Scenario {
  user?: { id: string } | null;
  correo?: Record<string, unknown> | null;
  claimId?: string | null;
}

function supabaseMock(s: Scenario) {
  const update = vi.fn().mockReturnValue({
    eq: vi.fn().mockReturnValue({
      in: vi.fn().mockResolvedValue({ error: null }),
    }),
  });
  const from = vi.fn((table: string) => {
    if (table === 'clientes') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi
              .fn()
              .mockResolvedValue({ data: { nombre: 'Juan', apellido: 'Pérez' } }),
          }),
        }),
      };
    }
    // crosssell_correo / crosssell_oportunidad
    return {
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi
            .fn()
            .mockResolvedValue({
              data: 'correo' in s ? s.correo : CORREO,
              error: null,
            }),
        }),
      }),
      update,
    };
  });
  return {
    auth: {
      getUser: vi
        .fn()
        .mockResolvedValue({ data: { user: 'user' in s ? s.user : { id: 'u1' } } }),
    },
    from,
    rpc: vi
      .fn()
      .mockResolvedValue({
        data: 'claimId' in s ? s.claimId : 'correo-1',
        error: null,
      }),
    __update: update,
  };
}

function req(body: Record<string, unknown>) {
  return new Request('http://localhost/api/cross-selling/correos/enviar', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }) as any;
}

beforeEach(() => {
  vi.clearAllMocks();
  emailConfiguradoMock.mockReturnValue(true);
  emailSuprimidoMock.mockResolvedValue(false);
  contarEnviosPreviosMock.mockResolvedValue(0);
  sendEmailMock.mockResolvedValue({ id: 'resend-1' });
  process.env.NEXT_PUBLIC_SITE_URL = 'https://app.test';
  process.env.CROSSSELL_UNSUBSCRIBE_SECRET = 'test-secret';
});

describe('POST /api/cross-selling/correos/enviar', () => {
  it('401 sin sesión', async () => {
    createClientMock.mockResolvedValue(supabaseMock({ user: null }));
    const res = await POST(req({ correo_id: '11111111-1111-4111-8111-111111111111' }));
    expect(res.status).toBe(401);
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it('bloquea a destinatarios suprimidos', async () => {
    emailSuprimidoMock.mockResolvedValue(true);
    createClientMock.mockResolvedValue(supabaseMock({}));
    const res = await POST(req({ correo_id: CORREO.id }));
    expect(res.status).toBe(409);
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it('pide confirmación si ya se contactó esa cobertura', async () => {
    contarEnviosPreviosMock.mockResolvedValue(1);
    createClientMock.mockResolvedValue(supabaseMock({}));
    const res = await POST(req({ correo_id: CORREO.id }));
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.needsConfirm).toBe(true);
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it('envía un único correo en el caso feliz', async () => {
    createClientMock.mockResolvedValue(supabaseMock({}));
    const res = await POST(req({ correo_id: CORREO.id }));
    expect(res.status).toBe(200);
    expect(sendEmailMock).toHaveBeenCalledTimes(1);
    const arg = sendEmailMock.mock.calls[0][0];
    expect(arg.to).toBe('cli@example.com');
    expect(arg.idempotencyKey).toBe(`crosssell-correo-${CORREO_ID}`);
    expect(arg.headers['List-Unsubscribe']).toContain('/api/cross-selling/baja');
  });

  it('no reenvía si el claim no se obtiene', async () => {
    createClientMock.mockResolvedValue(supabaseMock({ claimId: null }));
    const res = await POST(req({ correo_id: CORREO.id, confirmar_reenvio: true }));
    expect(res.status).toBe(409);
    expect(sendEmailMock).not.toHaveBeenCalled();
  });
});
