'use client';

import { useForm, Controller, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { siniestroSchema, type SiniestroFormData } from '@/validations/siniestro.schema';
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
import { ClienteCombobox } from '@/features/clientes/cliente-combobox';
import { createClient } from '@/lib/supabase/client';
import { fetchPolizasByCliente } from '@/services/polizas.service';

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

  const clienteId = useWatch({ control, name: 'cliente_id' });

  const { data: polizas = [] } = useQuery({
    queryKey: ['polizas-cliente', clienteId],
    enabled: !!clienteId,
    queryFn: async () => {
      const { data } = await fetchPolizasByCliente(createClient(), clienteId as string);
      return (data ?? []) as { id: string; detalle: string | null }[];
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
            <ClienteCombobox
              value={field.value ?? null}
              onChange={field.onChange}
              className="mt-1"
            />
          )}
        />
        <FieldError message={errors.cliente_id?.message} />
      </div>

      <div>
        <Label>Póliza / Auto</Label>
        <Controller
          name="poliza_id"
          control={control}
          render={({ field }) => (
            <Select
              value={field.value ?? ''}
              onValueChange={(v) => field.onChange(v === '__none__' ? null : v)}
              disabled={!clienteId}
            >
              <SelectTrigger className="mt-1 border-line bg-bg">
                <SelectValue placeholder={clienteId ? 'Sin póliza asociada' : 'Elegí un cliente primero'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Sin póliza asociada</SelectItem>
                {polizas.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.detalle || 'Sin detalle'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        <FieldError message={errors.poliza_id?.message} />
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
