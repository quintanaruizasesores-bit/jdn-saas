// @vitest-environment node
import { beforeAll, describe, expect, it } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';

// Valida contra un Postgres embebido el reclamo atómico del resumen diario y el
// índice único parcial (anti-duplicados), que los mocks no pueden ejercitar.

const db = new PGlite();
let workspaceId: string;

async function reclamar(fecha: string, max = 3): Promise<string | null> {
  const r = await db.query<{ reclamar_resumen_diario: string | null }>(
    `SELECT public.reclamar_resumen_diario($1::uuid, $2::date, $3) AS reclamar_resumen_diario`,
    [workspaceId, fecha, max]
  );
  return r.rows[0].reclamar_resumen_diario;
}

async function setEstado(id: string, estado: string) {
  await db.query(
    `UPDATE public.notificacion_email_envios SET estado=$2 WHERE id=$1`,
    [id, estado]
  );
}

beforeAll(async () => {
  // Prerrequisitos mínimos de 012/013 (sin acoplar a datos de producción).
  await db.exec(`
    CREATE SCHEMA auth;
    CREATE ROLE anon;
    CREATE ROLE authenticated;
    CREATE ROLE service_role;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT NULLIF(current_setting('test.uid', true), '')::uuid $$;
    CREATE FUNCTION update_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END $$;
    CREATE TABLE public.workspaces (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      owner_user_id uuid,
      nombre text
    );
    CREATE FUNCTION public.current_workspace_id() RETURNS uuid LANGUAGE sql STABLE AS $$
      SELECT w.id FROM public.workspaces w WHERE w.owner_user_id = auth.uid() $$;
    CREATE FUNCTION public.assign_workspace_id() RETURNS trigger LANGUAGE plpgsql AS $$
    DECLARE actual uuid;
    BEGIN
      SELECT public.current_workspace_id() INTO actual;
      IF actual IS NULL THEN RAISE EXCEPTION 'No hay workspace para el usuario autenticado'; END IF;
      NEW.workspace_id := actual;
      RETURN NEW;
    END $$;
  `);

  // Aplica la migración 015 tal cual.
  const sql = await readFile(
    new URL(
      '../../../supabase/migrations/015_notificaciones_email.sql',
      import.meta.url
    ),
    'utf8'
  );
  await db.exec(sql);

  workspaceId = (
    await db.query<{ id: string }>(
      `INSERT INTO public.workspaces(owner_user_id, nombre) VALUES (gen_random_uuid(), 'WS') RETURNING id`
    )
  ).rows[0].id;
});

describe('reclamar_resumen_diario', () => {
  it('reclama una sola vez por día (dedup ante concurrencia)', async () => {
    const id1 = await reclamar('2026-11-10');
    expect(id1).toBeTruthy();
    // Segundo intento el mismo día: ya está ENVIANDO → no se reclama.
    expect(await reclamar('2026-11-10')).toBeNull();
  });

  it('permite reintentos controlados hasta el máximo tras un ERROR', async () => {
    const fecha = '2026-11-11';
    const id1 = await reclamar(fecha); // intentos=1
    expect(id1).toBeTruthy();

    await setEstado(id1!, 'ERROR');
    const id2 = await reclamar(fecha); // 1<3 → intentos=2
    expect(id2).toBe(id1);

    await setEstado(id1!, 'ERROR');
    const id3 = await reclamar(fecha); // 2<3 → intentos=3
    expect(id3).toBe(id1);

    await setEstado(id1!, 'ERROR');
    // 3<3 es falso → no más reintentos.
    expect(await reclamar(fecha)).toBeNull();

    const intentos = (
      await db.query<{ intentos: number }>(
        `SELECT intentos FROM public.notificacion_email_envios WHERE id=$1`,
        [id1]
      )
    ).rows[0].intentos;
    expect(intentos).toBe(3);
  });

  it('no reclama una fila ya ENVIADA', async () => {
    const fecha = '2026-11-12';
    const id1 = await reclamar(fecha);
    await setEstado(id1!, 'ENVIADO');
    expect(await reclamar(fecha)).toBeNull();
  });

  it('el índice único parcial bloquea un segundo resumen directo del mismo día', async () => {
    await reclamar('2026-11-13');
    await expect(
      db.query(
        `INSERT INTO public.notificacion_email_envios(workspace_id, tipo, fecha_local, estado)
         VALUES ($1, 'RESUMEN_DIARIO', '2026-11-13', 'ENVIANDO')`,
        [workspaceId]
      )
    ).rejects.toThrow();
  });

  it('permite múltiples envíos de PRUEBA el mismo día (fuera del índice único)', async () => {
    for (let i = 0; i < 2; i++) {
      await db.query(
        `INSERT INTO public.notificacion_email_envios(workspace_id, tipo, fecha_local, estado)
         VALUES ($1, 'PRUEBA', '2026-11-13', 'ENVIADO')`,
        [workspaceId]
      );
    }
    const n = (
      await db.query<{ c: number }>(
        `SELECT count(*)::int AS c FROM public.notificacion_email_envios WHERE tipo='PRUEBA'`
      )
    ).rows[0].c;
    expect(n).toBe(2);
  });
});
