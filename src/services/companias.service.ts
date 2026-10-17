import type { SupabaseClient } from '@supabase/supabase-js';

export async function fetchCompanias(supabase: SupabaseClient) {
  return supabase.from('companias').select('*').order('nombre');
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
