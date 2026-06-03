'use client';

import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AppHeader } from '@/components/dashboard/app-header';
import { PolizaForm } from '@/features/polizas/poliza-form';
import { createClient } from '@/lib/supabase/client';
import { createPoliza } from '@/services/polizas.service';
import { fetchCompanias } from '@/services/companias.service';
import { fetchRamos } from '@/services/ramos.service';
import { getClienteNombre } from '@/lib/utils';
import type { PolizaFormData } from '@/validations/poliza.schema';

export default function NuevaPolizaPage() {
  const router = useRouter();

  const { data: clientes } = useQuery({
    queryKey: ['clientes-select'],
    queryFn: async () => {
      const { data } = await createClient()
        .from('clientes')
        .select('id, nombre, apellido')
        .is('deleted_at', null)
        .order('apellido');
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
    mutationFn: async (data: PolizaFormData) => createPoliza(createClient(), data),
    onSuccess: (row) => {
      toast.success('Póliza creada');
      router.push(`/polizas/${row.id}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div>
      <AppHeader title="Nueva póliza" />
      <div className="max-w-2xl rounded-[3px] border border-line bg-panel p-6">
        <PolizaForm
          clientes={clientes ?? []}
          companias={companias ?? []}
          ramos={ramos ?? []}
          onSubmit={async (d) => {
            await mutation.mutateAsync(d);
          }}
          loading={mutation.isPending}
        />
      </div>
    </div>
  );
}
