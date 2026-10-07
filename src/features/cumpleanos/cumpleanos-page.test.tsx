import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { getTodayInTimezone } from '@/lib/cumpleanos/fechas';

// Evita cargar el server action (next/headers) desde AppHeader.
vi.mock('@/features/auth/actions', () => ({ logoutAction: vi.fn() }));
vi.mock('@/lib/supabase/client', () => ({ createClient: () => ({}) }));
vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({ user: null, profile: { nombre: 'Gaspar' }, loading: false }),
}));
vi.mock('@/services/cumpleanos.service', () => ({ fetchClientesConCumple: vi.fn() }));
vi.mock('@/services/settings.service', async () => {
  const actual = await vi.importActual<typeof import('@/services/settings.service')>(
    '@/services/settings.service'
  );
  return { ...actual, fetchBirthdaySettings: vi.fn() };
});

import { fetchClientesConCumple } from '@/services/cumpleanos.service';
import { fetchBirthdaySettings } from '@/services/settings.service';
import { DEFAULT_BIRTHDAY_TEMPLATE } from '@/lib/cumpleanos/plantilla';
import { CumpleanosPage } from './cumpleanos-page';

/** Cliente cuyo cumpleaños cae hoy (año de nacimiento fijo en el pasado). */
function clienteHoy() {
  const today = getTodayInTimezone();
  const mm = String(today.month).padStart(2, '0');
  const dd = String(today.day).padStart(2, '0');
  return {
    id: 'cli-1',
    nombre: 'Ana',
    apellido: 'Gómez',
    telefono: '351 555 1234',
    fecha_nacimiento: `1990-${mm}-${dd}`,
  };
}

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <CumpleanosPage />
    </QueryClientProvider>
  );
}

beforeEach(() => {
  vi.mocked(fetchClientesConCumple).mockResolvedValue([clienteHoy()] as never);
  vi.mocked(fetchBirthdaySettings).mockResolvedValue({
    template: DEFAULT_BIRTHDAY_TEMPLATE,
    empresa: 'Seguros XYZ',
  });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('CumpleanosPage (flujo E2E)', () => {
  it('muestra al cliente que cumple hoy con la marca "Hoy"', async () => {
    renderPage();
    // Aparece en la tabla desktop + card mobile (ambas en el DOM).
    expect(await screen.findAllByText('Ana Gómez')).not.toHaveLength(0);
    expect(screen.getAllByText('Hoy').length).toBeGreaterThan(0);
  });

  it('abre la vista previa con el mensaje personalizado y genera el link wa.me correcto', async () => {
    const openSpy = vi.fn();
    vi.stubGlobal('open', openSpy);

    renderPage();
    await screen.findAllByText('Ana Gómez');

    // 1) Abrir la vista previa desde el primer botón "Enviar WhatsApp".
    const botones = await screen.findAllByRole('button', { name: /Enviar WhatsApp/i });
    await userEvent.click(botones[0]);

    // 2) El modal muestra el mensaje con las variables reemplazadas.
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/Mensaje para Ana/)).toBeInTheDocument();
    expect(within(dialog).getByText(/¡Hola Ana! 🎉/)).toBeInTheDocument();
    expect(within(dialog).getByText(/Desde Seguros XYZ/)).toBeInTheDocument();

    // 3) Confirmar → se abre WhatsApp con el link correcto (no se envía nada).
    await userEvent.click(within(dialog).getByRole('button', { name: /Abrir WhatsApp/i }));

    expect(openSpy).toHaveBeenCalledTimes(1);
    const [url, target, features] = openSpy.mock.calls[0];
    expect(url).toContain('https://wa.me/5493515551234?text=');
    expect(target).toBe('_blank');
    expect(features).toBe('noopener,noreferrer');

    // El parámetro text, decodificado, contiene el saludo personalizado.
    const text = (url as string).split('text=')[1];
    expect(decodeURIComponent(text)).toContain('¡Hola Ana! 🎉');
    expect(decodeURIComponent(text)).toContain('Gaspar'); // {{asesor}}
  });

  it('cliente sin teléfono: muestra "Sin teléfono" y no ofrece botón', async () => {
    vi.mocked(fetchClientesConCumple).mockResolvedValue([
      { ...clienteHoy(), telefono: null },
    ] as never);

    renderPage();
    await screen.findAllByText('Ana Gómez');
    expect(screen.getAllByText('Sin teléfono').length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: /Enviar WhatsApp/i })).toBeNull();
  });

  it('teléfono inválido: muestra el aviso y deshabilita el botón', async () => {
    vi.mocked(fetchClientesConCumple).mockResolvedValue([
      { ...clienteHoy(), telefono: '123' },
    ] as never);

    renderPage();
    await screen.findAllByText('Ana Gómez');
    expect(screen.getAllByText(/Teléfono inválido/).length).toBeGreaterThan(0);
    const botones = screen.getAllByRole('button', { name: /Enviar WhatsApp/i });
    botones.forEach((b) => expect(b).toBeDisabled());
  });
});
