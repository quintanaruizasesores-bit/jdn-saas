'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AppHeader } from '@/components/dashboard/app-header';
import { ClienteForm } from '@/features/clientes/cliente-form';
import { createClient } from '@/lib/supabase/client';
import { fetchClienteById, updateCliente } from '@/services/clientes.service';
import type { ClienteFormData } from '@/validations/cliente.schema';
import { Skeleton } from '@/components/ui/skeleton';

export default function EditarClientePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const { data: cliente, isLoading } = useQuery({
    queryKey: ['cliente', id],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await fetchClienteById(supabase, id);
      if (error) throw error;
      return data;
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: ClienteFormData) => {
      const supabase = createClient();
      return updateCliente(supabase, id, data);
    },
    onSuccess: () => {
      toast.success('Cliente actualizado');
      router.push(`/clientes/${id}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <Skeleton className="h-64 bg-panel" />;

  return (
    <div>
      <AppHeader title="Editar cliente" />
      <div className="max-w-2xl rounded-[3px] border border-line bg-panel p-6">
        <ClienteForm
          defaultValues={cliente ?? undefined}
          onSubmit={async (d) => {
            await mutation.mutateAsync(d);
          }}
          loading={mutation.isPending}
        />
      </div>
    </div>
  );
}
