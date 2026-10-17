import ExcelJS from 'exceljs';
import type { Stream } from 'node:stream';

export interface ColumnaExportada {
  nombre: string;
  tipo: string;
  nullable: boolean;
  excluida: boolean;
}
export interface TablaExportada {
  tabla: string;
  registros: string;
  huella: string;
  columnas: ColumnaExportada[];
}
export interface CatalogoExportado {
  tablas: TablaExportada[];
  relaciones: { tabla: string; nombre: string; definicion: string }[] | null;
}
export type FilaExportada = Record<string, string | null>;
export interface FuenteRespaldo {
  catalogo(): Promise<CatalogoExportado>;
  lote(tabla: string, despues: string | null): Promise<FilaExportada[]>;
}
export const EXCEL_FILAS_DATOS = 1_048_575;
const NULL_MARKER = '\\N';

/** ExcelJS recibe exclusivamente strings, nunca objetos formula ni hyperlink.
 * Escapado reversible: NULL=\N; todo texto que empieza por \ se duplica. */
export function textoRespaldo(value: string | null): string {
  if (value === null) return NULL_MARKER;
  if (value === '') return '\\E';
  if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value))
    return `\\J${JSON.stringify(value)}`;
  return value.startsWith('\\') ? `\\${value}` : value;
}
export function catalogosIguales(a: CatalogoExportado, b: CatalogoExportado) {
  return JSON.stringify(a) === JSON.stringify(b);
}

