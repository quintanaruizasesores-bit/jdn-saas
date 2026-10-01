import ExcelJS from 'exceljs';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export type Cell = string | number | null | undefined;

function cellToString(value: Cell): string {
  if (value === null || value === undefined) return '';
  return String(value);
}

/**
 * Serializa a CSV siguiendo RFC 4180: cada celda se envuelve en comillas y las
 * comillas internas se duplican. Así valores con comas, comillas o saltos de
 * línea no corrompen el archivo.
 */
export function toCsv(headers: string[], rows: Cell[][]): string {
  const escape = (value: Cell) => `"${cellToString(value).replace(/"/g, '""')}"`;
  const lines = [headers.map(escape).join(','), ...rows.map((r) => r.map(escape).join(','))];
  return lines.join('\r\n');
}

/** Genera un workbook XLSX (un buffer ZIP que comienza con la firma `PK`). */
export async function toXlsx(headers: string[], rows: Cell[][]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Reporte');
  sheet.addRow(headers);
  rows.forEach((r) => sheet.addRow(r.map((c) => (c === null || c === undefined ? '' : c))));
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

/** Genera un PDF tabular (un buffer que comienza con la firma `%PDF`). */
export function toPdf(titulo: string, headers: string[], rows: Cell[][]): ArrayBuffer {
  const doc = new jsPDF();
  doc.setFontSize(14);
  doc.text(`Reporte: ${titulo}`, 14, 20);
  autoTable(doc, {
    head: [headers],
    body: rows.map((r) => r.map(cellToString)),
    startY: 28,
    styles: { fontSize: 8 },
  });
  return doc.output('arraybuffer');
}
