import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CompaniaCombobox } from './compania-combobox';

const companias = [
  { id: 'c1', nombre: 'Ándina ART', color: null },
  ...Array.from({ length: 28 }, (_, index) => ({
    id: `extra-${index}`,
    nombre: `Compañía ${String(index).padStart(2, '0')}`,
    color: null,
  })),
  { id: 'sancor', nombre: 'SANCOR', color: '#881337' },
];

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('selector de compañía', () => {
  it('expone todas las opciones en una lista acotada y encuentra SANCOR', async () => {
    render(
      <CompaniaCombobox value={null} onChange={vi.fn()} companias={companias} />
    );
    await userEvent.click(screen.getByRole('button', { name: 'Compañía' }));
    const list = screen.getByRole('listbox');
    expect(within(list).getAllByRole('option')).toHaveLength(30);
    expect(list).toHaveClass('overflow-y-auto', 'overscroll-contain');
    expect(list).toHaveStyle({
      maxHeight:
        'min(300px, calc(var(--radix-popover-content-available-height) - 48px))',
    });
    expect(
      within(list).getByRole('option', { name: 'SANCOR' })
    ).toBeInTheDocument();

    await userEvent.type(
      screen.getByRole('combobox', { name: 'Buscar compañía' }),
      'sancor'
    );
    expect(within(list).getAllByRole('option')).toHaveLength(1);
    expect(
      within(list).getByRole('option', { name: 'SANCOR' })
    ).toBeInTheDocument();
  });

  it('ignora acentos y muestra vacío cuando no hay coincidencias', async () => {
    render(
      <CompaniaCombobox value={null} onChange={vi.fn()} companias={companias} />
    );
    await userEvent.click(screen.getByRole('button', { name: 'Compañía' }));
    const input = screen.getByRole('combobox', { name: 'Buscar compañía' });
    await userEvent.type(input, 'andina');
    expect(
      screen.getByRole('option', { name: 'Ándina ART' })
    ).toBeInTheDocument();
    await userEvent.clear(input);
    await userEvent.type(input, 'inexistente');
    expect(screen.getByText('No se encontraron compañías')).toBeInTheDocument();
  });

  it('selecciona con flechas y Enter, muestra la selección y cierra con Escape', async () => {
    const onChange = vi.fn();
    const view = render(
      <CompaniaCombobox
        value={null}
        onChange={onChange}
        companias={companias}
      />
    );
    await userEvent.click(screen.getByRole('button', { name: 'Compañía' }));
    await userEvent.type(
      screen.getByRole('combobox', { name: 'Buscar compañía' }),
      'sancor'
    );
    await userEvent.keyboard('{ArrowDown}{Enter}');
    expect(onChange).toHaveBeenCalledWith('sancor');
    view.rerender(
      <CompaniaCombobox
        value="sancor"
        onChange={onChange}
        companias={companias}
      />
    );
    expect(screen.getByRole('button', { name: 'Compañía' })).toHaveTextContent(
      'SANCOR'
    );
    await userEvent.click(screen.getByRole('button', { name: 'Compañía' }));
    expect(screen.getByLabelText('Seleccionada')).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });
});
