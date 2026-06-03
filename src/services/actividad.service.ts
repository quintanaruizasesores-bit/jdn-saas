import type { ActividadEntidad } from '@/types/database';
import type { SupabaseClient } from '@supabase/supabase-js';

export async function logActividad(
  supabase: SupabaseClient,
  accion: string,
  entidad: ActividadEntidad,
  entidadId: string,
  metadata?: Record<string, unknown>
) {
  const { data: { user } } = await supabase.auth.getUser();
  await supabase.from('actividad').insert({
    usuario_id: user?.id ?? null,
    accion,
    entidad,
    entidad_id: entidadId,
    metadata: metadata ?? null,
  });
}
