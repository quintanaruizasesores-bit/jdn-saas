import type { SupabaseClient } from '@supabase/supabase-js';
import type { DatosInteligencia } from '@/lib/reportes/inteligencia';

/** No corta al recibir menos de 1000: el proyecto puede tener otro max_rows. */
export async function leerTodas<T>(
  client: SupabaseClient,
  tabla: string,
  columnas = '*'
): Promise<T[]> {
  const rows: T[] = [];
  let ultimo: string | null = null;
  while (true) {
    let query = client
      .from(tabla)
      .select(columnas)
      .order('id', { ascending: true })
      .limit(500);
    if (ultimo) query = query.gt('id', ultimo);
    const { data, error } = await query;
    if (error)
      throw new Error(
        `No se pudo leer ${tabla}. Revisá la conexión y las migraciones.`
      );
    if (!data?.length) break;
    const lote = data as unknown as (T & { id: string })[];
    const siguiente = lote.at(-1)!.id;
    if (ultimo && siguiente <= ultimo)
      throw new Error('La paginación no avanzó.');
    rows.push(...lote);
    ultimo = siguiente;
  }
  return rows;
}
export async function cargarInteligencia(
  client: SupabaseClient
): Promise<DatosInteligencia> {
  const [clientes, polizas, historial, companias, ramos] = await Promise.all([
    leerTodas<DatosInteligencia['clientes'][number]>(
      client,
      'clientes',
      'id,nombre,apellido,provincia,localidad,deleted_at,created_at'
    ),
    leerTodas<DatosInteligencia['polizas'][number]>(client, 'polizas'),
    leerTodas<DatosInteligencia['historial'][number]>(
      client,
      'poliza_historial'
    ),
    leerTodas<DatosInteligencia['companias'][number]>(client, 'companias'),
    leerTodas<DatosInteligencia['ramos'][number]>(client, 'ramos'),
  ]);
  return { clientes, polizas, historial, companias, ramos };
}
