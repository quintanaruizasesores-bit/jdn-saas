import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  analizarCartera,
  validarFiltros,
  type FiltrosInteligencia,
} from '@/lib/reportes/inteligencia';
import { periodoComision } from '@/lib/dashboard/comision';
import { cargarInteligencia } from '@/services/inteligencia.service';
import { PROVINCIAS, SIN_UBICACION, EXTERIOR } from '@/lib/reportes/geografia';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;
export async function GET(request: NextRequest) {
  const headers = { 'Cache-Control': 'private, no-store', Vary: 'Cookie' };
  const client = await createClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user)
    return NextResponse.json(
      { error: 'Iniciá sesión para consultar la cartera.' },
      { status: 401, headers }
    );
  const p = request.nextUrl.searchParams;
  const filtros: FiltrosInteligencia = {
    desde: p.get('desde') ?? '',
    hasta: p.get('hasta') ?? '',
    compania: p.get('compania') ?? '',
    ramo: p.get('ramo') ?? '',
    provincia: p.get('provincia') ?? '',
    estado: (p.get('estado') ?? '') as FiltrosInteligencia['estado'],
  };
  try {
    validarFiltros(filtros, periodoComision().hoy);
    if (
      filtros.provincia &&
      ![
        ...PROVINCIAS.map((p) => String(p[0])),
        SIN_UBICACION,
        EXTERIOR,
      ].includes(filtros.provincia)
    )
      throw new Error('Provincia inválida.');
    if (
      !['', 'VIGENTE', 'BAJA', 'HISTORICA', 'VENCIDA'].includes(
        filtros.estado ?? ''
      )
    )
      throw new Error('Estado inválido.');
    for (const key of ['compania', 'ramo'] as const)
      if (filtros[key] && !/^[0-9a-f-]{36}$/i.test(filtros[key]!))
        throw new Error('Filtro inválido.');
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400, headers }
    );
  }
  try {
    const datos = await cargarInteligencia(client);
    return NextResponse.json(analizarCartera(datos, filtros), { headers });
  } catch {
    return NextResponse.json(
      {
        error:
          'No se pudieron calcular los reportes. Revisá la conexión y que las migraciones estén completas.',
      },
      { status: 503, headers }
    );
  }
}
