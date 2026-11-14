import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  fetchEmailPrefs,
  fetchEmailPrefsRow,
  fetchTareasVencidas,
  saveEmailPrefs,
} from './notificaciones.service';

/** Builder encadenable y "awaitable" que resuelve a `result`. */
function makeQuery(result: { data?: unknown; error?: unknown }) {
  const q: Record<string, unknown> = {};
  for (const m of ['select', 'eq', 'not', 'lt', 'order']) {
    q[m] = vi.fn().mockReturnValue(q);
  }
  q.maybeSingle = vi.fn().mockResolvedValue(result);
  q.upsert = vi.fn().mockResolvedValue(result);
  // Hace al builder awaitable (como PostgREST).
  q.then = (resolve: (v: unknown) => void) => resolve(result);
  return q;
}

describe('fetchEmailPrefsRow / fetchEmailPrefs', () => {
  it('devuelve la fila cruda tal cual', async () => {
    const q = makeQuery({
      data: {
        workspace_id: 'w1',
        activo: true,
        destinatario: 'a@b.com',
        hora_local: 9,
        zona_horaria: 'America/Argentina/Buenos_Aires',
      },
      error: null,
    });
    const client = {
      from: vi.fn().mockReturnValue(q),
    } as unknown as SupabaseClient;
    const row = await fetchEmailPrefsRow(client);
    expect(row?.workspace_id).toBe('w1');
    expect(client.from).toHaveBeenCalledWith('notificacion_email_prefs');
  });

  it('devuelve defaults si la tabla no existe (42P01)', async () => {
    const q = makeQuery({ data: null, error: { code: '42P01' } });
    const client = {
      from: vi.fn().mockReturnValue(q),
    } as unknown as SupabaseClient;
    expect(await fetchEmailPrefsRow(client)).toBeNull();
    const prefs = await fetchEmailPrefs(client);
    expect(prefs.activo).toBe(false);
    expect(prefs.zona_horaria).toBe('America/Argentina/Buenos_Aires');
  });

  it('propaga otros errores', async () => {
    const q = makeQuery({
      data: null,
      error: { code: 'XXXXX', message: 'boom' },
    });
    const client = {
      from: vi.fn().mockReturnValue(q),
    } as unknown as SupabaseClient;
    await expect(fetchEmailPrefsRow(client)).rejects.toMatchObject({
      code: 'XXXXX',
    });
  });
});

describe('saveEmailPrefs', () => {
  it('hace upsert con onConflict workspace_id y sin workspace_id en el payload', async () => {
    const q = makeQuery({ error: null });
    const client = {
      from: vi.fn().mockReturnValue(q),
    } as unknown as SupabaseClient;
    await saveEmailPrefs(client, {
      activo: true,
      destinatario: 'a@b.com',
      hora_local: 9,
      zona_horaria: 'America/Argentina/Buenos_Aires',
    });
    const [payload, opts] = (q.upsert as ReturnType<typeof vi.fn>).mock
      .calls[0];
    expect(payload).not.toHaveProperty('workspace_id');
    expect(payload.destinatario).toBe('a@b.com');
    expect(opts).toEqual({ onConflict: 'workspace_id' });
  });
});

describe('fetchTareasVencidas', () => {
  it('filtra pendientes con vencimiento anterior a hoy y mapea cliente/póliza', async () => {
    const q = makeQuery({
      data: [
        {
          id: 't1',
          titulo: 'Llamar',
          fecha_vencimiento: '2026-11-01',
          created_at: '2026-10-01',
          cliente: { nombre: 'Juan', apellido: 'Pérez' },
          poliza: { detalle: 'ABC 123' },
        },
        {
          id: 't2',
          titulo: 'Revisar',
          fecha_vencimiento: '2026-11-02',
          created_at: '2026-10-02',
          cliente: null,
          poliza: null,
        },
      ],
      error: null,
    });
    const client = {
      from: vi.fn().mockReturnValue(q),
    } as unknown as SupabaseClient;

    const res = await fetchTareasVencidas(client, {
      hoyLocal: '2026-11-10',
      workspaceId: 'w1',
    });

    expect(client.from).toHaveBeenCalledWith('tareas');
    expect(q.eq).toHaveBeenCalledWith('estado', 'PENDIENTE');
    expect(q.not).toHaveBeenCalledWith('fecha_vencimiento', 'is', null);
    expect(q.lt).toHaveBeenCalledWith('fecha_vencimiento', '2026-11-10');
    expect(q.eq).toHaveBeenCalledWith('workspace_id', 'w1');
    expect(res).toEqual([
      {
        id: 't1',
        titulo: 'Llamar',
        fecha_vencimiento: '2026-11-01',
        cliente_nombre: 'Juan Pérez',
        poliza_detalle: 'ABC 123',
      },
      {
        id: 't2',
        titulo: 'Revisar',
        fecha_vencimiento: '2026-11-02',
        cliente_nombre: null,
        poliza_detalle: null,
      },
    ]);
  });

  it('sin workspaceId no filtra por workspace (confía en RLS)', async () => {
    const q = makeQuery({ data: [], error: null });
    const client = {
      from: vi.fn().mockReturnValue(q),
    } as unknown as SupabaseClient;
    await fetchTareasVencidas(client, { hoyLocal: '2026-11-10' });
    const eqCalls = (q.eq as ReturnType<typeof vi.fn>).mock.calls.map(
      (c) => c[0]
    );
    expect(eqCalls).not.toContain('workspace_id');
  });
});
