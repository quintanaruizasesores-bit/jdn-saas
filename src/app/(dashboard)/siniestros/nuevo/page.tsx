'use client';

import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AppHeader } from '@/components/dashboard/app-header';
import { SiniestroForm } from '@/features/siniestros/siniestro-form';
import { type SiniestroFormData } from '@/validations/siniestro.schema';
import { createSiniestro } from '@/services/siniestros.service';
import { createClient } from '@/lib/supabase/client';

function NuevoSiniestroForm() {
  const router = useRouter();
  const qc = useQueryClient();
  const searchParams = useSearchParams();
  const clienteId = searchParams.get('cliente');
  const polizaId = searchParams.get('poliza');

  const mutation = useMutation({
    mutationFn: (data: SiniestroFormData) => createSiniestro(createClient(), data),
    onSuccess: () => {
      toast.success('Siniestro registrado');
      qc.invalidateQueries({ queryKey: ['siniestros'] });
      router.push('/siniestros');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <SiniestroForm
      defaultValues={{
        ...(clienteId ? { cliente_id: clienteId } : {}),
        ...(polizaId ? { poliza_id: polizaId } : {}),
      }}
      onSubmit={(d) => mutation.mutate(d)}
      loading={mutation.isPending}
      submitLabel="Guardar"
    />
  );
}

export default function NuevoSiniestroPage() {
  return (
    <div>
      <AppHeader title="Nuevo siniestro" />
      <Suspense fallback={null}>
        <NuevoSiniestroForm />
      </Suspense>
    </div>
  );
}
