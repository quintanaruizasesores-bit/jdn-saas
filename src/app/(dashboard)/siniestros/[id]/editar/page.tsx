'use client';

import { use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';
import { AppHeader } from '@/components/dashboard/app-header';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';
import { SiniestroForm } from '@/features/siniestros/siniestro-form';
import { createClient } from '@/lib/supabase/client';
import { fetchSiniestroById, updateSiniestro } from '@/services/siniestros.service';
import type { SiniestroFormData } from '@/validations/siniestro.schema';

export default function EditarSiniestroPage({ params }: { params: Promise<{ id: string }> }) {
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

  const mutation = useMutation({
    mutationFn: (values: SiniestroFormData) => updateSiniestro(createClient(), id, values),
    onSuccess: () => {
      toast.success('Siniestro actualizado');
      qc.invalidateQueries({ queryKey: ['siniestro', id] });
      qc.invalidateQueries({ queryKey: ['siniestros'] });
      router.push(`/siniestros/${id}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div>
      <AppHeader title="Editar siniestro" />
      <div className="mb-4">
        <Button asChild variant="ghost">
          <Link href={`/siniestros/${id}`}>
            <ArrowLeft className="mr-1 h-4 w-4" /> Volver al detalle
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-64 max-w-xl bg-panel2" />
      ) : isError || !data ? (
        <ErrorState
          message="No se encontró el siniestro a editar (puede haber sido eliminado)."
          onRetry={() => refetch()}
        />
      ) : (
        <SiniestroForm
          defaultValues={{
            cliente_id: data.cliente_id,
            poliza_id: data.poliza_id,
            tipo: data.tipo,
            fecha: data.fecha,
            descripcion: data.descripcion,
            responsabilidad: data.responsabilidad,
            monto_estimado: Number(data.monto_estimado) || 0,
          }}
          onSubmit={(d) => mutation.mutate(d)}
          loading={mutation.isPending}
          submitLabel="Guardar cambios"
        />
      )}
    </div>
  );
}
