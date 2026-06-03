'use client';

import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { AppHeader } from '@/components/dashboard/app-header';
import { siniestroSchema, type SiniestroFormData } from '@/validations/siniestro.schema';
import { createSiniestro } from '@/services/siniestros.service';
import { createClient } from '@/lib/supabase/client';
import { getClienteNombre } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function NuevoSiniestroPage() {
  const router = useRouter();
  const { register, handleSubmit, control } = useForm<SiniestroFormData>({
    resolver: zodResolver(siniestroSchema),
    defaultValues: {
      tipo: 'OTROS',
      responsabilidad: 'INDETERMINADA',
      monto_estimado: 0,
    },
  });

  const { data: clientes } = useQuery({
    queryKey: ['clientes-select'],
    queryFn: async () => {
      const { data } = await createClient().from('clientes').select('id, nombre, apellido').is('deleted_at', null);
      return (data ?? []) as import('@/types/database').Cliente[];
    },
  });

  const mutation = useMutation({
    mutationFn: (data: SiniestroFormData) => createSiniestro(createClient(), data),
    onSuccess: () => {
      toast.success('Siniestro registrado');
      router.push('/siniestros');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div>
      <AppHeader title="Nuevo siniestro" />
      <form
        onSubmit={handleSubmit((d: SiniestroFormData) => mutation.mutate(d))}
        className="max-w-xl space-y-4 rounded-[3px] border border-line bg-panel p-6"
      >
        <div>
          <Label>Cliente</Label>
          <Controller
            name="cliente_id"
            control={control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className="mt-1 border-line bg-bg">
                  <SelectValue placeholder="Seleccionar" />
                </SelectTrigger>
                <SelectContent>
                  {(clientes ?? []).map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {getClienteNombre(c)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Tipo</Label>
            <Controller
              name="tipo"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="mt-1 border-line bg-bg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(['CHOQUE', 'ROBO', 'INCENDIO', 'GRANIZO', 'OTROS'] as const).map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div>
            <Label>Responsabilidad</Label>
            <Controller
              name="responsabilidad"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="mt-1 border-line bg-bg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(['RESPONSABLE', 'NO_RESPONSABLE', 'INDETERMINADA'] as const).map((r) => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
        </div>
        <div>
          <Label>Fecha</Label>
          <Input type="date" {...register('fecha')} className="border-line bg-bg" />
        </div>
        <div>
          <Label>Monto estimado</Label>
          <Input type="number" {...register('monto_estimado', { valueAsNumber: true })} className="border-line bg-bg" />
        </div>
        <div>
          <Label>Descripción</Label>
          <Textarea {...register('descripcion')} className="border-line bg-bg" />
        </div>
        <Button type="submit" className="bg-amber text-[#1a1510]" disabled={mutation.isPending}>
          Guardar
        </Button>
      </form>
    </div>
  );
}
