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

import { fetchClientes, fetchClienteById } from '@/services/clientes.service';
import { ClienteCombobox } from './cliente-combobox';

const mockFetchClientes = vi.mocked(fetchClientes);
const mockFetchClienteById = vi.mocked(fetchClienteById);

function cliente(over: Partial<Cliente> = {}): Cliente {
  return {
    id: '11111111-1111-1111-1111-111111111111',
    nombre: 'Juan',
    apellido: 'Pérez',
    dni: null,
    observaciones: null,
    email: null,
    telefono: null,
    direccion: null,
    localidad: null,
    provincia: null,
    fecha_nacimiento: null,
    deleted_at: null,
    created_at: '2020-01-01',
    updated_at: '2020-01-01',
    ...over,
  };
}

function ok(data: Cliente[]) {
  return { data, error: null, count: data.length } as Awaited<ReturnType<typeof fetchClientes>>;
}

function renderCombobox(props: Partial<React.ComponentProps<typeof ClienteCombobox>> = {}) {
  const onChange = vi.fn();
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={qc}>
      <ClienteCombobox value={null} onChange={onChange} {...props} />
    </QueryClientProvider>
  );
  return { onChange };
}

const openTrigger = () => screen.getByRole('button', { name: 'Buscar cliente' });
const searchInput = () => screen.getByPlaceholderText(/Nombre, apellido/i);

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('ClienteCombobox', () => {
  it('muestra el hint y no consulta con menos de 2 caracteres', async () => {
    renderCombobox();
    await userEvent.click(openTrigger());
    expect(await screen.findByText(/al menos 2 caracteres/i)).toBeInTheDocument();
    expect(mockFetchClientes).not.toHaveBeenCalled();
  });

  it('busca y muestra múltiples resultados con datos secundarios', async () => {
    mockFetchClientes.mockResolvedValue(
      ok([
        cliente({ id: 'id-1', telefono: '351 555 1234' }),
        cliente({ id: 'id-2', apellido: 'López', telefono: '351 444 9876' }),
      ])
    );
    renderCombobox();
    await userEvent.click(openTrigger());
    fireEvent.change(searchInput(), { target: { value: 'juan' } });

    expect(await screen.findByText('Juan López')).toBeInTheDocument();
    expect(screen.getByText(/351 555 1234/)).toBeInTheDocument();
    expect(mockFetchClientes).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ search: 'juan' })
    );
  });

  it('muestra el estado de carga mientras busca', async () => {
    let resolve!: (v: ReturnType<typeof ok>) => void;
    mockFetchClientes.mockImplementation(() => new Promise((r) => (resolve = r)));
    renderCombobox();
    await userEvent.click(openTrigger());
    fireEvent.change(searchInput(), { target: { value: 'juan' } });

    expect(await screen.findByText(/Buscando/i)).toBeInTheDocument();
    resolve(ok([cliente()]));
    expect(await screen.findByText('Juan Pérez')).toBeInTheDocument();
  });

  it('muestra mensaje cuando no hay resultados', async () => {
    mockFetchClientes.mockResolvedValue(ok([]));
    renderCombobox();
    await userEvent.click(openTrigger());
    fireEvent.change(searchInput(), { target: { value: 'juanxx' } });

    expect(await screen.findByText(/No encontramos clientes con "juanxx"/i)).toBeInTheDocument();
  });

  it('muestra un mensaje de error si Supabase falla', async () => {
    mockFetchClientes.mockResolvedValue({
      data: null,
      error: { message: 'boom' },
      count: 0,
    } as unknown as ReturnType<typeof ok>);
    renderCombobox();
    await userEvent.click(openTrigger());
    fireEvent.change(searchInput(), { target: { value: 'juan' } });

    expect(await screen.findByText(/error al buscar/i)).toBeInTheDocument();
  });

  it('al seleccionar un cliente llama onChange con el id y cierra el selector', async () => {
    mockFetchClientes.mockResolvedValue(ok([cliente({ id: 'id-sel' })]));
    const { onChange } = renderCombobox();
    await userEvent.click(openTrigger());
    fireEvent.change(searchInput(), { target: { value: 'juan' } });

    const opcion = await screen.findByRole('option', { name: /Juan Pérez/ });
    await userEvent.click(opcion);

    expect(onChange).toHaveBeenCalledWith('id-sel');
    await waitFor(() => expect(screen.queryByPlaceholderText(/Nombre, apellido/i)).not.toBeInTheDocument());
  });

  it('hidrata el value inicial y permite reabrir para cambiarlo', async () => {
    mockFetchClienteById.mockResolvedValue({
      data: cliente({ id: 'id-sel', telefono: '351 555 1234' }),
      error: null,
    } as never);
    renderCombobox({ value: 'id-sel' });

    expect(await screen.findByText('Juan Pérez')).toBeInTheDocument();
    expect(screen.getByText('cambiar')).toBeInTheDocument();

    await userEvent.click(openTrigger());
    expect(await screen.findByPlaceholderText(/Nombre, apellido/i)).toBeInTheDocument();
  });

  it('hace debounce: no consulta por cada tecla, sólo una vez con el término final', async () => {
    mockFetchClientes.mockResolvedValue(ok([]));
    renderCombobox();
    await userEvent.click(openTrigger());
    const input = searchInput();

    fireEvent.change(input, { target: { value: 'j' } });
    fireEvent.change(input, { target: { value: 'ju' } });
    fireEvent.change(input, { target: { value: 'jua' } });
    fireEvent.change(input, { target: { value: 'juan' } });

    // Aún no pasó el debounce → no debería haber consultado.
    expect(mockFetchClientes).not.toHaveBeenCalled();

    await waitFor(() => expect(mockFetchClientes).toHaveBeenCalledTimes(1));
    expect(mockFetchClientes).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ search: 'juan' })
    );
  });

  it('una respuesta vieja no reemplaza los resultados de una búsqueda más reciente', async () => {
    const resolvers: Record<string, (v: ReturnType<typeof ok>) => void> = {};
    mockFetchClientes.mockImplementation(
      (_s, filters) =>
        new Promise((r) => {
          resolvers[(filters as { search: string }).search] = r;
        })
    );
    renderCombobox();
    await userEvent.click(openTrigger());
    const input = searchInput();

    fireEvent.change(input, { target: { value: 'ju' } });
    await waitFor(() => expect(resolvers['ju']).toBeDefined());

    fireEvent.change(input, { target: { value: 'jua' } });
    await waitFor(() => expect(resolvers['jua']).toBeDefined());

    // Resolvemos la MÁS NUEVA primero y la vieja después.
    resolvers['jua'](ok([cliente({ id: 'nuevo', nombre: 'Nuevo', apellido: 'Cliente' })]));
    resolvers['ju'](ok([cliente({ id: 'viejo', nombre: 'Viejo', apellido: 'Cliente' })]));

    expect(await screen.findByText('Nuevo Cliente')).toBeInTheDocument();
    expect(screen.queryByText('Viejo Cliente')).not.toBeInTheDocument();
  });

  it('maneja nombres muy largos y homónimos (desambigua por teléfono)', async () => {
    mockFetchClientes.mockResolvedValue(
      ok([
        cliente({ id: 'a', nombre: 'Juan', apellido: 'Pérez', telefono: '351 111 1111' }),
        cliente({ id: 'b', nombre: 'Juan', apellido: 'Pérez', telefono: '351 222 2222' }),
        cliente({ id: 'c', nombre: 'Maria Fernanda de los Angeles'.repeat(3), apellido: 'Gonzalez' }),
      ])
    );
    renderCombobox();
    await userEvent.click(openTrigger());
    fireEvent.change(searchInput(), { target: { value: 'juan' } });

    await screen.findByText(/351 111 1111/);
    expect(screen.getByText(/351 222 2222/)).toBeInTheDocument();
    expect(screen.getAllByText('Juan Pérez')).toHaveLength(2);
  });
});
