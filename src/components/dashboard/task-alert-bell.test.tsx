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
  fetch: vi.fn(),
}));

vi.mock('@/lib/supabase/client', () => ({ createClient: () => ({}) }));
vi.mock('@/services/tareas-alertas.service', () => ({
  fetchTareasAlertas: mocks.fetch,
}));

import { TaskAlertBell } from './task-alert-bell';

function renderBell() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return {
    client,
    ...render(
      <QueryClientProvider client={client}>
        <TaskAlertBell />
      </QueryClientProvider>
    ),
  };
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('campanita de tareas', () => {
  it('muestra el total y los cinco resultados con acceso a tareas', async () => {
    mocks.fetch.mockResolvedValue({
      count: 6,
      items: Array.from({ length: 5 }, (_, i) => ({
        id: `t${i}`,
        titulo: `Tarea ${i + 1}`,
        fecha_vencimiento: '2020-01-01',
      })),
    });
    renderBell();
    const trigger = await screen.findByRole('button', {
      name: 'Alertas de tareas: 6',
    });
    fireEvent.click(trigger);

    expect(await screen.findByText('Tarea 1')).toBeInTheDocument();
    expect(screen.getByText('Tarea 5')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Ver todas las tareas' })
    ).toHaveAttribute('href', '/tareas');
    expect(screen.getAllByText(/^Vencida ·/)).toHaveLength(5);
  });

  it('muestra vacío y permite reintentar ante un error', async () => {
    mocks.fetch
      .mockRejectedValueOnce(new Error('falló'))
      .mockResolvedValue({ count: 0, items: [] });
    renderBell();
    fireEvent.click(screen.getByRole('button', { name: /Alertas de tareas/ }));
    expect(
      await screen.findByText('No se pudieron cargar las alertas.')
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    await waitFor(() =>
      expect(
        screen.getByText('No hay tareas próximas a vencer.')
      ).toBeInTheDocument()
    );
  });

  it('actualiza el contador cuando cambian las tareas', async () => {
    mocks.fetch
      .mockResolvedValueOnce({ count: 1, items: [] })
      .mockResolvedValue({ count: 0, items: [] });
    const { client } = renderBell();
    expect(
      await screen.findByRole('button', { name: 'Alertas de tareas: 1' })
    ).toBeInTheDocument();

    await client.invalidateQueries({ queryKey: ['tareas'] });

    expect(
      await screen.findByRole('button', { name: 'Alertas de tareas: 0' })
    ).toBeInTheDocument();
  });
});
