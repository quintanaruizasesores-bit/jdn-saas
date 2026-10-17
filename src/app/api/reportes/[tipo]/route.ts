import { NextResponse } from 'next/server';
/** Las descargas parciales se retiraron para evitar copias incompletas. */
export async function GET() {
  return NextResponse.json(
    {
      error:
        'Las exportaciones se trasladaron a Configuración → Respaldo y exportación.',
      url: '/config/respaldo',
    },
    { status: 410, headers: { 'Cache-Control': 'private, no-store' } }
  );
}
