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
import { ClienteCombobox } from '@/features/clientes/cliente-combobox';
import { CompaniaBadge } from '@/components/ui/compania-badge';
import type { Poliza } from '@/types/database';
import { periodoComision } from '@/lib/dashboard/comision';

interface Catalogo {
  id: string;
  nombre: string;
  color?: string | null;
}

export function PolizaForm({
  defaultValues,
  companias,
  ramos,
  onSubmit,
  loading,
}: {
  defaultValues?: Partial<Poliza>;
  companias: Catalogo[];
  ramos: Catalogo[];
  onSubmit: (data: PolizaFormData) => Promise<void>;
  loading?: boolean;
}) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<PolizaFormData>({
    resolver: zodResolver(polizaSchema),
    defaultValues: {
      cliente_id: defaultValues?.cliente_id ?? '',
      compania_id: defaultValues?.compania_id ?? null,
      ramo_id: defaultValues?.ramo_id ?? null,
      estado: defaultValues?.estado ?? 'VIGENTE',
      fecha_inicio: defaultValues?.fecha_inicio ?? '',
      fecha_fin: defaultValues?.fecha_fin ?? '',
      fecha_baja: defaultValues?.fecha_baja ?? '',
      comision_desde:
        defaultValues?.comision_desde &&
        defaultValues.comision_desde > periodoComision().hoy
          ? defaultValues.comision_desde
          : periodoComision().hoy,
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
              <ClienteCombobox
                value={field.value ?? null}
                onChange={field.onChange}
                className="mt-1"
              />
            )}
          />
          {errors.cliente_id && (
            <p className="text-red mt-1 text-xs">{errors.cliente_id.message}</p>
          )}
        </div>
        <div>
          <Label>Compañía</Label>
          <Controller
            name="compania_id"
            control={control}
            render={({ field }) => (
              <Select value={field.value ?? ''} onValueChange={field.onChange}>
                <SelectTrigger className="border-line bg-bg mt-1">
                  <span className="min-w-0 flex-1 overflow-hidden text-left">
                    <SelectValue placeholder="—" />
                  </span>
                </SelectTrigger>
                <SelectContent>
                  {companias.map((c) => (
                    <SelectItem key={c.id} value={c.id} textValue={c.nombre}>
                      <CompaniaBadge nombre={c.nombre} color={c.color} />
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
                <SelectTrigger className="border-line bg-bg mt-1">
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
                <SelectTrigger className="border-line bg-bg mt-1">
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
          <Label htmlFor="premio-mensual">Premio mensual</Label>
          <Input
            id="premio-mensual"
            type="number"
            min="0"
            step="0.01"
            {...register('prima', { valueAsNumber: true })}
            className="border-line bg-bg mt-1"
          />
          <p className="text-ink-dim mt-1 text-xs">
            Con importe cero, queda pendiente en la estimación de comisión.
          </p>
          {errors.prima && (
            <p className="text-red mt-1 text-xs">{errors.prima.message}</p>
          )}
        </div>
        <div>
          <Label htmlFor="fecha-inicio">Inicio vigencia</Label>
          <Input
            id="fecha-inicio"
            type="date"
            {...register('fecha_inicio')}
            className="border-line bg-bg mt-1"
          />
        </div>
        <div>
          <Label htmlFor="fecha-fin">Fin vigencia (opcional)</Label>
          <Input
            id="fecha-fin"
            type="date"
            {...register('fecha_fin')}
            className="border-line bg-bg mt-1"
          />
          {errors.fecha_fin && (
            <p className="text-red mt-1 text-xs">{errors.fecha_fin.message}</p>
          )}
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="comision-desde">Cambios con efecto desde</Label>
          <Input
            id="comision-desde"
            type="date"
            {...register('comision_desde')}
            min={defaultValues?.comision_desde ?? undefined}
            className="border-line bg-bg mt-1"
          />
          <p className="text-ink-dim mt-1 text-xs">
            Fecha desde la que rigen el importe, estado y vigencia registrados.
          </p>
          {errors.comision_desde && (
            <p className="text-red mt-1 text-xs">
              {errors.comision_desde.message}
            </p>
          )}
        </div>
        <div>
          <Label htmlFor="fecha-baja">Baja efectiva (si corresponde)</Label>
          <Input
            id="fecha-baja"
            type="date"
            {...register('fecha_baja')}
            className="border-line bg-bg mt-1"
          />
          {errors.fecha_baja && (
            <p className="text-red mt-1 text-xs">{errors.fecha_baja.message}</p>
          )}
        </div>
        <div className="sm:col-span-2">
          <Label>Detalle</Label>
          <Input {...register('detalle')} className="border-line bg-bg mt-1" />
        </div>
      </div>
      <Button type="submit" disabled={loading}>
        Guardar
      </Button>
    </form>
  );
}
