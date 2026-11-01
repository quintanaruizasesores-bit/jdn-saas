import type { SupabaseClient } from '@supabase/supabase-js';

export async function fetchCompanias(supabase: SupabaseClient) {
  return supabase.from('companias').select('*').order('nombre');
}

/** Carga el catálogo completo para selectores; Supabase puede limitar cada respuesta. */
export async function fetchTodasCompanias(supabase: SupabaseClient) {
  const pageSize = 1000;
  const rows: { id: string; nombre: string; color: string | null }[] = [];
  for (let offset = 0; ; ) {
    const { data, count, error } = await supabase
      .from('companias')
      .select('id, nombre, color', { count: 'exact' })
      .order('nombre')
      .order('id')
      .range(offset, offset + pageSize - 1);
    if (error) throw error;
    rows.push(...(data ?? []));
    if (!data?.length || (count !== null && rows.length >= count)) break;
    offset += data.length;
  }
  return rows;
}

export async function upsertCompania(
  supabase: SupabaseClient,
  data: { nombre: string; codigo?: string | null; estado?: string }
) {
  const existing = await supabase
    .from('companias')
    .select('id')
    .ilike('nombre', data.nombre)
    .maybeSingle();
  if (existing.data?.id) {
    return supabase
      .from('companias')
      .update(data)
      .eq('id', existing.data.id)
      .select()
      .single();
  }
  return supabase.from('companias').insert(data).select().single();
}

export async function deleteCompania(supabase: SupabaseClient, id: string) {
  return supabase.from('companias').delete().eq('id', id);
}

export async function updateCompaniaColor(
  supabase: SupabaseClient,
  id: string,
  color: string | null
) {
  if (color !== null && !/^#[0-9a-f]{6}$/i.test(color))
    throw new Error('Elegí un color válido');
  const { data, error } = await supabase
    .from('companias')
    .update({ color: color?.toUpperCase() ?? null })
    .eq('id', id)
    .select('id, color')
    .single();
  if (error) throw error;
  return data;
}
