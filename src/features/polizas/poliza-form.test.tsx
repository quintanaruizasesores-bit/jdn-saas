import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import type { Poliza } from '@/types/database';
import { periodoComision } from '@/lib/dashboard/comision';
import userEvent from '@testing-library/user-event';
import { PolizaForm } from './poliza-form';

vi.mock('@/features/clientes/cliente-combobox', () => ({
  ClienteCombobox: () => <div>Cliente seleccionado</div>,
}));
vi.mock('@/components/ui/select', () => ({
  Select: ({
    value,
    onValueChange,
    children,
  }: {
    value: string;
    onValueChange: (v: string) => void;
    children: React.ReactNode;
  }) => (
    <select
      aria-label={
        value === 'VIGENTE' || value === 'HISTORICA' || value === 'BAJA'
          ? 'Estado'
          : 'Catálogo'
      }
      value={value}
      onChange={(e) => onValueChange(e.target.value)}
    >
      {children}
    </select>
  ),
  SelectTrigger: () => null,
  SelectValue: () => null,
  SelectContent: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  SelectItem: ({
    value,
    children,
  }: {
    value: string;
    children: React.ReactNode;
  }) => <option value={value}>{children}</option>,
}));

const clienteId = '11111111-1111-4111-8111-111111111111';
const base: Partial<Poliza> = {
  cliente_id: clienteId,
  estado: 'VIGENTE',
  fecha_inicio: '2026-01-01',
  fecha_fin: '2026-12-31',
  fecha_baja: null,
  comision_desde: '2026-01-01',
  prima: 1000,
  detalle: 'Original',
};

function setup(
  mode: 'create' | 'edit',
  values?: Partial<Poliza>,
  companias: { id: string; nombre: string; color: string | null }[] = []
) {
  const onSubmit = vi.fn().mockResolvedValue(undefined);
  render(
    <PolizaForm
      mode={mode}
      defaultValues={values}
      companias={companias}
      ramos={[]}
      onSubmit={onSubmit}
    />
  );
  return onSubmit;
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('compañía de la póliza', () => {
  const catalogo = [
    {
      id: '22222222-2222-4222-8222-222222222222',
      nombre: 'MAPFRE',
      color: '#DC2626',
    },
    {
      id: '33333333-3333-4333-8333-333333333333',
      nombre: 'SANCOR',
      color: '#881337',
    },
  ];

  it('guarda el UUID seleccionado al crear', async () => {
    const onSubmit = setup('create', { cliente_id: clienteId }, catalogo);
    await userEvent.click(screen.getByRole('button', { name: 'Compañía' }));
    await userEvent.type(
      screen.getByRole('combobox', { name: 'Buscar compañía' }),
      'sancor'
    );
    await userEvent.click(screen.getByRole('option', { name: 'SANCOR' }));
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          compania_id: catalogo[1].id,
        })
      )
    );
  });

  it('muestra la selección vigente y guarda el nuevo UUID al editar', async () => {
    const onSubmit = setup(
      'edit',
      { ...base, compania_id: catalogo[1].id },
      catalogo
    );
    expect(screen.getByRole('button', { name: 'Compañía' })).toHaveTextContent(
      'SANCOR'
    );
    await userEvent.click(screen.getByRole('button', { name: 'Compañía' }));
    await userEvent.type(
      screen.getByRole('combobox', { name: 'Buscar compañía' }),
      'mapfre'
    );
    await userEvent.click(screen.getByRole('option', { name: 'MAPFRE' }));
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          compania_id: catalogo[0].id,
        })
      )
    );
  });
});

describe('fechas del formulario de póliza', () => {
  it('agrupa la vigencia y deja la fecha de efecto en opciones avanzadas al crear', async () => {
    const onSubmit = setup('create', { cliente_id: clienteId });
    expect(screen.getByText('Vigencia de la póliza')).toBeInTheDocument();
    expect(screen.getByLabelText('Inicio de vigencia')).toBeInTheDocument();
    expect(
      screen.queryByLabelText('Cambios con efecto desde')
    ).not.toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('button', { name: /Opciones avanzadas de fechas/ })
    );
    expect(screen.getByLabelText('Cambios con efecto desde')).toHaveValue(
      periodoComision().hoy.split('-').reverse().join('/')
    );
    fireEvent.change(screen.getByLabelText('Inicio de vigencia'), {
      target: { value: '01/11/2026' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          fecha_inicio: '2026-11-01',
          comision_desde: periodoComision().hoy,
        })
      )
    );
  });

  it('conserva la fecha de efecto al editar solo el detalle', async () => {
    const onSubmit = setup('edit', base);
    fireEvent.change(screen.getByDisplayValue('Original'), {
      target: { value: 'Corregido' },
    });
    expect(
      screen.queryByLabelText('Cambios con efecto desde')
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          detalle: 'Corregido',
          comision_desde: '2026-01-01',
        })
      )
    );
  });

  it('revela y acepta una fecha de efecto retroactiva al cambiar el premio', async () => {
    const onSubmit = setup('edit', base);
    fireEvent.change(screen.getByLabelText('Premio mensual'), {
      target: { value: '1500' },
    });
    const effect = screen.getByLabelText('Cambios con efecto desde');
    fireEvent.change(effect, { target: { value: '15/10/2026' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          prima: 1500,
          comision_desde: '2026-10-15',
        })
      )
    );
  });

  it('rechaza una fecha imposible antes de guardar', async () => {
    const onSubmit = setup('edit', base);
    fireEvent.change(screen.getByLabelText('Fin de vigencia (opcional)'), {
      target: { value: '31/02/2027' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(
      await screen.findByText('Ingresá una fecha válida (DD/MM/AAAA)')
    ).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('respeta el límite de la última versión financiera', async () => {
    const onSubmit = setup('edit', base);
    fireEvent.change(screen.getByLabelText('Premio mensual'), {
      target: { value: '1500' },
    });
    fireEvent.change(screen.getByLabelText('Cambios con efecto desde'), {
      target: { value: '31/12/2025' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(
      await screen.findByText('La fecha no puede ser anterior a 01/01/2026')
    ).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('propone la baja como efecto y conserva la fecha histórica cuando se oculta', async () => {
    const onSubmit = setup('edit', base);
    fireEvent.change(screen.getByRole('combobox', { name: 'Estado' }), {
      target: { value: 'BAJA' },
    });
    fireEvent.change(screen.getByLabelText('Baja efectiva'), {
      target: { value: '20/10/2026' },
    });
    expect(screen.getByLabelText('Cambios con efecto desde')).toHaveValue(
      '20/10/2026'
    );
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          estado: 'BAJA',
          fecha_baja: '2026-10-20',
          comision_desde: '2026-10-20',
        })
      )
    );
  });

  it('no borra la baja de una póliza existente cuando cambia el estado', async () => {
    const onSubmit = setup('edit', {
      ...base,
      estado: 'BAJA',
      fecha_baja: '2026-10-20',
    });
    expect(screen.getByLabelText('Baja efectiva')).toHaveValue('20/10/2026');
    fireEvent.change(screen.getByRole('combobox', { name: 'Estado' }), {
      target: { value: 'VIGENTE' },
    });
    expect(screen.queryByLabelText('Baja efectiva')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ fecha_baja: '2026-10-20' })
      )
    );
  });
});