/** Escritura ZIP por streaming: memoria acotada a un lote, sin archivos públicos. */
export async function escribirRespaldo(
  fuente: FuenteRespaldo,
  stream: Stream,
  generado = new Date(),
  maxFilas = EXCEL_FILAS_DATOS,
  cancelado: () => boolean = () => false
) {
  const inicio = await fuente.catalogo();
  const wb = new ExcelJS.stream.xlsx.WorkbookWriter({
    stream,
    useStyles: true,
    useSharedStrings: false,
  });
  wb.creator = 'Quintana Ruiz Asesores';
  wb.created = generado;
  const indice = wb.addWorksheet('ÍNDICE');
  indice.columns = [{ width: 30 }, { width: 22 }, { width: 28 }, { width: 32 }];
  indice.addRow(['Tabla', 'Registros', 'Hojas', 'Generación UTC']).commit();
  const manifiesto = wb.addWorksheet('MANIFIESTO');
  manifiesto.columns = [{ width: 30 }, { width: 40 }, { width: 85 }];
  manifiesto.addRow(['Objeto', 'Campo / regla', 'Detalle']).commit();
  const reglas = [
    [
      'Alcance',
      'Datos funcionales',
      'Todas las filas, incluidas bajas lógicas, de las tablas públicas auditadas. No es un respaldo técnico restaurable de PostgreSQL.',
    ],
    [
      'Exclusiones',
      'auth, storage, vault y esquemas internos',
      'No se exportan contraseñas, sesiones, tokens ni claves de esos esquemas. Las vistas son derivadas y no se duplican.',
    ],
    [
      'Seguridad',
      'Columnas y claves JSON sensibles',
      'password, passwd, secret, token, private_key/privateKey, api_key/apiKey, credential, authorization, jwt, connection_string, database_url: columnas excluidas y valores JSON reemplazados por [EXCLUIDO POR SEGURIDAD]. En app_settings se excluye también el valor de claves sensibles.',
    ],
    [
      'Codificación',
      'Valores SQL como texto exacto',
      'IDs, fechas, timestamps, numeric y JSON conservan su representación PostgreSQL. Sin fórmulas ni conversión a double. Booleanos SQL: true/false.',
    ],
    [
      'Codificación',
      'NULL y escape',
      'NULL = \\N; vacío = \\E. Texto original que comienza con barra: agregar otra barra inicial. \\J seguido de una cadena JSON codifica controles XML. \\L seguido de un ID referencia TEXTOS_LARGOS (concatenar partes de ese ID).',
    ],
    [
      'Consistencia',
      'Lectura por lotes',
      'No hay snapshot transaccional entre tablas. Se verifican esquema, conteos y huellas al inicio y final. Ante cambios detectados se interrumpe la descarga.',
    ],
    [
      'Restauración',
      'Objetos PostgreSQL',
      'No contiene índices, funciones, triggers, RLS, secuencias, permisos ni un dump SQL. Usar backups nativos del proveedor por separado.',
    ],
  ];
  reglas.forEach((row) => manifiesto.addRow(row).commit());
  let largos: ReturnType<typeof wb.addWorksheet> | undefined;
  let hojaLargos = 0,
    filasLargos = 0,
    valorLargo = 0;
  const agregarLargo = (
    id: string,
    tabla: string,
    clave: string,
    columna: string,
    parte: number,
    texto: string
  ) => {
    if (!largos || filasLargos === maxFilas) {
      largos?.commit();
      hojaLargos++;
      filasLargos = 0;
      largos = wb.addWorksheet(
        `TEXTOS_LARGOS${hojaLargos > 1 ? `_${hojaLargos}` : ''}`
      );
      largos.columns = [
        { width: 15 },
        { width: 24 },
        { width: 38 },
        { width: 24 },
        { width: 12 },
        { width: 80 },
      ];
      largos
        .addRow([
          'ID valor',
          'Tabla',
          'Registro (ordinal)',
          'Columna',
          'Parte',
          'Texto codificado',
        ])
        .commit();
    }
    largos.addRow([id, tabla, clave, columna, String(parte), texto]).commit();
    filasLargos++;
  };
  for (const tabla of inicio.tablas) {
    if (cancelado()) throw new Error('Descarga cancelada');
    if (!/^\d+$/.test(tabla.registros)) throw new Error('Conteo inválido');
    const columnas = tabla.columnas.filter((c) => !c.excluida);
    tabla.columnas.forEach((c) =>
      manifiesto
        .addRow([
          tabla.tabla,
          c.nombre,
          `${c.tipo}; nullable=${c.nullable}; ${c.excluida ? 'EXCLUIDA por seguridad' : 'incluida'}`,
        ])
        .commit()
    );
    let hojas = 0,
      filasHoja = 0,
      total = 0,
      cursor: string | null = null;
    const nuevaHoja = () => {
      hojas++;
      filasHoja = 0;
      const hoja = wb.addWorksheet(
        `${tabla.tabla.slice(0, 25)}${hojas > 1 ? `_${hojas}` : ''}`,
        { views: [{ state: 'frozen', ySplit: 1 }] }
      );
      hoja.columns = columnas.map((c) => ({
        header: c.nombre,
        key: c.nombre,
        width: 24,
        style: { numFmt: '@' },
      }));
      hoja.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      hoja.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1A2556' },
      };
      hoja.getRow(1).commit();
      return hoja;
    };
    let hoja = nuevaHoja();
    while (true) {
      if (cancelado()) throw new Error('Descarga cancelada');
      const lote = await fuente.lote(tabla.tabla, cursor);
      if (!lote.length) break;
      for (const fila of lote) {
        const key = fila[tabla.tabla === 'app_settings' ? 'key' : 'id'];
        if (
          typeof key !== 'string' ||
          (cursor !== null &&
            Buffer.compare(Buffer.from(key), Buffer.from(cursor)) <= 0)
        )
          throw new Error('Paginación inconsistente');
        if (filasHoja === maxFilas) {
          hoja.commit();
          hoja = nuevaHoja();
        }
        hoja
          .addRow(
            columnas.map((c) => {
              if (!(c.nombre in fila))
                throw new Error('Columna ausente en el lote');
              const texto = textoRespaldo(fila[c.nombre]);
              if (texto.length <= 32767) return texto;
              const id = String(++valorLargo);
              let parte = 0;
              for (let inicio = 0; inicio < texto.length; ) {
                let fin = Math.min(inicio + 32760, texto.length);
                // No partir un par UTF-16 (por ejemplo un emoji).
                const ultimo = texto.charCodeAt(fin - 1);
                if (ultimo >= 0xd800 && ultimo <= 0xdbff) fin--;
                agregarLargo(
                  id,
                  tabla.tabla,
                  String(total + 1),
                  c.nombre,
                  ++parte,
                  texto.slice(inicio, fin)
                );
                inicio = fin;
              }
              return `\\L${id}`;
            })
          )
          .commit();
        cursor = key;
        filasHoja++;
        total++;
      }
    }
    hoja.commit();
    if (BigInt(total) !== BigInt(tabla.registros))
      throw new Error(
        'La tabla cambió durante la exportación. Volvé a intentar.'
      );
    indice
      .addRow([
        tabla.tabla,
        tabla.registros,
        String(hojas),
        generado.toISOString(),
      ])
      .commit();
  }
  inicio.relaciones?.forEach((r) =>
    manifiesto.addRow([r.tabla, r.nombre, r.definicion]).commit()
  );
  largos?.commit();
  if (valorLargo)
    indice
      .addRow([
        'TEXTOS_LARGOS',
        `${valorLargo} valores`,
        String(hojaLargos),
        generado.toISOString(),
      ])
      .commit();
  const final = await fuente.catalogo();
  if (!catalogosIguales(inicio, final))
    throw new Error(
      'Los datos cambiaron durante la exportación. Volvé a intentar.'
    );
  indice.commit();
  manifiesto.commit();
  await wb.commit();
}
