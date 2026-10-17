// @vitest-environment node
import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';
import { PassThrough } from 'node:stream';
import ExcelJS from 'exceljs';
import {
  escribirRespaldo,
  type CatalogoExportado,
  type FilaExportada,
} from './respaldo';
const db = new PGlite();
const migration = (name: string) =>
  readFile(
    new URL(`../../../supabase/migrations/${name}`, import.meta.url),
    'utf8'
  );
beforeAll(async () => {
  await db.exec(`CREATE SCHEMA auth; CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    CREATE TABLE auth.users(id uuid PRIMARY KEY,email text,raw_user_meta_data jsonb);
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS 'SELECT NULL::uuid';`);
  const initial = await migration('001_initial_schema.sql');
  await db.exec(
    initial
      .replace(/CREATE EXTENSION IF NOT EXISTS "uuid-ossp";/, '')
      .replaceAll('uuid_generate_v4()', 'gen_random_uuid()')
  );
  for (const name of [
    '002_views_and_functions.sql',
    '003_cliente_legacy.sql',
    '004_drop_numero_poliza.sql',
    '005_cliente_cuit_to_observaciones.sql',
    '006_app_settings.sql',
    '007_comisiones_recurrentes.sql',
    '008_companias_color.sql',
    '009_exportacion_integral.sql',
  ])
    await db.exec(await migration(name));
  await db.exec(`GRANT USAGE ON SCHEMA public TO service_role, authenticated, anon;
    GRANT SELECT ON ALL TABLES IN SCHEMA public TO service_role;
    ALTER ROLE service_role BYPASSRLS;
    INSERT INTO clientes(nombre) SELECT 'Registro sintético '||g FROM generate_series(1,1007) g;
    INSERT INTO app_settings(key,value) VALUES ('prueba','{"importe":12345678901234567890.123,"nested":{"token":"no-exportar"},"array":[{"password":"no-exportar"}],"template":"Saludo"}');`);
}, 30000);
afterAll(async () => {
  await db.close();
});
async function rpc<T>(sql: string, args: unknown[] = []) {
  return (await db.query<{ data: T }>(sql, args)).rows[0].data;
}
describe('migración 009 en PostgreSQL', () => {
  it('bloquea un futuro esquema con espacios de trabajo hasta revisar su alcance', async () => {
    await db.exec('ALTER TABLE clientes ADD COLUMN workspace_id uuid');
    await expect(
      db.query('SELECT public.exportacion_catalogo()')
    ).rejects.toThrow(/aislamiento/);
    await db.exec('ALTER TABLE clientes DROP COLUMN workspace_id');
  });
  it('descubre las 10 tablas, columnas reales, relaciones y conteos sin tocar datos', async () => {
    const antes = await db.query(
      'SELECT count(*)::int n FROM poliza_historial'
    );
    const c = await rpc<{
      tablas: {
        tabla: string;
        registros: string;
        columnas: { nombre: string }[];
      }[];
      relaciones: unknown[];
    }>('SELECT public.exportacion_catalogo() AS data');
    expect(c.tablas).toHaveLength(10);
    expect(c.tablas.find((t) => t.tabla === 'clientes')?.registros).toBe(
      '1007'
    );
    expect(
      c.tablas
        .find((t) => t.tabla === 'clientes')
        ?.columnas.map((c) => c.nombre)
    ).toContain('observaciones');
    expect(
      c.tablas.find((t) => t.tabla === 'polizas')?.columnas.map((c) => c.nombre)
    ).not.toContain('numero_poliza');
    expect(c.relaciones.length).toBeGreaterThan(10);
    expect(
      (await db.query('SELECT count(*)::int n FROM poliza_historial')).rows
    ).toEqual(antes.rows);
  });
  it('pagina por clave y recupera todos los registros, incluidos más de 1000', async () => {
    const ids: string[] = [];
    let cursor: string | null = null;
    while (true) {
      const rows: { id: string }[] = await rpc<{ id: string }[]>(
        'SELECT public.exportacion_lote($1,$2,$3) AS data',
        ['clientes', cursor, 211]
      );
      if (!rows.length) break;
      ids.push(...rows.map((r) => r.id));
      cursor = rows.at(-1)!.id;
    }
    expect(ids).toHaveLength(1007);
    expect(new Set(ids).size).toBe(1007);
    expect([...ids].sort()).toEqual(ids);
  });
  it('conserva JSON numeric sin pasar por double y excluye secretos anidados', async () => {
    const rows = await rpc<{ value: string }[]>(
      'SELECT public.exportacion_lote($1) AS data',
      ['app_settings']
    );
    expect(rows[0].value).toContain('12345678901234567890.123');
    expect(rows[0].value).not.toContain('no-exportar');
    expect(rows[0].value).toContain('[EXCLUIDO POR SEGURIDAD]');
    expect(rows[0].value).toContain('Saludo');
  });
  it('impide la ejecución RPC a anónimos y autenticados, y permite al servidor', async () => {
    for (const role of ['anon', 'authenticated']) {
      await db.exec(`SET ROLE ${role}`);
      await expect(
        db.query('SELECT public.exportacion_catalogo()')
      ).rejects.toThrow(/permission denied/);
      await expect(
        db.query(`SELECT public.exportacion_lote('clientes')`)
      ).rejects.toThrow(/permission denied/);
      await db.exec('RESET ROLE');
    }
    await db.exec('SET ROLE service_role');
    expect(
      (
        await rpc<unknown[]>('SELECT public.exportacion_lote($1) AS data', [
          'clientes',
        ])
      ).length
    ).toBe(500);
    await db.exec('RESET ROLE');
  });
  it('rechaza nombres arbitrarios, schemas técnicos y lotes inválidos', async () => {
    for (const name of [
      'auth.users',
      'clientes; DROP TABLE clientes',
      'no_existe',
    ])
      await expect(
        db.query('SELECT public.exportacion_lote($1)', [name])
      ).rejects.toThrow(/inválidos/);
    await expect(
      db.query('SELECT public.exportacion_lote($1,NULL,1001)', ['clientes'])
    ).rejects.toThrow(/inválidos/);
  });
  it('genera y reabre un Excel de las diez tablas reales, sin perder filas', async () => {
    const stream = new PassThrough(),
      chunks: Buffer[] = [];
    stream.on('data', (c) => chunks.push(c));
    await escribirRespaldo(
      {
        catalogo: () =>
          rpc<CatalogoExportado>(
            'SELECT public.exportacion_catalogo() AS data'
          ),
        lote: (tabla, despues) =>
          rpc<FilaExportada[]>(
            'SELECT public.exportacion_lote($1,$2,127) AS data',
            [tabla, despues]
          ),
      },
      stream
    );
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(Buffer.concat(chunks) as unknown as ExcelJS.Buffer);
    expect(wb.worksheets).toHaveLength(12);
    expect(wb.getWorksheet('clientes')!.rowCount).toBe(1008);
    expect(wb.getWorksheet('ÍNDICE')!.rowCount).toBe(11);
    expect(
      wb.getWorksheet('app_settings')!.getRow(2).getCell(2).value
    ).not.toContain('no-exportar');
    expect(
      wb.getWorksheet('app_settings')!.getRow(2).getCell(2).value
    ).toContain('12345678901234567890.123');
  });
  it('detecta nuevas tablas sin auditar, registra exclusiones de columnas y huellas de cambios', async () => {
    const a = await rpc<{ tablas: { tabla: string; huella: string }[] }>(
      'SELECT public.exportacion_catalogo() AS data'
    );
    await db.exec(
      `ALTER TABLE app_settings ADD COLUMN api_key text DEFAULT 'no-exportar';`
    );
    const b = await rpc<{
      tablas: {
        tabla: string;
        huella: string;
        columnas: { nombre: string; excluida: boolean }[];
      }[];
    }>('SELECT public.exportacion_catalogo() AS data');
    expect(
      b.tablas
        .find((t) => t.tabla === 'app_settings')!
        .columnas.find((c) => c.nombre === 'api_key')!.excluida
    ).toBe(true);
    const lote = await rpc<Record<string, string>[]>(
      'SELECT public.exportacion_lote($1) AS data',
      ['app_settings']
    );
    expect(lote[0]).not.toHaveProperty('api_key');
    expect(a.tablas.find((t) => t.tabla === 'app_settings')!.huella).not.toBe(
      b.tablas.find((t) => t.tabla === 'app_settings')!.huella
    );
    await db.exec('CREATE TABLE tabla_no_auditada(id text)');
    await expect(
      db.query('SELECT public.exportacion_catalogo()')
    ).rejects.toThrow(/sin revisar/);
    await db.exec('DROP TABLE tabla_no_auditada');
  });
});
