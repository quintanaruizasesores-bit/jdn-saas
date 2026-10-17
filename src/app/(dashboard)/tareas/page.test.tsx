import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mocks = vi.hoisted(() => ({
  client: {},
  fetchTareas: vi.fn(),
  createTarea: vi.fn(),
  updateTarea: vi.fn(),
  deleteTarea: vi.fn(),
}));

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => mocks.client,
}));
vi.mock('@/services/tareas.service', () => ({
  fetchTareas: mocks.fetchTareas,
  createTarea: mocks.createTarea,
  updateTarea: mocks.updateTarea,
  deleteTarea: mocks.deleteTarea,
}));
vi.mock('@/components/dashboard/app-header', () => ({
  AppHeader: ({ title }: { title: string }) => <h1>{title}</h1>,
}));
vi.mock('@/components/ui/confirm-dialog', () => ({
  ConfirmDialog: ({ trigger }: { trigger: React.ReactNode }) => trigger,
}));
vi.mock('@/components/ui/select', () => ({
  Select: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SelectContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SelectItem: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SelectTrigger: ({ children }: { children: React.ReactNode }) => (
    <button>{children}</button>
  ),
  SelectValue: ({ placeholder }: { placeholder?: string }) => (
    <span>{placeholder}</span>
  ),
}));

import TareasPage from './page';

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <TareasPage />
    </QueryClientProvider>
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('vencimientos de tareas', () => {
  it('permite asignar vencimiento al crear una tarea', async () => {
    mocks.fetchTareas.mockResolvedValue({ data: [] });
    mocks.createTarea.mockResolvedValue({ id: 't1' });
    renderPage();

    fireEvent.change(screen.getByPlaceholderText('Escribí una tarea...'), {
      target: { value: 'Llamar al cliente' },
    });
    fireEvent.change(screen.getByLabelText('Vencimiento (opcional)'), {
      target: { value: '2026-11-03' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Agregar' }));

    await waitFor(() =>
      expect(mocks.createTarea).toHaveBeenCalledWith(
        mocks.client,
        expect.objectContaining({
          titulo: 'Llamar al cliente',
          fecha_vencimiento: '2026-11-03',
        })
      )
    );
  });

  it('permite cambiar o quitar la fecha en una tarea existente', async () => {
    mocks.fetchTareas.mockResolvedValue({
      data: [
        {
          id: 't1',
          titulo: 'Renovar póliza',
          estado: 'PENDIENTE',
          fecha_vencimiento: '2026-10-30',
          cliente: null,
        },
      ],
    });
    mocks.updateTarea.mockResolvedValue({ id: 't1' });
    renderPage();
    const input = await screen.findByLabelText('Vencimiento de Renovar póliza');

    fireEvent.change(input, { target: { value: '2026-11-15' } });
    await waitFor(() =>
      expect(mocks.updateTarea).toHaveBeenCalledWith(mocks.client, 't1', {
        fecha_vencimiento: '2026-11-15',
      })
    );

    fireEvent.change(input, { target: { value: '' } });
    await waitFor(() =>
      expect(mocks.updateTarea).toHaveBeenLastCalledWith(mocks.client, 't1', {
        fecha_vencimiento: null,
      })
    );
  });
});
