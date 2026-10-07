import type { SupabaseClient } from '@supabase/supabase-js';
import type { BirthdaySettings } from '@/types/database';
import { DEFAULT_BIRTHDAY_TEMPLATE, DEFAULT_EMPRESA } from '@/lib/cumpleanos/plantilla';

/** Clave bajo la que se guarda la configuración de cumpleaños en app_settings. */
export const BIRTHDAY_SETTINGS_KEY = 'birthday';

export const DEFAULT_BIRTHDAY_SETTINGS: BirthdaySettings = {
  template: DEFAULT_BIRTHDAY_TEMPLATE,
  empresa: DEFAULT_EMPRESA,
};

/** Código de Postgres para "la tabla/relación no existe" (migración sin aplicar). */
const UNDEFINED_TABLE = '42P01';

function mergeWithDefaults(value: Partial<BirthdaySettings> | null | undefined): BirthdaySettings {
  return {
    template:
      typeof value?.template === 'string' && value.template.trim()
        ? value.template
        : DEFAULT_BIRTHDAY_SETTINGS.template,
    empresa:
      typeof value?.empresa === 'string' && value.empresa.trim()
        ? value.empresa
        : DEFAULT_BIRTHDAY_SETTINGS.empresa,
  };
}

/**
 * Lee la configuración de cumpleaños. Si todavía no hay registro, o si la tabla
 * `app_settings` aún no fue creada (migración 006 sin aplicar), devuelve los
 * valores por defecto en lugar de romper la página.
 */
export async function fetchBirthdaySettings(
  supabase: SupabaseClient
): Promise<BirthdaySettings> {
  const { data, error } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', BIRTHDAY_SETTINGS_KEY)
    .maybeSingle();

  if (error) {
    if (error.code === UNDEFINED_TABLE) return DEFAULT_BIRTHDAY_SETTINGS;
    throw error;
  }

  return mergeWithDefaults(data?.value as Partial<BirthdaySettings> | undefined);
}

/** Guarda (upsert) la configuración de cumpleaños. */
export async function saveBirthdaySettings(
  supabase: SupabaseClient,
  settings: BirthdaySettings
): Promise<void> {
  const { error } = await supabase
    .from('app_settings')
    .upsert(
      { key: BIRTHDAY_SETTINGS_KEY, value: settings, updated_at: new Date().toISOString() },
      { onConflict: 'key' }
    );
  if (error) throw error;
}
