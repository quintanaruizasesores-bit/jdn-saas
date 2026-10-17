// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';
import {
  calcularComisionMensual,
  type HistorialComision,
  type PolizaComision,
} from './comision';

const db = new PGlite();
let clienteId: string, originalId: string, ambiguaId: string, hoy: string;
let originales: unknown[], historialLegacy: unknown[];
const migration = (name: string) =>
  readFile(
    new URL(`../../../supabase/migrations/${name}`, import.meta.url),
    'utf8'
  );
async function crearPoliza() {
  return (
    await db.query<{ id: string }>(
      `INSERT INTO polizas(cliente_id,estado,fecha_inicio,prima) VALUES ($1,'VIGENTE','2020-01-01',1000) RETURNING id`,
      [clienteId]
    )
  ).rows[0].id;
}

beforeAll(async () => {
  await db.exec(`CREATE SCHEMA auth; CREATE ROLE authenticated;
    CREATE TABLE auth.users(id uuid PRIMARY KEY,email text,raw_user_meta_data jsonb);
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS 'SELECT NULL::uuid';`);
  // Sólo sustituye uuid-ossp por el generador integrado del PostgreSQL embebido.
  // El SQL de las migraciones del repositorio se conserva intacto.
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
  ])
    await db.exec(await migration(name));
  clienteId = (
    await db.query<{ id: string }>(
      `INSERT INTO clientes(nombre) VALUES ('Cliente de prueba') RETURNING id`
    )
  ).rows[0].id;
  originalId = await crearPoliza();
  ambiguaId = (
    await db.query<{ id: string }>(
      `INSERT INTO polizas(cliente_id,estado,fecha_inicio,fecha_fin,prima,legacy_id) VALUES ($1,'VIGENTE','2020-01-01','2025-01-01',2000,3) RETURNING id`,
      [clienteId]
    )
  ).rows[0].id;
  originales = (
    await db.query(
      'SELECT id,estado,fecha_inicio::text,fecha_fin::text,prima FROM polizas ORDER BY id'
    )
  ).rows;
  historialLegacy = (
    await db.query(
      'SELECT id,tipo,datos_anteriores,datos_nuevos FROM poliza_historial ORDER BY id'
    )
  ).rows;
  await db.exec(await migration('007_comisiones_recurrentes.sql'));
  hoy = (
    await db.query<{ hoy: string }>(
      `SELECT (CURRENT_TIMESTAMP AT TIME ZONE 'America/Argentina/Cordoba')::date::text AS hoy`
    )
  ).rows[0].hoy;
}, 30000);
afterAll(async () => {
  await db.close();
});

