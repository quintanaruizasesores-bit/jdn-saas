'use client';

import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AppHeader } from '@/components/dashboard/app-header';
import { ClienteForm } from '@/features/clientes/cliente-form';
import { createClient } from '@/lib/supabase/client';
import { createCliente } from '@/services/clientes.service';
import type { ClienteFormData } from '@/validations/cliente.schema';

export default function NuevoClientePage() {
  const router = useRouter();
  const mutation = useMutation({
    mutationFn: async (data: ClienteFormData) => {
      const supabase = createClient();
      return createCliente(supabase, data);
    },
    onSuccess: (row) => {
      toast.success('Cliente creado');
      router.push(`/clientes/${row.id}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div>
      <AppHeader title="Nuevo cliente" subtitle="Alta en cartera" />
      <div className="max-w-2xl rounded-[3px] border border-line bg-panel p-6">
        <ClienteForm
          onSubmit={async (d) => {
            await mutation.mutateAsync(d);
          }}
          loading={mutation.isPending}
        />
      </div>
    </div>
  );
}
