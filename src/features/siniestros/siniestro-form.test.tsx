import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { Cliente } from '@/types/database';

vi.mock('@/lib/supabase/client', () => ({ createClient: () => ({}) }));
vi.mock('@/services/clientes.service', () => ({
  fetchClientes: vi.fn(),
  fetchClienteById: vi.fn(),
}));

import { fetchClientes } from '@/services/clientes.service';
import { SiniestroForm } from './siniestro-form';

const UUID = '11111111-1111-4111-8111-111111111111';

function clienteRow(): Cliente {
  return {
    id: UUID,
    nombre: 'Juan',
    apellido: 'Pérez',
    dni: null,
    observaciones: null,
    email: null,
    telefono: '351 555 1234',
    direccion: null,
    localidad: null,
    provincia: null,
    fecha_nacimiento: null,
    deleted_at: null,
    created_at: '2020-01-01',
    updated_at: '2020-01-01',
  };
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('SiniestroForm (integración cliente → submit)', () => {
  it('envía el cliente_id (UUID) del cliente elegido en el combobox', async () => {
    vi.mocked(fetchClientes).mockResolvedValue({
      data: [clienteRow()],
      error: null,
      count: 1,
    } as never);

    const onSubmit = vi.fn();
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <SiniestroForm onSubmit={onSubmit} />
      </QueryClientProvider>
    );

    await userEvent.click(screen.getByRole('button', { name: 'Buscar cliente' }));
    fireEvent.change(screen.getByPlaceholderText(/Nombre, apellido/i), {
      target: { value: 'juan' },
    });

    const opcion = await screen.findByRole('option', { name: /Juan Pérez/ });
    await userEvent.click(opcion);

    // El trigger debe reflejar el cliente elegido (confirma que onChange propagó a RHF).
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Buscar cliente' })).toHaveTextContent('Juan Pérez')
    );

    await userEvent.click(screen.getByRole('button', { name: /Guardar/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      cliente_id: UUID,
      tipo: 'OTROS',
      responsabilidad: 'INDETERMINADA',
      monto_estimado: 0,
    });
  });
});
