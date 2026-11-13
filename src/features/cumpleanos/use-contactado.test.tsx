import { afterEach, describe, expect, it } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
import { useContactado } from './use-contactado';

afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe('marca local de cumpleaños por usuario', () => {
  it('no muestra marcas de otra cuenta en el mismo navegador', () => {
    const { result, rerender } = renderHook(
      ({ userId }) => useContactado(2026, userId),
      { initialProps: { userId: 'usuario-a' as string | null } }
    );
    act(() => result.current.marcar('cliente-a'));
    expect(result.current.ids.has('cliente-a')).toBe(true);

    rerender({ userId: 'usuario-b' });
    expect(result.current.ids.has('cliente-a')).toBe(false);
    act(() => result.current.marcar('cliente-b'));
    expect(result.current.ids.has('cliente-b')).toBe(true);

    rerender({ userId: 'usuario-a' });
    expect(result.current.ids.has('cliente-a')).toBe(true);
    expect(result.current.ids.has('cliente-b')).toBe(false);
  });

  it('ignora la clave antigua sin propietario identificable', () => {
    localStorage.setItem('cumple:whatsapp-preparado:2026', '["cliente-ajeno"]');
    const { result } = renderHook(() => useContactado(2026, 'usuario-b'));
    expect(result.current.ids.has('cliente-ajeno')).toBe(false);
  });
});
