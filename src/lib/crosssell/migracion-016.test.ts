// @vitest-environment node
import { beforeAll, describe, expect, it } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';

// Valida contra Postgres embebido que la migración 016 aplica, que el trigger
// asigna el workspace, que las restricciones anti-duplicados funcionan y que la
// RLS aísla por workspace.

const db = new PGlite();
let wsA: string;
let uidA: string;
let uidB: string;
let ramoA: string;
let clienteA: string;

async function setUid(uid: string | null) {
  await db.exec(`SET test.uid = '${uid ?? ''}';`);
}

beforeAll(async () => {
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
      IF NEW.workspace_id IS NOT NULL AND NEW.workspace_id IS DISTINCT FROM actual THEN
        RAISE EXCEPTION 'workspace_id inválido';
      END IF;
      NEW.workspace_id := actual;
      RETURN NEW;
    END $$;
    -- Prerrequisitos mínimos de clientes/ramos con clave compuesta (de 013).
    CREATE TABLE public.clientes (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      workspace_id uuid NOT NULL,
      nombre text, apellido text, deleted_at timestamptz,
      UNIQUE (workspace_id, id)
    );
    CREATE TABLE public.ramos (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      workspace_id uuid NOT NULL,
      nombre text,
      UNIQUE (workspace_id, id)
    );
  `);

  const sql = await readFile(
    new URL('../../../supabase/migrations/016_crosssell_core.sql', import.meta.url),
    'utf8'
  );
  await db.exec(sql);

  uidA = (await db.query<{ gen_random_uuid: string }>(`SELECT gen_random_uuid()`))
    .rows[0].gen_random_uuid;
  uidB = (await db.query<{ gen_random_uuid: string }>(`SELECT gen_random_uuid()`))
    .rows[0].gen_random_uuid;
  wsA = (
    await db.query<{ id: string }>(
      `INSERT INTO public.workspaces(owner_user_id, nombre) VALUES ($1,'A') RETURNING id`,
      [uidA]
    )
  ).rows[0].id;
  await db.query(
    `INSERT INTO public.workspaces(owner_user_id, nombre) VALUES ($1,'B')`,
    [uidB]
  );
  ramoA = (
    await db.query<{ id: string }>(
      `INSERT INTO public.ramos(workspace_id, nombre) VALUES ($1,'Automotores') RETURNING id`,
      [wsA]
    )
  ).rows[0].id;
  clienteA = (
    await db.query<{ id: string }>(
      `INSERT INTO public.clientes(workspace_id, nombre, apellido) VALUES ($1,'Juan','Pérez') RETURNING id`,
      [wsA]
    )
  ).rows[0].id;
});

describe('migración 016 (cross-selling core)', () => {
  it('el trigger asigna workspace_id desde la sesión', async () => {
    await setUid(uidA);
    const cat = await db.query<{ workspace_id: string; id: string }>(
      `INSERT INTO public.crosssell_categoria(nombre, slug) VALUES ('Hogar','hogar') RETURNING workspace_id, id`
    );
    expect(cat.rows[0].workspace_id).toBe(wsA);
  });

  it('impide una segunda oportunidad para el mismo cliente + categoría', async () => {
    await setUid(uidA);
    const catId = (
      await db.query<{ id: string }>(
        `SELECT id FROM public.crosssell_categoria WHERE slug='hogar'`
      )
    ).rows[0].id;
    await db.query(
      `INSERT INTO public.crosssell_oportunidad(cliente_id, categoria_objetivo_id) VALUES ($1,$2)`,
      [clienteA, catId]
    );
    await expect(
      db.query(
        `INSERT INTO public.crosssell_oportunidad(cliente_id, categoria_objetivo_id) VALUES ($1,$2)`,
        [clienteA, catId]
      )
    ).rejects.toThrow();
  });

  it('solo permite una exclusión global por cliente', async () => {
    await setUid(uidA);
    await db.query(
      `INSERT INTO public.crosssell_exclusion(cliente_id) VALUES ($1)`,
      [clienteA]
    );
    await expect(
      db.query(`INSERT INTO public.crosssell_exclusion(cliente_id) VALUES ($1)`, [
        clienteA,
      ])
    ).rejects.toThrow();
  });

  it('el mapeo exige que ramo y categoría sean del mismo workspace (FK compuesta)', async () => {
    await setUid(uidB);
    // Categoría del workspace B.
    const catB = (
      await db.query<{ id: string }>(
        `INSERT INTO public.crosssell_categoria(nombre, slug) VALUES ('Hogar','hogar') RETURNING id`
      )
    ).rows[0].id;
    // ramoA pertenece al workspace A → la FK compuesta debe rechazarlo.
    await expect(
      db.query(
        `INSERT INTO public.crosssell_ramo_map(ramo_id, categoria_id) VALUES ($1,$2)`,
        [ramoA, catB]
      )
    ).rejects.toThrow();
  });

  it('todas las tablas tienen RLS habilitada y política de aislamiento por workspace', async () => {
    const tablas = [
      'crosssell_categoria',
      'crosssell_ramo_map',
      'crosssell_regla',
      'crosssell_oportunidad',
      'crosssell_exclusion',
      'crosssell_evento',
    ];
    for (const t of tablas) {
      const rls = await db.query<{ relrowsecurity: boolean }>(
        `SELECT relrowsecurity FROM pg_class WHERE oid = ('public.' || $1)::regclass`,
        [t]
      );
      expect(rls.rows[0].relrowsecurity, `${t} RLS`).toBe(true);
      // La política usa current_workspace_id() tanto en USING como en WITH CHECK.
      const pol = await db.query<{ qual: string | null; withcheck: string | null }>(
        `SELECT qual, with_check AS withcheck FROM pg_policies
         WHERE schemaname='public' AND tablename=$1 AND policyname = $1 || '_workspace_isolation'`,
        [t]
      );
      expect(pol.rows.length, `${t} política`).toBe(1);
      expect(pol.rows[0].qual ?? '', `${t} USING`).toContain(
        'current_workspace_id'
      );
      expect(pol.rows[0].withcheck ?? '', `${t} WITH CHECK`).toContain(
        'current_workspace_id'
      );
    }
  });
});
