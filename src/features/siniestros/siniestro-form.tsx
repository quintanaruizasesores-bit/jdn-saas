'use client';

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { siniestroSchema, type SiniestroFormData } from '@/validations/siniestro.schema';
import { createClient } from '@/lib/supabase/client';
import { getClienteNombre } from '@/lib/utils';
import type { Cliente } from '@/types/database';
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

const TIPOS = ['CHOQUE', 'ROBO', 'INCENDIO', 'GRANIZO', 'OTROS'] as const;
const RESPONSABILIDADES = ['RESPONSABLE', 'NO_RESPONSABLE', 'INDETERMINADA'] as const;

interface SiniestroFormProps {
  defaultValues?: Partial<SiniestroFormData>;
  onSubmit: (data: SiniestroFormData) => void | Promise<void>;
  loading?: boolean;
  submitLabel?: string;
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-red">{message}</p>;
}

export function SiniestroForm({
  defaultValues,
  onSubmit,
  loading = false,
  submitLabel = 'Guardar',
}: SiniestroFormProps) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<SiniestroFormData>({
    resolver: zodResolver(siniestroSchema),
    defaultValues: {
      tipo: 'OTROS',
      responsabilidad: 'INDETERMINADA',
      monto_estimado: 0,
      ...defaultValues,
    },
  });

  const { data: clientes } = useQuery({
    queryKey: ['clientes-select'],
    queryFn: async () => {
      const { data } = await createClient()
        .from('clientes')
        .select('id, nombre, apellido')
        .is('deleted_at', null);
      return (data ?? []) as Cliente[];
    },
  });

  return (
    <form
      onSubmit={handleSubmit((d) => onSubmit(d))}
      className="max-w-xl space-y-4 rounded-[3px] border border-line bg-panel p-6"
    >
      <div>
        <Label>Cliente</Label>
        <Controller
          name="cliente_id"
          control={control}
          render={({ field }) => (
            <Select value={field.value ?? ''} onValueChange={field.onChange}>
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
        <FieldError message={errors.cliente_id?.message} />
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
                  {TIPOS.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          <FieldError message={errors.tipo?.message} />
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
                  {RESPONSABILIDADES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          <FieldError message={errors.responsabilidad?.message} />
        </div>
      </div>

      <div>
        <Label>Fecha</Label>
        <Input type="date" {...register('fecha')} className="border-line bg-bg" />
        <FieldError message={errors.fecha?.message} />
      </div>

      <div>
        <Label>Monto estimado</Label>
        <Input
          type="number"
          step="0.01"
          {...register('monto_estimado', { valueAsNumber: true })}
          className="border-line bg-bg"
        />
        <FieldError message={errors.monto_estimado?.message} />
      </div>

      <div>
        <Label>Descripción</Label>
        <Textarea {...register('descripcion')} className="border-line bg-bg" />
        <FieldError message={errors.descripcion?.message} />
      </div>

      <Button type="submit" className="bg-amber text-[#1a1510]" disabled={loading}>
        {loading ? 'Guardando...' : submitLabel}
      </Button>
    </form>
  );
}
