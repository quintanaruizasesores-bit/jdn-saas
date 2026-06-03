'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { AppHeader } from '@/components/dashboard/app-header';
import { createClient } from '@/lib/supabase/client';
import { fetchSiniestros } from '@/services/siniestros.service';
import { SINIESTRO_TIPO_LABELS, RESPONSABILIDAD_LABELS } from '@/lib/riesgo/calculate-risk-score';
import { formatDate, getClienteNombre } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { EmptyState } from '@/components/ui/empty-state';

export default function SiniestrosPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['siniestros'],
    queryFn: async () => {
      const result = await fetchSiniestros(createClient(), { pageSize: 100 });
      if (result.error) throw result.error;
      return result.data ?? [];
    },
  });

  return (
    <div>
      <AppHeader title="Siniestros" subtitle="Registro y seguimiento de siniestros" />
      <div className="mb-4">
        <Button asChild className="border border-amber bg-bg2 text-amber-bright">
          <Link href="/siniestros/nuevo">
            <Plus className="mr-1 h-4 w-4" /> Nuevo siniestro
          </Link>
        </Button>
      </div>
      <div className="overflow-hidden rounded-[3px] border border-line bg-panel">
        {isLoading ? (
          <p className="p-8 text-ink-faint">Cargando...</p>
        ) : !data?.length ? (
          <EmptyState title="Sin siniestros" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-line bg-panel2">
                <TableHead className="text-ink-faint">Cliente</TableHead>
                <TableHead className="text-ink-faint">Tipo</TableHead>
                <TableHead className="text-ink-faint">Responsabilidad</TableHead>
                <TableHead className="text-ink-faint">Fecha</TableHead>
                <TableHead className="text-ink-faint">Monto</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((s) => {
                const c = s.cliente as { nombre: string; apellido: string } | null;
                return (
                  <TableRow key={s.id} className="border-line/50 hover:bg-panel2">
                    <TableCell>
                      <Link href={`/clientes/${s.cliente_id}`} className="hover:text-amber">
                        {c ? getClienteNombre(c) : '—'}
                      </Link>
                    </TableCell>
                    <TableCell>{SINIESTRO_TIPO_LABELS[s.tipo as keyof typeof SINIESTRO_TIPO_LABELS]}</TableCell>
                    <TableCell>
                      {RESPONSABILIDAD_LABELS[s.responsabilidad as keyof typeof RESPONSABILIDAD_LABELS]}
                    </TableCell>
                    <TableCell>{formatDate(s.fecha)}</TableCell>
                    <TableCell>${Number(s.monto_estimado).toLocaleString('es-AR')}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
