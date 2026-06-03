'use client';

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { polizaSchema, type PolizaFormData } from '@/validations/poliza.schema';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Poliza } from '@/types/database';

interface Catalogo {
  id: string;
  nombre: string;
}

export function PolizaForm({
  defaultValues,
  clientes,
  companias,
  ramos,
  onSubmit,
  loading,
}: {
  defaultValues?: Partial<Poliza>;
  clientes: Catalogo[];
  companias: Catalogo[];
  ramos: Catalogo[];
  onSubmit: (data: PolizaFormData) => Promise<void>;
  loading?: boolean;
}) {
  const { register, handleSubmit, control, formState: { errors } } = useForm<PolizaFormData>({
    resolver: zodResolver(polizaSchema),
    defaultValues: {
      cliente_id: defaultValues?.cliente_id ?? '',
      compania_id: defaultValues?.compania_id ?? null,
      ramo_id: defaultValues?.ramo_id ?? null,
      numero_poliza: defaultValues?.numero_poliza ?? '',
      estado: defaultValues?.estado ?? 'VIGENTE',
      fecha_inicio: defaultValues?.fecha_inicio ?? '',
      fecha_fin: defaultValues?.fecha_fin ?? '',
      prima: defaultValues?.prima ?? 0,
      detalle: defaultValues?.detalle ?? '',
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
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
                  {clientes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
        <div>
          <Label>Nº póliza</Label>
          <Input {...register('numero_poliza')} className="mt-1 border-line bg-bg" />
        </div>
        <div>
          <Label>Compañía</Label>
          <Controller
            name="compania_id"
            control={control}
            render={({ field }) => (
              <Select value={field.value ?? ''} onValueChange={field.onChange}>
                <SelectTrigger className="mt-1 border-line bg-bg">
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent>
                  {companias.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
        <div>
          <Label>Ramo</Label>
          <Controller
            name="ramo_id"
            control={control}
            render={({ field }) => (
              <Select value={field.value ?? ''} onValueChange={field.onChange}>
                <SelectTrigger className="mt-1 border-line bg-bg">
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent>
                  {ramos.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
        <div>
          <Label>Estado</Label>
          <Controller
            name="estado"
            control={control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className="mt-1 border-line bg-bg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="VIGENTE">Vigente</SelectItem>
                  <SelectItem value="HISTORICA">Histórica</SelectItem>
                  <SelectItem value="BAJA">Baja</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </div>
        <div>
          <Label>Prima</Label>
          <Input type="number" step="0.01" {...register('prima', { valueAsNumber: true })} className="mt-1 border-line bg-bg" />
        </div>
        <div>
          <Label>Inicio vigencia</Label>
          <Input type="date" {...register('fecha_inicio')} className="mt-1 border-line bg-bg" />
        </div>
        <div>
          <Label>Fin vigencia</Label>
          <Input type="date" {...register('fecha_fin')} className="mt-1 border-line bg-bg" />
        </div>
        <div className="sm:col-span-2">
          <Label>Detalle</Label>
          <Input {...register('detalle')} className="mt-1 border-line bg-bg" />
        </div>
      </div>
      {errors.numero_poliza && <p className="text-xs text-red">{errors.numero_poliza.message}</p>}
      <Button type="submit" disabled={loading} className="bg-amber text-[#1a1510]">
        Guardar
      </Button>
    </form>
  );
}
