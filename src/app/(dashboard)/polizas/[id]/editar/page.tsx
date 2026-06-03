'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { fetchPolizaById, updatePoliza } from '@/services/polizas.service';
import { fetchCompanias } from '@/services/companias.service';
import { fetchRamos } from '@/services/ramos.service';
import { AppHeader } from '@/components/dashboard/app-header';
import { PolizaForm } from '@/features/polizas/poliza-form';
import { Skeleton } from '@/components/ui/skeleton';
import { getClienteNombre } from '@/lib/utils';
import type { PolizaFormData } from '@/validations/poliza.schema';

export default function EditarPolizaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const { data: poliza, isLoading } = useQuery({
    queryKey: ['poliza', id],
    queryFn: async () => {
      const { data, error } = await fetchPolizaById(createClient(), id);
      if (error) throw error;
      return data;
    },
  });

  const { data: clientes } = useQuery({
    queryKey: ['clientes-select'],
    queryFn: async () => {
      const { data } = await createClient().from('clientes').select('id, nombre, apellido').is('deleted_at', null);
      return ((data ?? []) as import('@/types/database').Cliente[]).map((c) => ({
        id: c.id,
        nombre: getClienteNombre(c),
      }));
    },
  });

  const { data: companias } = useQuery({
    queryKey: ['companias'],
    queryFn: async () => {
      const { data } = await fetchCompanias(createClient());
      return (data ?? []).map((c) => ({ id: c.id, nombre: c.nombre }));
    },
  });

  const { data: ramos } = useQuery({
    queryKey: ['ramos'],
    queryFn: async () => {
      const { data } = await fetchRamos(createClient());
      return (data ?? []).map((r) => ({ id: r.id, nombre: r.nombre }));
    },
  });

  const mutation = useMutation({
    mutationFn: (data: PolizaFormData) => updatePoliza(createClient(), id, data),
    onSuccess: () => {
      toast.success('Póliza actualizada');
      router.push(`/polizas/${id}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div>
      <AppHeader title="Editar póliza" />
      <div className="mt-6 max-w-2xl rounded-[3px] border border-line bg-panel p-6">
        {isLoading ? (
          <Skeleton className="h-64 bg-panel2" />
        ) : poliza ? (
          <PolizaForm
            defaultValues={poliza}
            clientes={clientes ?? []}
            companias={companias ?? []}
            ramos={ramos ?? []}
            onSubmit={async (d) => {
              await mutation.mutateAsync(d);
            }}
            loading={mutation.isPending}
          />
        ) : null}
      </div>
    </div>
  );
}
