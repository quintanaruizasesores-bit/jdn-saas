import type { SupabaseClient } from '@supabase/supabase-js';

export async function fetchRamos(supabase: SupabaseClient) {
  return supabase.from('ramos').select('*').order('nombre');
}

export async function upsertRamo(supabase: SupabaseClient, data: { nombre: string; codigo?: string | null }) {
  const existing = await supabase.from('ramos').select('id').ilike('nombre', data.nombre).maybeSingle();
  if (existing.data?.id) {
    return supabase.from('ramos').update(data).eq('id', existing.data.id).select().single();
  }
  return supabase.from('ramos').insert(data).select().single();
}

export async function deleteRamo(supabase: SupabaseClient, id: string) {
  return supabase.from('ramos').delete().eq('id', id);
}
