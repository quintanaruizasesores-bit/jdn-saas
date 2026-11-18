import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { fetchOportunidades } from '@/services/crosssell.service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const headers = { 'Cache-Control': 'private, no-store', Vary: 'Cookie' };

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json(
      { error: 'Iniciá sesión para continuar.' },
      { status: 401, headers }
    );
  try {
    const oportunidades = await fetchOportunidades(supabase);
    return NextResponse.json({ oportunidades }, { headers });
  } catch {
    return NextResponse.json(
      {
        error:
          'No se pudieron cargar las oportunidades. Revisá que las migraciones estén aplicadas.',
      },
      { status: 503, headers }
    );
  }
}
