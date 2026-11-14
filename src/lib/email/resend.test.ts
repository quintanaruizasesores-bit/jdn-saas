// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EmailSendError, emailConfigurado, sendEmail } from './resend';

const base = {
  to: 'dest@correo.com',
  subject: 'Asunto',
  html: '<p>hola</p>',
  text: 'hola',
};

describe('sendEmail', () => {
  beforeEach(() => {
    process.env.RESEND_API_KEY = 're_test';
    process.env.RESEND_FROM = 'Quintana Ruiz <avisos@correo.com>';
  });
  afterEach(() => {
    delete process.env.RESEND_API_KEY;
    delete process.env.RESEND_FROM;
    vi.restoreAllMocks();
  });

  it('emailConfigurado refleja las variables de entorno', () => {
    expect(emailConfigurado()).toBe(true);
    delete process.env.RESEND_API_KEY;
    expect(emailConfigurado()).toBe(false);
  });

  it('envía con Authorization, idempotency-key y devuelve el id', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ id: 'resend-123' }), { status: 200 })
      );
    const r = await sendEmail(
      { ...base, idempotencyKey: 'resumen-w1-2026-11-10' },
      fetchMock as unknown as typeof fetch
    );
    expect(r.id).toBe('resend-123');
    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers.Authorization).toBe('Bearer re_test');
    expect(init.headers['Idempotency-Key']).toBe('resumen-w1-2026-11-10');
    expect(JSON.parse(init.body).from).toContain('avisos@correo.com');
  });

  it('marca 5xx y 429 como transitorios', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response('boom', { status: 503 }));
    await expect(
      sendEmail(base, fetchMock as unknown as typeof fetch)
    ).rejects.toMatchObject({ transient: true, status: 503 });
  });

  it('marca 422 como no transitorio', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response('invalid', { status: 422 }));
    await expect(
      sendEmail(base, fetchMock as unknown as typeof fetch)
    ).rejects.toMatchObject({ transient: false, status: 422 });
  });

  it('un fallo de red es transitorio', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('ECONNRESET'));
    await expect(
      sendEmail(base, fetchMock as unknown as typeof fetch)
    ).rejects.toMatchObject({ transient: true });
  });

  it('falla claro si no está configurado', async () => {
    delete process.env.RESEND_API_KEY;
    const fetchMock = vi.fn();
    await expect(
      sendEmail(base, fetchMock as unknown as typeof fetch)
    ).rejects.toBeInstanceOf(EmailSendError);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