describe('migración 007 y auditoría financiera en PostgreSQL', () => {
  it('preserva premios, estados, fechas originales e historial legacy; sólo acredita desde hoy', async () => {
    expect(
      (
        await db.query(
          'SELECT id,estado,fecha_inicio::text,fecha_fin::text,prima FROM polizas ORDER BY id'
        )
      ).rows
    ).toEqual(originales);
    expect(
      (
        await db.query(
          'SELECT id,tipo,datos_anteriores,datos_nuevos FROM poliza_historial WHERE NOT completo ORDER BY id'
        )
      ).rows
    ).toEqual(historialLegacy);
    expect(
      (
        await db.query('SELECT comision_desde::text FROM polizas WHERE id=$1', [
          originalId,
        ])
      ).rows[0]
    ).toEqual({ comision_desde: hoy });
    expect(
      (
        await db.query('SELECT comision_desde FROM polizas WHERE id=$1', [
          ambiguaId,
        ])
      ).rows[0]
    ).toEqual({ comision_desde: null });
    const cartera = (
      await db.query<{ snapshot: PolizaComision }>(
        'SELECT to_jsonb(p) AS snapshot FROM polizas p'
      )
    ).rows.map((r) => r.snapshot);
    const fotos = (
      await db.query<{ snapshot: HistorialComision }>(
        'SELECT to_jsonb(h) AS snapshot FROM poliza_historial h'
      )
    ).rows.map((r) => r.snapshot);
    // Una fecha legacy pendiente de revisar no debe borrar el total actual.
    expect(
      calcularComisionMensual(cartera, new Date(), fotos).resumen.comisionActual
    ).toBe(420);
  });

  it('audita una renovación VIGENTE a VIGENTE con igual premio, una sola póliza y ambas vigencias', async () => {
    const id = await crearPoliza();
    const inicio = (
      await db.query<{ inicio: string }>(
        `SELECT (date_trunc('month',CURRENT_DATE)+INTERVAL '1 month')::date::text AS inicio`
      )
    ).rows[0].inicio;
    await db.query(
      `UPDATE polizas SET fecha_inicio=$2::date,fecha_fin=($2::date+INTERVAL '1 year'-INTERVAL '1 day')::date,comision_desde=$2::date WHERE id=$1`,
      [id, inicio]
    );
    const history = await db.query(
      `SELECT tipo,datos_anteriores,datos_nuevos,fecha_efecto::text FROM poliza_historial WHERE poliza_id=$1 AND tipo='RENOVACION'`,
      [id]
    );
    expect(history.rows).toHaveLength(1);
    expect(history.rows[0]).toMatchObject({
      tipo: 'RENOVACION',
      fecha_efecto: inicio,
      datos_anteriores: { fecha_inicio: '2020-01-01', prima: 1000 },
      datos_nuevos: {
        fecha_inicio: inicio,
        prima: 1000,
        prima_periodicidad: 'MENSUAL',
      },
    });
    expect(
      (
        await db.query('SELECT count(*)::int AS n FROM polizas WHERE id=$1', [
          id,
        ])
      ).rows[0]
    ).toEqual({ n: 1 });
    // Reprogramar sólo el vencimiento de la renovación futura también se audita.
    await db.query(
      `UPDATE polizas SET fecha_fin=fecha_fin+1,comision_desde=$2::date WHERE id=$1`,
      [id, inicio]
    );
    expect(
      (
        await db.query(
          'SELECT count(*)::int AS n FROM poliza_historial WHERE poliza_id=$1 AND completo',
          [id]
        )
      ).rows[0]
    ).toEqual({ n: 3 });
    const rows = (
      await db.query<{ snapshot: PolizaComision }>(
        'SELECT to_jsonb(p) AS snapshot FROM polizas p WHERE id=$1',
        [id]
      )
    ).rows.map((r) => r.snapshot);
    const historial = (
      await db.query<{ snapshot: HistorialComision }>(
        'SELECT to_jsonb(h) AS snapshot FROM poliza_historial h WHERE poliza_id=$1',
        [id]
      )
    ).rows.map((r) => r.snapshot);
    expect(
      calcularComisionMensual(rows, new Date(), historial).resumen
        .comisionActual
    ).toBe(140);
  });

  it('captura baja y cambio de premio simultáneos con fecha efectiva y snapshots completos', async () => {
    const id = await crearPoliza();
    await db.query(
      `UPDATE polizas SET estado='BAJA',fecha_baja=$2::date,comision_desde=$2::date,prima=2000 WHERE id=$1`,
      [id, hoy]
    );
    expect(
      (
        await db.query(
          `SELECT datos_anteriores,datos_nuevos,fecha_efecto::text,completo FROM poliza_historial WHERE poliza_id=$1 AND tipo='BAJA'`,
          [id]
        )
      ).rows[0]
    ).toMatchObject({
      datos_anteriores: {
        estado: 'VIGENTE',
        prima: 1000,
        fecha_inicio: '2020-01-01',
      },
      datos_nuevos: { estado: 'BAJA', prima: 2000, fecha_baja: hoy },
      fecha_efecto: hoy,
      completo: true,
    });
    await expect(
      db.query(
        `UPDATE polizas SET prima=3000,comision_desde='2020-01-01' WHERE id=$1`,
        [id]
      )
    ).rejects.toThrow(/no puede ser anterior/);
  });

  it('mantiene un orden inequívoco de versiones aun con varias modificaciones en una transacción', async () => {
    const id = await crearPoliza();
    await db.exec(
      `BEGIN; UPDATE polizas SET prima=1500 WHERE id='${id}'; UPDATE polizas SET prima=2000 WHERE id='${id}'; COMMIT;`
    );
    const snapshots = (
      await db.query<{
        datos_nuevos: { prima: number };
        version_orden: number;
      }>(
        'SELECT datos_nuevos,version_orden FROM poliza_historial WHERE poliza_id=$1 ORDER BY version_orden',
        [id]
      )
    ).rows;
    expect(snapshots.map((r) => r.datos_nuevos.prima)).toEqual([
      1000, 1500, 2000,
    ]);
    expect(new Set(snapshots.map((r) => r.version_orden)).size).toBe(3);
  });

  it('008 guarda y restaura colores sin cambiar cantidades ni importes de la distribución', async () => {
    await db.exec(await migration('008_companias_color.sql'));
    const id = (
      await db.query<{ id: string }>(
        `INSERT INTO companias(nombre) VALUES ('Sancor de prueba') RETURNING id`
      )
    ).rows[0].id;
    const policy = await crearPoliza();
    await db.query('UPDATE polizas SET compania_id=$2 WHERE id=$1', [
      policy,
      id,
    ]);
    const before = (
      await db.query<{
        total_polizas: number;
        prima_total: string;
        color: string | null;
      }>(
        'SELECT total_polizas,prima_total,color FROM v_polizas_por_compania WHERE compania_id=$1',
        [id]
      )
    ).rows[0];
    expect(before).toEqual({
      total_polizas: 1,
      prima_total: '1000.00',
      color: null,
    });
    await db.query('UPDATE companias SET color=$2 WHERE id=$1', [
      id,
      '#A855F7',
    ]);
    expect(
      (
        await db.query(
          'SELECT total_polizas,prima_total,color FROM v_polizas_por_compania WHERE compania_id=$1',
          [id]
        )
      ).rows[0]
    ).toEqual({ ...before, color: '#A855F7' });
    await expect(
      db.query('UPDATE companias SET color=$2 WHERE id=$1', [
        id,
        'red; display:none',
      ])
    ).rejects.toThrow(/companias_color_hex/);
    await db.query('UPDATE companias SET color=NULL WHERE id=$1', [id]);
    expect(
      (await db.query('SELECT color FROM companias WHERE id=$1', [id])).rows[0]
    ).toEqual({ color: null });
  });
});
