import type { SupabaseClient } from '@supabase/supabase-js';
import type { Cliente } from '@/types/database';

/** Subconjunto de columnas de `clientes` que necesita el módulo Cumpleaños. */
export type ClienteCumpleRow = Pick<
  Cliente,
  'id' | 'nombre' | 'apellido' | 'telefono' | 'fecha_nacimiento'
>;

/**
 * Trae los clientes activos que tienen fecha de nacimiento cargada. El cálculo
 * de "hoy / próximos / edad" se hace del lado del cliente con la lógica pura de
 * `lib/cumpleanos` (ignora el año, cosa difícil de expresar en SQL) sobre un
 * dataset acotado (la cartera). La búsqueda y el ordenamiento también se
 * resuelven en memoria para mantener counts consistentes con el listado.
 *
 * Usa el cliente de Supabase recibido, por lo que respeta las políticas RLS:
 * el usuario solo ve los clientes que tiene permitido ver.
 */
export async function fetchClientesConCumple(
  supabase: SupabaseClient
): Promise<ClienteCumpleRow[]> {
  const { data, error } = await supabase
    .from('clientes')
    .select('id, nombre, apellido, telefono, fecha_nacimiento')
    .is('deleted_at', null)
    .not('fecha_nacimiento', 'is', null)
    .order('apellido')
    .order('nombre');

  if (error) throw error;
  return (data ?? []) as ClienteCumpleRow[];
}
