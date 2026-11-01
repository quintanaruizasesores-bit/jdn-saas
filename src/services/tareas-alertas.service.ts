import type { SupabaseClient } from '@supabase/supabase-js';

export interface TareaAlerta {
  id: string;
  titulo: string;
  fecha_vencimiento: string;
}

export async function fetchTareasAlertas(
  supabase: SupabaseClient,
  through: string
) {
  const { data, count, error } = await supabase
    .from('tareas')
    .select('id, titulo, fecha_vencimiento', { count: 'exact' })
    .eq('estado', 'PENDIENTE')
    .lte('fecha_vencimiento', through)
    .order('fecha_vencimiento', { ascending: true })
    .order('created_at', { ascending: true })
    .limit(5);

  if (error) throw error;
  return { count: count ?? 0, items: (data ?? []) as TareaAlerta[] };
}
