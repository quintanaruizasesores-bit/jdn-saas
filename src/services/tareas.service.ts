import type { Tarea } from '@/types/database';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { TareaFormData } from '@/validations/tarea.schema';
import { logActividad } from './actividad.service';

export async function fetchTareas(supabase: SupabaseClient, filters: { estado?: string; cliente_id?: string } = {}) {
  let query = supabase
    .from('tareas')
    .select(`*, cliente:clientes(id, nombre, apellido)`)
    .order('fecha_vencimiento', { ascending: true, nullsFirst: false });

  if (filters.estado) query = query.eq('estado', filters.estado);
  if (filters.cliente_id) query = query.eq('cliente_id', filters.cliente_id);
  return query;
}

export async function createTarea(supabase: SupabaseClient, data: TareaFormData) {
  const { data: row, error } = await supabase.from('tareas').insert(data).select().single();
  if (error) throw error;
  await logActividad(supabase, 'CREAR', 'TAREA', row.id);
  return row as Tarea;
}

export async function updateTarea(supabase: SupabaseClient, id: string, data: Partial<TareaFormData>) {
  const { data: row, error } = await supabase.from('tareas').update(data).eq('id', id).select().single();
  if (error) throw error;
  await logActividad(supabase, 'ACTUALIZAR', 'TAREA', id);
  return row as Tarea;
}

export async function deleteTarea(supabase: SupabaseClient, id: string) {
  const { error } = await supabase.from('tareas').delete().eq('id', id);
  if (error) throw error;
  await logActividad(supabase, 'ELIMINAR', 'TAREA', id);
}
