import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Cliente } from '@/types/database';
import { ClienteForm } from './cliente-form';

afterEach(cleanup);

describe('actividad del cliente', () => {
  it('permite ingresar la actividad al dar de alta y la envía al guardar', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<ClienteForm onSubmit={onSubmit} />);

    await userEvent.type(
      screen.getByRole('textbox', { name: 'Actividad' }),
      'Comercio'
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Crear cliente' })
    );

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ actividad: 'Comercio' })
      )
    );
  });

  it('muestra la actividad guardada al editar', () => {
    render(
      <ClienteForm
        defaultValues={{ actividad: 'Docencia' } as Cliente}
        onSubmit={vi.fn().mockResolvedValue(undefined)}
      />
    );
    expect(screen.getByRole('textbox', { name: 'Actividad' })).toHaveValue(
      'Docencia'
    );
  });
});
