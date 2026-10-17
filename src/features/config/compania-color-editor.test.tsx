import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
vi.mock('@/features/auth/actions', () => ({ logoutAction: vi.fn() }));
vi.mock('@/lib/supabase/client', () => ({ createClient: () => ({}) }));
vi.mock('@/services/companias.service', () => ({
  fetchCompanias: vi.fn(),
  updateCompaniaColor: vi.fn(),
  upsertCompania: vi.fn(),
  deleteCompania: vi.fn(),
}));
vi.mock('@/services/ramos.service', () => ({
  fetchRamos: vi.fn().mockResolvedValue({ data: [], error: null }),
  upsertRamo: vi.fn(),
  deleteRamo: vi.fn(),
}));
vi.mock('./birthday-template-editor', () => ({
  BirthdayTemplateEditor: () => null,
}));
import {
  fetchCompanias,
  updateCompaniaColor,
} from '@/services/companias.service';
import { ConfigManager } from './config-manager';

function mount() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const view = render(
    <QueryClientProvider client={qc}>
      <ConfigManager />
    </QueryClientProvider>
  );
  return { qc, ...view };
}
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
describe('colores en Configuración → Compañías', () => {
  it('conserva el color inicial, guarda uno personalizado, lo recupera al volver y permite restablecerlo', async () => {
    let serverColor: string | null = null;
    vi.mocked(fetchCompanias).mockImplementation(
      async () =>
        ({
          data: [{ id: 'c1', nombre: 'Sancor Seguros', color: serverColor }],
          error: null,
        }) as never
    );
    vi.mocked(updateCompaniaColor).mockImplementation(
      async (_client, _id, color) => {
        serverColor = color;
        return { id: 'c1', color };
      }
    );
    const first = mount();
    const input = await screen.findByLabelText('Color de Sancor Seguros');
    expect(input).toHaveValue('#881337');
    fireEvent.change(input, { target: { value: '#a855f7' } });
    await userEvent.click(
      screen.getByRole('button', { name: 'Guardar color de Sancor Seguros' })
    );
    await waitFor(() =>
      expect(updateCompaniaColor).toHaveBeenCalledWith({}, 'c1', '#A855F7')
    );
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Guardar color de Sancor Seguros' })
      ).toBeDisabled()
    );
    expect(first.qc.getQueryState(['companias'])?.data).toMatchObject([
      { color: '#A855F7' },
    ]);
    first.unmount();
    first.qc.clear();
    const second = mount();
    expect(await screen.findByLabelText('Color de Sancor Seguros')).toHaveValue(
      '#a855f7'
    );
    await userEvent.click(
      screen.getByRole('button', {
        name: 'Restablecer color de Sancor Seguros',
      })
    );
    await waitFor(() => expect(serverColor).toBeNull());
    await waitFor(() =>
      expect(screen.getByLabelText('Color de Sancor Seguros')).toHaveValue(
        '#881337'
      )
    );
    second.qc.clear();
  });
  it('un error al guardar mantiene la configuración anterior', async () => {
    vi.mocked(fetchCompanias).mockResolvedValue({
      data: [{ id: 'c1', nombre: 'Mapfre', color: null }],
      error: null,
    } as never);
    vi.mocked(updateCompaniaColor).mockRejectedValue(new Error('sin conexión'));
    const { qc } = mount();
    fireEvent.change(await screen.findByLabelText('Color de Mapfre'), {
      target: { value: '#000000' },
    });
    await userEvent.click(
      screen.getByRole('button', { name: 'Guardar color de Mapfre' })
    );
    await waitFor(() => expect(updateCompaniaColor).toHaveBeenCalled());
    expect(qc.getQueryState(['companias'])?.data).toMatchObject([
      { color: null },
    ]);
    qc.clear();
  });
});
