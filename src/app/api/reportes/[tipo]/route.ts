import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { toCsv, toXlsx, toPdf } from '@/lib/reportes/format';

const TIPOS = ['produccion', 'companias', 'ramos', 'clientes', 'siniestros'] as const;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tipo: string }> }
) {
  const { tipo } = await params;
  const format = request.nextUrl.searchParams.get('format') ?? 'xlsx';

  if (!TIPOS.includes(tipo as (typeof TIPOS)[number])) {
    return NextResponse.json({ error: 'Tipo inválido' }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  let headers: string[] = [];
  let rows: (string | number)[][] = [];
  const filename = `reporte-${tipo}`;

  if (tipo === 'clientes') {
    const { data: clientesData } = await supabase
      .from('clientes')
      .select('*')
      .is('deleted_at', null)
      .order('apellido');
    headers = ['Nombre', 'Apellido', 'DNI', 'Email', 'Teléfono', 'Localidad', 'Provincia'];
    rows = ((clientesData ?? []) as import('@/types/database').Cliente[]).map((c) => [
      c.nombre,
      c.apellido,
      c.dni ?? '',
      c.email ?? '',
      c.telefono ?? '',
      c.localidad ?? '',
      c.provincia ?? '',
    ]);
  } else if (tipo === 'produccion' || tipo === 'companias' || tipo === 'ramos') {
    const view =
      tipo === 'produccion'
        ? 'v_produccion_mensual'
        : tipo === 'companias'
          ? 'v_polizas_por_compania'
          : 'v_polizas_por_ramo';
    const { data } = await supabase.from(view).select('*');
    if (data?.length) {
      headers = Object.keys(data[0]);
      rows = data.map((r) => Object.values(r).map((v) => (v == null ? '' : String(v))));
    }
  } else if (tipo === 'siniestros') {
    const { data: siniestrosData } = await supabase
      .from('siniestros')
      .select(`*, cliente:clientes(nombre, apellido)`)
      .order('fecha', { ascending: false });
    headers = ['Cliente', 'Tipo', 'Responsabilidad', 'Fecha', 'Monto', 'Descripción'];
    rows = ((siniestrosData ?? []) as Array<
      import('@/types/database').Siniestro & { cliente?: { nombre: string; apellido: string } }
    >).map((s) => {
      const c = s.cliente;
      return [
        c ? `${c.nombre} ${c.apellido}` : '',
        s.tipo,
        s.responsabilidad,
        s.fecha ?? '',
        Number(s.monto_estimado),
        s.descripcion ?? '',
      ];
    });
  }

  if (format === 'csv') {
    const csv = toCsv(headers, rows);
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}.csv"`,
      },
    });
  }

  if (format === 'pdf') {
    const buf = toPdf(tipo, headers, rows);
    return new NextResponse(buf, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}.pdf"`,
      },
    });
  }

  const buffer = await toXlsx(headers, rows);
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}.xlsx"`,
    },
  });
}
