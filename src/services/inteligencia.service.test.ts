import { describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { leerTodas } from './inteligencia.service';

describe('lectura analítica con sesión y paginación por clave', () => {
  it('recupera más de 1000 aun con max_rows de servidor menor al lote solicitado', async () => {
    const filas = Array.from({ length: 1203 }, (_, n) => ({
      id: String(n).padStart(6, '0'),
    }));
    let consultas = 0;
    const client = {
      from: () => {
        let cursor = '';
        const q = {
          select: () => q,
          order: () => q,
          limit: () => q,
          gt: (_: string, value: string) => {
            cursor = value;
            return q;
          },
          then: (resolve: (value: unknown) => unknown) => {
            consultas++;
            return Promise.resolve({
              data: filas.filter((f) => f.id > cursor).slice(0, 87),
              error: null,
            }).then(resolve);
          },
        };
        return q;
      },
    } as unknown as SupabaseClient;
    const resultado = await leerTodas<{ id: string }>(client, 'clientes');
    expect(resultado).toEqual(filas);
    expect(consultas).toBe(15);
  });
  it('propaga errores de permisos/conexión sin convertirlos en cero registros', async () => {
    const q = {
      select: () => q,
      order: () => q,
      limit: () => q,
      then: (resolve: (value: unknown) => unknown) =>
        Promise.resolve({ data: null, error: { message: 'RLS' } }).then(
          resolve
        ),
    };
    await expect(
      leerTodas({ from: () => q } as unknown as SupabaseClient, 'clientes')
    ).rejects.toThrow(/No se pudo leer/);
  });
});
