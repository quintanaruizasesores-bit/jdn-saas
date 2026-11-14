import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import type { EmailNotifPrefs } from '@/validations/notificaciones.schema';

const fetchEmailPrefs = vi.fn();
const saveEmailPrefs = vi.fn().mockResolvedValue(undefined);
vi.mock('@/services/notificaciones.service', () => ({
  fetchEmailPrefs: () => fetchEmailPrefs(),
  saveEmailPrefs: (_c: unknown, prefs: EmailNotifPrefs) =>
    saveEmailPrefs(prefs),
}));
vi.mock('@/lib/supabase/client', () => ({ createClient: () => ({}) }));
vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({
    user: { email: 'cuenta@correo.com' },
    profile: null,
    loading: false,
  }),
}));

import { EmailNotificationsEditor } from './email-notifications-editor';

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const desactivado: EmailNotifPrefs = {
  activo: false,
  destinatario: null,
  hora_local: 8,
  zona_horaria: 'America/Argentina/Buenos_Aires',
};

describe('EmailNotificationsEditor', () => {
  it('arranca desactivado y con el botón de prueba deshabilitado sin destino', async () => {
    fetchEmailPrefs.mockResolvedValue(desactivado);
    render(<EmailNotificationsEditor />, { wrapper });

    const check = await screen.findByLabelText(
      'Activar recordatorios por email'
    );
    expect(check).toHaveAttribute('aria-checked', 'false');
    expect(
      screen.getByRole('button', { name: 'Enviar correo de prueba' })
    ).toBeDisabled();
  });

  it('no guarda y avisa si se activa sin correo de destino', async () => {
    fetchEmailPrefs.mockResolvedValue(desactivado);
    render(<EmailNotificationsEditor />, { wrapper });

    const check = await screen.findByLabelText(
      'Activar recordatorios por email'
    );
    fireEvent.click(check); // activa (queda sucio)
    fireEvent.click(
      screen.getByRole('button', { name: 'Guardar preferencias' })
    );

    await waitFor(() => expect(fetchEmailPrefs).toHaveBeenCalled());
    expect(saveEmailPrefs).not.toHaveBeenCalled();
  });

  it('guarda las preferencias válidas', async () => {
    fetchEmailPrefs.mockResolvedValue({
      ...desactivado,
      destinatario: 'avisos@correo.com',
    });
    render(<EmailNotificationsEditor />, { wrapper });

    const check = await screen.findByLabelText(
      'Activar recordatorios por email'
    );
    fireEvent.click(check); // activa -> dirty, y ya hay destinatario cargado

    fireEvent.click(
      screen.getByRole('button', { name: 'Guardar preferencias' })
    );

    await waitFor(() => expect(saveEmailPrefs).toHaveBeenCalledTimes(1));
    expect(saveEmailPrefs).toHaveBeenCalledWith(
      expect.objectContaining({
        activo: true,
        destinatario: 'avisos@correo.com',
      })
    );
  });

  it('envía el correo de prueba al destino guardado', async () => {
    fetchEmailPrefs.mockResolvedValue({
      ...desactivado,
      activo: true,
      destinatario: 'avisos@correo.com',
    });
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ ok: true, destinatario: 'avisos@correo.com' }),
        {
          status: 200,
        }
      )
    );
    vi.stubGlobal('fetch', fetchMock);

    render(<EmailNotificationsEditor />, { wrapper });
    const boton = await screen.findByRole('button', {
      name: 'Enviar correo de prueba',
    });
    await waitFor(() => expect(boton).not.toBeDisabled());
    fireEvent.click(boton);

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith('/api/notificaciones/prueba', {
        method: 'POST',
      })
    );
    vi.unstubAllGlobals();
  });
});
