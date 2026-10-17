import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { RespaldoPanel } from './respaldo-panel';
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
describe('descarga integral en el navegador', () => {
  it('rechaza HTML de login en lugar de guardarlo con extensión xlsx', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response('<html>login</html>', {
          headers: { 'Content-Type': 'text/html' },
        })
      )
    );
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {});
    render(<RespaldoPanel />);
    fireEvent.click(
      screen.getByRole('button', {
        name: 'Exportar base de datos completa (.xlsx)',
      })
    );
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'El servidor no devolvió un Excel'
    );
    expect(click).not.toHaveBeenCalled();
  });
  it('descarta un stream interrumpido y no descarga el archivo parcial', async () => {
    const body = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('PK'));
        controller.error(new TypeError('network failed'));
      },
    });
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(body, {
          headers: {
            'Content-Type':
              'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          },
        })
      )
    );
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {});
    render(<RespaldoPanel />);
    fireEvent.click(
      screen.getByRole('button', {
        name: 'Exportar base de datos completa (.xlsx)',
      })
    );
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No se guardó un archivo parcial'
    );
    expect(click).not.toHaveBeenCalled();
  });
});
