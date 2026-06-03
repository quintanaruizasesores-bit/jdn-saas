import type { SupabaseClient } from '@supabase/supabase-js';

export async function fetchCompanias(supabase: SupabaseClient) {
  return supabase.from('companias').select('*').order('nombre');
}

export async function upsertCompania(supabase: SupabaseClient, data: { nombre: string; codigo?: string | null; estado?: string }) {
  const existing = await supabase.from('companias').select('id').ilike('nombre', data.nombre).maybeSingle();
  if (existing.data?.id) {
    return supabase.from('companias').update(data).eq('id', existing.data.id).select().single();
  }
  return supabase.from('companias').insert(data).select().single();
}

export async function deleteCompania(supabase: SupabaseClient, id: string) {
  return supabase.from('companias').delete().eq('id', id);
}
