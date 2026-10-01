import { describe, it, expect } from 'vitest';
import { toCsv, toXlsx, toPdf, type Cell } from './format';

describe('toCsv', () => {
  it('dataset vacío → solo encabezados', () => {
    expect(toCsv(['A', 'B'], [])).toBe('"A","B"');
  });

  it('un registro', () => {
    expect(toCsv(['A'], [['x']])).toBe('"A"\r\n"x"');
  });

  it('múltiples registros → una línea por fila + encabezado', () => {
    const csv = toCsv(['A'], [['x'], ['y'], ['z']]);
    expect(csv.split('\r\n')).toHaveLength(4);
  });

  it('escapa comillas internas duplicándolas (RFC 4180)', () => {
    expect(toCsv(['A'], [['a"b']])).toBe('"A"\r\n"a""b"');
  });

  it('una coma dentro de un valor no agrega columnas ni filas', () => {
    const csv = toCsv(['A'], [['x,y']]);
    expect(csv.split('\r\n')).toHaveLength(2);
    expect(csv).toContain('"x,y"');
  });

  it('un salto de línea dentro de un valor queda contenido entre comillas', () => {
    const csv = toCsv(['A'], [['linea1\nlinea2']]);
    // el \n interno no debe romper en una fila extra de datos
    expect(csv.startsWith('"A"\r\n"linea1\nlinea2"')).toBe(true);
  });

  it('números y fechas se serializan como texto', () => {
    expect(toCsv(['N', 'D'], [[42, '2024-01-15']])).toBe('"N","D"\r\n"42","2024-01-15"');
  });

  it('null y undefined se vuelven celdas vacías', () => {
    expect(toCsv(['A', 'B'], [[null, undefined]])).toBe('"A","B"\r\n"",""');
  });

  it('caracteres especiales / acentos se preservan', () => {
    expect(toCsv(['Compañía'], [['Pérez & Cía']])).toContain('Pérez & Cía');
  });
});

describe('toXlsx', () => {
  it('genera un buffer XLSX válido (firma ZIP "PK")', async () => {
    const buf = await toXlsx(['A', 'B'], [['1', '2']]);
    expect(buf.length).toBeGreaterThan(0);
    expect(buf[0]).toBe(0x50); // P
    expect(buf[1]).toBe(0x4b); // K
  });

  it('funciona con dataset vacío', async () => {
    const buf = await toXlsx(['A'], []);
    expect(buf[0]).toBe(0x50);
    expect(buf[1]).toBe(0x4b);
  });

  it('no rompe con celdas null/undefined', async () => {
    const rows: Cell[][] = [[null, undefined]];
    const buf = await toXlsx(['A', 'B'], rows);
    expect(buf.length).toBeGreaterThan(0);
  });
});

describe('toPdf', () => {
  it('genera un buffer PDF válido (firma "%PDF")', () => {
    const bytes = new Uint8Array(toPdf('clientes', ['A'], [['x']]));
    expect(bytes.length).toBeGreaterThan(0);
    expect(Array.from(bytes.slice(0, 4))).toEqual([0x25, 0x50, 0x44, 0x46]); // %PDF
  });

  it('funciona con dataset vacío', () => {
    const bytes = new Uint8Array(toPdf('vacio', ['A'], []));
    expect(Array.from(bytes.slice(0, 4))).toEqual([0x25, 0x50, 0x44, 0x46]);
  });

  it('serializa números y celdas nulas sin lanzar', () => {
    expect(() => toPdf('mix', ['N', 'X'], [[42, null]])).not.toThrow();
  });
});
