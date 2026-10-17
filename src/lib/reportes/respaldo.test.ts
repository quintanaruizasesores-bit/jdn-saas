// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { PassThrough } from 'node:stream';
import ExcelJS from 'exceljs';
import {
  escribirRespaldo,
  textoRespaldo,
  type CatalogoExportado,
  type FuenteRespaldo,
} from './respaldo';
import { puedeExportar } from './autorizacion';
const tabla = {
  tabla: 'clientes',
  registros: '1005',
  huella: 'test',
  columnas: ['id', 'importe', 'nombre', 'nulo', 'vacio', 'original'].map(
    (nombre) => ({ nombre, tipo: 'text', nullable: true, excluida: false })
  ),
};
const catalogo: CatalogoExportado = { tablas: [tabla], relaciones: [] };
const filas = Array.from({ length: 1005 }, (_, i) => ({
  id: String(i).padStart(6, '0'),
  importe: '123456789012.34',
  nombre: i === 0 ? '=HYPERLINK("https://example.invalid")' : 'Prueba',
  nulo: null,
  vacio: '',
  original: '\\N',
}));
const fuente: FuenteRespaldo = {
  catalogo: async () => catalogo,
  lote: async (_, cursor) =>
    filas.filter((f) => cursor === null || f.id > cursor).slice(0, 137),
};
async function generar(f: FuenteRespaldo, max = 1048575) {
  const stream = new PassThrough();
  const partes: Buffer[] = [];
  stream.on('data', (c) => partes.push(c));
  await escribirRespaldo(f, stream, new Date('2026-10-17T15:00:00Z'), max);
  return Buffer.concat(partes);
}
describe('Excel integral', () => {
  it('exporta más de 1000, divide hojas, abre ZIP/XLSX y conserva precisión/nulos/fórmulas como texto', async () => {
    const buffer = await generar(fuente, 600);
    expect(buffer.subarray(0, 2).toString()).toBe('PK');
    const libro = new ExcelJS.Workbook();
    await libro.xlsx.load(buffer as unknown as ExcelJS.Buffer);
    expect(libro.worksheets.map((s) => s.name)).toEqual([
      'ÍNDICE',
      'MANIFIESTO',
      'clientes',
      'clientes_2',
    ]);
    expect(libro.getWorksheet('clientes')!.rowCount).toBe(601);
    expect(libro.getWorksheet('clientes_2')!.rowCount).toBe(406);
    const s = libro.getWorksheet('clientes')!;
    expect(s.getCell('A2').value).toBe('000000');
    expect(s.getCell('B2').value).toBe('123456789012.34');
    expect(s.getCell('C2').type).toBe(ExcelJS.ValueType.String);
    expect(s.getCell('C2').value).toBe(filas[0].nombre);
    expect(s.getCell('D2').value).toBe('\\N');
    expect(s.getCell('E2').value).toBe('\\E');
    expect(s.getCell('F2').value).toBe('\\\\N');
    expect(libro.getWorksheet('ÍNDICE')!.getCell('B2').value).toBe('1005');
  });
  it('no acepta una lectura truncada ni cambios concurrentes', async () => {
    await expect(generar({ ...fuente, lote: async () => [] })).rejects.toThrow(
      /cambió/
    );
    let lecturas = 0;
    await expect(
      generar({
        ...fuente,
        catalogo: async () =>
          ++lecturas === 1
            ? catalogo
            : { ...catalogo, tablas: [{ ...tabla, huella: 'distinta' }] },
      })
    ).rejects.toThrow(/cambiaron/);
  });
  it('conserva textos largos en partes y rechaza lotes repetidos y cancelaciones', async () => {
    const f: FuenteRespaldo = {
      catalogo: async () => ({
        ...catalogo,
        tablas: [{ ...tabla, registros: '1' }],
      }),
      lote: async (_, cursor) =>
        cursor ? [] : [{ ...filas[0], nombre: 'x'.repeat(32768) }],
    };
    const largo = new ExcelJS.Workbook();
    await largo.xlsx.load((await generar(f)) as unknown as ExcelJS.Buffer);
    expect(largo.getWorksheet('clientes')!.getCell('C2').value).toBe('\\L1');
    const partes = largo.getWorksheet('TEXTOS_LARGOS')!;
    expect(
      String(partes.getCell('F2').value) + String(partes.getCell('F3').value)
    ).toBe('x'.repeat(32768));
    await expect(
      generar({ ...fuente, lote: async () => [filas[0]] })
    ).rejects.toThrow(/Paginación/);
    await expect(
      escribirRespaldo(
        fuente,
        new PassThrough(),
        new Date(),
        undefined,
        () => true
      )
    ).rejects.toThrow(/cancelada/);
  });
  it('NULL y barra invertida tienen una codificación distinta y reversible', () => {
    expect(textoRespaldo(null)).toBe('\\N');
    expect(textoRespaldo('\\N')).toBe('\\\\N');
    expect(textoRespaldo('')).toBe('\\E');
    expect(textoRespaldo('a\u0001b')).toBe('\\J"a\\u0001b"');
  });
});
describe('administradores autorizados para exportar', () => {
  it('rechaza anónimos, otros roles, listas vacías y ADMIN autoasignados', () => {
    expect(puedeExportar('u1', 'ADMIN', undefined)).toBe(false);
    expect(puedeExportar('u1', 'ADMIN', 'u2')).toBe(false);
    expect(puedeExportar('u1', 'PRODUCTOR', 'u1')).toBe(false);
    expect(puedeExportar('u1', null, 'u1')).toBe(false);
    expect(puedeExportar('u1', 'ADMIN', ' u2, u1 ')).toBe(true);
  });
});
