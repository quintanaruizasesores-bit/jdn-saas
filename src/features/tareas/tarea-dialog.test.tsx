import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TareaDialog } from './tarea-dialog';

const createTarea = vi.fn();

vi.mock('@/services/tareas.service', () => ({
  createTarea: (...args: unknown[]) => createTarea(...args),
}));
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({}),
}));
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

function renderDialog(props: Parameters<typeof TareaDialog>[0] = {}) {
  const qc = new QueryClient();
  return render(
    <QueryClientProvider client={qc}>
      <TareaDialog {...props} />
    </QueryClientProvider>
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('TareaDialog', () => {
  it('crea la tarea con el contexto de póliza y cliente', async () => {
    createTarea.mockResolvedValue({ id: 't1' });
    const onCreated = vi.fn();
    renderDialog({ clienteId: 'c1', polizaId: 'p1', onCreated });

    await userEvent.click(screen.getByRole('button', { name: /agregar tarea/i }));
    await userEvent.type(
      screen.getByLabelText('Título'),
      'Llamar al cliente'
    );
    await userEvent.click(screen.getByRole('button', { name: 'Crear tarea' }));

    await waitFor(() => expect(createTarea).toHaveBeenCalledTimes(1));
    expect(createTarea).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        titulo: 'Llamar al cliente',
        estado: 'PENDIENTE',
        cliente_id: 'c1',
        poliza_id: 'p1',
        siniestro_id: null,
      })
    );
    await waitFor(() => expect(onCreated).toHaveBeenCalled());
  });

  it('no permite guardar sin título', async () => {
    renderDialog({ siniestroId: 's1' });
    await userEvent.click(screen.getByRole('button', { name: /agregar tarea/i }));
    expect(
      screen.getByRole('button', { name: 'Crear tarea' })
    ).toBeDisabled();
  });
});
