import { describe, it, expect, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  fetchBirthdaySettings,
  saveBirthdaySettings,
  DEFAULT_BIRTHDAY_SETTINGS,
  BIRTHDAY_SETTINGS_KEY,
} from './settings.service';

/** Stub para la cadena .from().select().eq().maybeSingle() */
function makeSelectStub(resolved: { data: unknown; error: unknown }) {
  const builder: Record<string, unknown> = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    maybeSingle: vi.fn(() => Promise.resolve(resolved)),
  };
  const supabase = { from: vi.fn(() => builder) } as unknown as SupabaseClient;
  return { supabase, builder };
}

describe('fetchBirthdaySettings', () => {
  it('devuelve defaults cuando no hay registro', async () => {
    const { supabase } = makeSelectStub({ data: null, error: null });
    expect(await fetchBirthdaySettings(supabase)).toEqual(DEFAULT_BIRTHDAY_SETTINGS);
  });

  it('devuelve defaults si la tabla no existe (42P01)', async () => {
    const { supabase } = makeSelectStub({ data: null, error: { code: '42P01' } });
    expect(await fetchBirthdaySettings(supabase)).toEqual(DEFAULT_BIRTHDAY_SETTINGS);
  });

  it('propaga otros errores', async () => {
    const { supabase } = makeSelectStub({ data: null, error: { code: '500', message: 'boom' } });
    await expect(fetchBirthdaySettings(supabase)).rejects.toMatchObject({ message: 'boom' });
  });

  it('mergea el valor guardado con defaults', async () => {
    const { supabase } = makeSelectStub({
      data: { value: { template: 'Hola {{nombre}}', empresa: '  ' } },
      error: null,
    });
    const r = await fetchBirthdaySettings(supabase);
    expect(r.template).toBe('Hola {{nombre}}');
    // empresa en blanco → cae al default
    expect(r.empresa).toBe(DEFAULT_BIRTHDAY_SETTINGS.empresa);
  });
});

describe('saveBirthdaySettings', () => {
  it('hace upsert con la clave birthday', async () => {
    const upsert = vi.fn(() => Promise.resolve({ error: null }));
    const supabase = { from: vi.fn(() => ({ upsert })) } as unknown as SupabaseClient;

    await saveBirthdaySettings(supabase, { template: 'T', empresa: 'E' });

    expect(upsert).toHaveBeenCalledTimes(1);
    const [payload, opts] = upsert.mock.calls[0] as unknown as [
      Record<string, unknown>,
      Record<string, unknown>,
    ];
    expect(payload).toMatchObject({ key: BIRTHDAY_SETTINGS_KEY, value: { template: 'T', empresa: 'E' } });
    expect(opts).toEqual({ onConflict: 'key' });
  });

  it('propaga el error del upsert', async () => {
    const upsert = vi.fn(() => Promise.resolve({ error: new Error('nope') }));
    const supabase = { from: vi.fn(() => ({ upsert })) } as unknown as SupabaseClient;
    await expect(saveBirthdaySettings(supabase, { template: 'T', empresa: 'E' })).rejects.toThrow('nope');
  });
});
