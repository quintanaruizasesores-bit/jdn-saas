// @vitest-environment node
import { beforeAll, describe, expect, it } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';

// Valida la migración 017: reclamo atómico de envío individual (anti doble-envío),
// unicidad de supresión y la RPC crosssell_suprimir.

const db = new PGlite();
let ws: string;
let uid: string;
let correoId: string;

async function reclamar(id: string): Promise<string | null> {
  const r = await db.query<{ crosssell_reclamar_correo: string | null }>(
    `SELECT public.crosssell_reclamar_correo($1::uuid) AS crosssell_reclamar_correo`,
    [id]
  );
  return r.rows[0].crosssell_reclamar_correo;
}

beforeAll(async () => {
  await db.exec(`
    CREATE SCHEMA auth;
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT NULLIF(current_setting('test.uid', true), '')::uuid $$;
    CREATE FUNCTION update_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END $$;
    CREATE TABLE public.workspaces (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), owner_user_id uuid, nombre text);
    CREATE FUNCTION public.current_workspace_id() RETURNS uuid LANGUAGE sql STABLE AS $$
      SELECT w.id FROM public.workspaces w WHERE w.owner_user_id = auth.uid() $$;
    CREATE FUNCTION public.assign_workspace_id() RETURNS trigger LANGUAGE plpgsql AS $$
    DECLARE actual uuid;
    BEGIN
      SELECT public.current_workspace_id() INTO actual;
      IF actual IS NULL THEN RAISE EXCEPTION 'No hay workspace para el usuario autenticado'; END IF;
      IF NEW.workspace_id IS NOT NULL AND NEW.workspace_id IS DISTINCT FROM actual THEN
        RAISE EXCEPTION 'workspace_id inválido'; END IF;
      NEW.workspace_id := actual; RETURN NEW;
    END $$;
    CREATE TABLE public.clientes (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), workspace_id uuid NOT NULL, nombre text, apellido text, deleted_at timestamptz, UNIQUE (workspace_id, id));
    CREATE TABLE public.ramos (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), workspace_id uuid NOT NULL, nombre text, UNIQUE (workspace_id, id));
  `);

  for (const f of ['016_crosssell_core.sql', '017_crosssell_correos.sql']) {
    const sql = await readFile(
      new URL(`../../../supabase/migrations/${f}`, import.meta.url),
      'utf8'
    );
    await db.exec(sql);
  }

  uid = (await db.query<{ gen_random_uuid: string }>(`SELECT gen_random_uuid()`))
    .rows[0].gen_random_uuid;
  ws = (
    await db.query<{ id: string }>(
      `INSERT INTO public.workspaces(owner_user_id, nombre) VALUES ($1,'A') RETURNING id`,
      [uid]
    )
  ).rows[0].id;
  await db.exec(`SET test.uid = '${uid}';`);
  const cliente = (
    await db.query<{ id: string }>(
      `INSERT INTO public.clientes(workspace_id, nombre, apellido) VALUES ($1,'Juan','Pérez') RETURNING id`,
      [ws]
    )
  ).rows[0].id;
  correoId = (
    await db.query<{ id: string }>(
      `INSERT INTO public.crosssell_correo(cliente_id, asunto, cuerpo_text, destinatario_email)
       VALUES ($1,'Hola','Cuerpo','cli@example.com') RETURNING id`,
      [cliente]
    )
  ).rows[0].id;
});

describe('crosssell_reclamar_correo', () => {
  it('reclama un borrador una sola vez y lo deja ENVIANDO', async () => {
    const id1 = await reclamar(correoId);
    expect(id1).toBe(correoId);
    const estado = (
      await db.query<{ estado: string }>(
        `SELECT estado FROM public.crosssell_correo WHERE id=$1`,
        [correoId]
      )
    ).rows[0].estado;
    expect(estado).toBe('ENVIANDO');
    // En curso (<15 min) → no se vuelve a reclamar.
    expect(await reclamar(correoId)).toBeNull();
  });

  it('no reclama un correo ya ENVIADO', async () => {
    await db.query(
      `UPDATE public.crosssell_correo SET estado='ENVIADO' WHERE id=$1`,
      [correoId]
    );
    expect(await reclamar(correoId)).toBeNull();
  });
});

describe('crosssell_suprimir', () => {
  it('registra la supresión de forma idempotente', async () => {
    await db.query(`SELECT public.crosssell_suprimir('Baja@Example.com','MANUAL','ui')`);
    await db.query(`SELECT public.crosssell_suprimir('baja@example.com','BAJA','otra')`);
    const n = (
      await db.query<{ c: number }>(
        `SELECT count(*)::int AS c FROM public.crosssell_supresion WHERE workspace_id=$1`,
        [ws]
      )
    ).rows[0].c;
    expect(n).toBe(1);
  });

  it('el índice único es por workspace + email en minúsculas', async () => {
    const email = (
      await db.query<{ email: string }>(
        `SELECT email FROM public.crosssell_supresion WHERE workspace_id=$1 LIMIT 1`,
        [ws]
      )
    ).rows[0].email;
    expect(email).toBe('baja@example.com');
  });
});
