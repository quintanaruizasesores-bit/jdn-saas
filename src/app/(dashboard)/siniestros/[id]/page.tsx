'use client';

import { use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowLeft, Pencil, Trash2 } from 'lucide-react';
import { AppHeader } from '@/components/dashboard/app-header';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { createClient } from '@/lib/supabase/client';
import { fetchSiniestroById, deleteSiniestro } from '@/services/siniestros.service';
import {
  SINIESTRO_TIPO_LABELS,
  RESPONSABILIDAD_LABELS,
} from '@/lib/riesgo/calculate-risk-score';
import { formatCurrency, formatDate, getClienteNombre } from '@/lib/utils';
import type { Siniestro } from '@/types/database';

type SiniestroDetalle = Siniestro & {
  cliente: { id: string; nombre: string; apellido: string } | null;
  poliza: {
    id: string;
    detalle: string | null;
    compania: { nombre: string } | null;
  } | null;
};

export default function SiniestroDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const qc = useQueryClient();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['siniestro', id],
    queryFn: async () => {
      const { data, error } = await fetchSiniestroById(createClient(), id);
      if (error) throw error;
      return data;
    },
    retry: false,
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteSiniestro(createClient(), id),
    onSuccess: () => {
      toast.success('Siniestro eliminado');
      qc.invalidateQueries({ queryKey: ['siniestros'] });
      qc.removeQueries({ queryKey: ['siniestro', id] });
      router.push('/siniestros');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const backButton = (
    <Button asChild variant="ghost">
      <Link href="/siniestros">
        <ArrowLeft className="mr-1 h-4 w-4" /> Volver
      </Link>
    </Button>
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        <AppHeader title="Siniestro" />
        <Skeleton className="h-64 max-w-2xl bg-panel2" />
      </div>
    );
  }

  // ID inexistente (maybeSingle → null) o inválido (error de UUID) o ya eliminado.
  if (isError || !data) {
    return (
      <div>
        <AppHeader title="Siniestro" />
        <ErrorState
          message="No se encontró el siniestro solicitado (puede haber sido eliminado)."
          onRetry={() => refetch()}
        />
        <div className="mt-4 flex justify-center">{backButton}</div>
      </div>
    );
  }

  const s = data as SiniestroDetalle;
  const cliente = s.cliente;
  const poliza = s.poliza;

  return (
    <div>
      <AppHeader
        title={`Siniestro — ${SINIESTRO_TIPO_LABELS[s.tipo]}`}
        subtitle={cliente ? getClienteNombre(cliente) : undefined}
      />

      <div className="mb-6 flex flex-wrap gap-2">
        {backButton}
        <Button asChild variant="outline" className="border-amber text-amber">
          <Link href={`/siniestros/${id}/editar`}>
            <Pencil className="mr-1 h-4 w-4" /> Editar
          </Link>
        </Button>
        <ConfirmDialog
          trigger={
            <Button variant="destructive" disabled={deleteMutation.isPending}>
              <Trash2 className="mr-1 h-4 w-4" /> Eliminar
            </Button>
          }
          title="Eliminar siniestro"
          description="Esta acción es permanente y no se puede deshacer. ¿Querés eliminar este siniestro?"
          confirmLabel="Eliminar"
          destructive
          onConfirm={() => deleteMutation.mutateAsync()}
        />
      </div>

      <div className="grid max-w-2xl gap-px overflow-hidden rounded-[3px] border border-line bg-line text-sm">
        <Row label="Cliente">
          {cliente ? (
            <Link href={`/clientes/${cliente.id}`} className="text-amber hover:underline">
              {getClienteNombre(cliente)}
            </Link>
          ) : (
            '—'
          )}
        </Row>
        <Row label="Póliza">
          {poliza ? (
            <Link href={`/polizas/${poliza.id}`} className="text-amber hover:underline">
              {poliza.detalle || 'Ver póliza'}
            </Link>
          ) : (
            'Sin póliza asociada'
          )}
        </Row>
        <Row label="Compañía">{poliza?.compania?.nombre ?? '—'}</Row>
        <Row label="Tipo">{SINIESTRO_TIPO_LABELS[s.tipo]}</Row>
        <Row label="Responsabilidad">{RESPONSABILIDAD_LABELS[s.responsabilidad]}</Row>
        <Row label="Fecha">{formatDate(s.fecha)}</Row>
        <Row label="Monto estimado">{formatCurrency(Number(s.monto_estimado) || 0)}</Row>
        <Row label="Descripción">{s.descripcion || '—'}</Row>
        {s.descripcion_raw && <Row label="Detalle original">{s.descripcion_raw}</Row>}
        <Row label="Registrado">{formatDate(s.created_at?.slice(0, 10))}</Row>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[140px_1fr] gap-4 bg-panel px-4 py-3">
      <span className="text-[10px] uppercase tracking-widest text-ink-faint">{label}</span>
      <span className="text-ink">{children}</span>
    </div>
  );
}
