'use client';

import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AppHeader } from '@/components/dashboard/app-header';
import { SiniestroForm } from '@/features/siniestros/siniestro-form';
import { type SiniestroFormData } from '@/validations/siniestro.schema';
import { createSiniestro } from '@/services/siniestros.service';
import { createClient } from '@/lib/supabase/client';

export default function NuevoSiniestroPage() {
  const router = useRouter();
  const qc = useQueryClient();

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
    <div>
      <AppHeader title="Nuevo siniestro" />
      <SiniestroForm
        onSubmit={(d) => mutation.mutate(d)}
        loading={mutation.isPending}
        submitLabel="Guardar"
      />
    </div>
  );
}
