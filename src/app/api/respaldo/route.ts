import { NextRequest, NextResponse } from 'next/server';
import { PassThrough, Readable } from 'node:stream';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { puedeExportar } from '@/lib/reportes/autorizacion';
import {
  escribirRespaldo,
  type CatalogoExportado,
  type FilaExportada,
} from '@/lib/reportes/respaldo';
import { periodoComision } from '@/lib/dashboard/comision';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;
const privateHeaders = { 'Cache-Control': 'private, no-store', Vary: 'Cookie' };

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json(
      { error: 'Iniciá sesión para continuar.' },
      { status: 401, headers: privateHeaders }
    );
  const { data: perfil, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  if (
    error ||
    !puedeExportar(user.id, perfil?.role, process.env.BACKUP_ADMIN_USER_IDS)
  )
    return NextResponse.json(
      {
        error:
          'La exportación integral requiere un administrador habilitado por el responsable del sistema.',
      },
      { status: 403, headers: privateHeaders }
    );
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY)
    return NextResponse.json(
      { error: 'La exportación todavía no está configurada en el servidor.' },
      { status: 503, headers: privateHeaders }
    );
  const service = await createServiceClient();
  const catalogo = async () => {
    const { data, error } = await service.rpc('exportacion_catalogo');
    if (error)
      throw new Error(
        'No se pudo verificar el esquema. Revisá la migración 009.'
      );
    return data as CatalogoExportado;
  };
  // Detectar despliegues incompletos antes de enviar un archivo descargable.
  let inicial: CatalogoExportado | null = null;
  try {
    inicial = await catalogo();
  } catch {
    return NextResponse.json(
      {
        error:
          'No se pudo verificar el esquema de exportación. El administrador debe revisar la migración 009.',
      },
      { status: 503, headers: privateHeaders }
    );
  }
  const stream = new PassThrough({ highWaterMark: 64 * 1024 });
  let cancelado = request.signal.aborted;
  request.signal.addEventListener(
    'abort',
    () => {
      cancelado = true;
      stream.destroy();
    },
    { once: true }
  );
  const fuente = {
    catalogo: async () => {
      if (inicial) {
        const valor = inicial;
        inicial = null;
        return valor;
      }
      return catalogo();
    },
    lote: async (tabla: string, despues: string | null) => {
      const { data, error } = await service.rpc('exportacion_lote', {
        tabla,
        despues,
        cantidad: 500,
      });
      if (error) throw new Error('No se pudo leer un lote de exportación.');
      return data as FilaExportada[];
    },
  };
  void escribirRespaldo(
    fuente,
    stream,
    new Date(),
    undefined,
    () => cancelado
  ).catch(() => {
    stream.destroy(
      new Error(
        'No se completó la copia de datos. Volvé a intentar en un momento sin modificaciones.'
      )
    );
  });
  return new NextResponse(Readable.toWeb(stream) as ReadableStream, {
    headers: {
      ...privateHeaders,
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="quintana_ruiz_respaldo_${periodoComision().hoy}.xlsx"`,
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
