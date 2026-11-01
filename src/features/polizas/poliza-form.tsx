'use client';

import { useState } from 'react';
import { useForm, Controller, useWatch } from 'react-hook-form';
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
import { CompaniaCombobox } from './compania-combobox';
import type { Poliza } from '@/types/database';
import { periodoComision } from '@/lib/dashboard/comision';
import { PolizaDateField } from './poliza-date-field';
import { ChevronDown } from 'lucide-react';

interface Catalogo {
  id: string;
  nombre: string;
  color?: string | null;
}

export function PolizaForm({
  mode,
  defaultValues,
  companias,
  ramos,
  onSubmit,
  loading,
}: {
  mode: 'create' | 'edit';
  defaultValues?: Partial<Poliza>;
  companias: Catalogo[];
  ramos: Catalogo[];
  onSubmit: (data: PolizaFormData) => Promise<void>;
  loading?: boolean;
}) {
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [effectEdited, setEffectEdited] = useState(false);
  const originalEffect = defaultValues?.comision_desde ?? '';
  const today = periodoComision().hoy;
  const initialEffect =
    mode === 'create' ? today : originalEffect > today ? originalEffect : today;
  const {
    register,
    handleSubmit,
    control,
    setError,
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
      comision_desde: initialEffect,
      prima: defaultValues?.prima ?? 0,
      detalle: defaultValues?.detalle ?? '',
    },
  });

  const current = useWatch({ control });
  const financialChanged =
    mode === 'edit' &&
    (current.prima !== (defaultValues?.prima ?? 0) ||
      current.estado !== (defaultValues?.estado ?? 'VIGENTE') ||
      (current.fecha_inicio ?? '') !== (defaultValues?.fecha_inicio ?? '') ||
      (current.fecha_fin ?? '') !== (defaultValues?.fecha_fin ?? '') ||
      (current.fecha_baja ?? '') !== (defaultValues?.fecha_baja ?? ''));
  const isNewBaja =
    mode === 'edit' &&
    defaultValues?.estado !== 'BAJA' &&
    current.estado === 'BAJA';
  const proposedEffect =
    isNewBaja && current.fecha_baja
      ? current.fecha_baja
      : originalEffect > today
        ? originalEffect
        : today;
  const effectiveDate =
    mode === 'edit' && financialChanged && !effectEdited
      ? proposedEffect
      : (current.comision_desde ?? '');
  const showBaja = current.estado === 'BAJA';
  const showEffect =
    advancedOpen || financialChanged || !!errors.comision_desde;

  const submit = handleSubmit(async (data) => {
    const submittedEffect =
      mode === 'edit' && !effectEdited
        ? financialChanged
          ? proposedEffect
          : originalEffect
        : data.comision_desde;
    if (
      mode === 'edit' &&
      submittedEffect &&
      originalEffect &&
      submittedEffect < originalEffect
    ) {
      setAdvancedOpen(true);
      setError('comision_desde', {
        message: `La fecha no puede ser anterior a ${originalEffect.split('-').reverse().join('/')}`,
      });
      return;
    }
    if (
      data.estado === 'BAJA' &&
      data.fecha_baja &&
      submittedEffect &&
      submittedEffect > data.fecha_baja &&
      isNewBaja
    ) {
      setAdvancedOpen(true);
      setError('comision_desde', {
        message: 'La fecha de efecto no puede ser posterior a la baja efectiva',
      });
      return;
    }
    await onSubmit({ ...data, comision_desde: submittedEffect });
  });

  return (
    <form onSubmit={submit} className="space-y-4">
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
          <Label htmlFor="compania-combobox">Compañía</Label>
          <Controller
            name="compania_id"
            control={control}
            render={({ field }) => (
              <CompaniaCombobox
                value={field.value ?? null}
                onChange={field.onChange}
                companias={companias}
                className="mt-1"
              />
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
        <fieldset className="border-line border-t pt-3 sm:col-span-2">
          <legend className="text-ink font-heading pr-3 text-sm font-semibold">
            Vigencia de la póliza
          </legend>
          <div className="grid gap-3 sm:grid-cols-2">
            <Controller
              name="fecha_inicio"
              control={control}
              render={({ field }) => (
                <PolizaDateField
                  id="fecha-inicio"
                  label="Inicio de vigencia"
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  error={errors.fecha_inicio?.message}
                />
              )}
            />
            <Controller
              name="fecha_fin"
              control={control}
              render={({ field }) => (
                <PolizaDateField
                  id="fecha-fin"
                  label="Fin de vigencia (opcional)"
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  error={errors.fecha_fin?.message}
                />
              )}
            />
          </div>
        </fieldset>
        {showBaja && (
          <div className="sm:col-span-2 sm:max-w-[calc(50%-0.375rem)]">
            <Controller
              name="fecha_baja"
              control={control}
              render={({ field }) => (
                <PolizaDateField
                  id="fecha-baja"
                  label="Baja efectiva"
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  error={errors.fecha_baja?.message}
                  hint="Primer día en que deja de aportar."
                />
              )}
            />
          </div>
        )}
        <div className="sm:col-span-2">
          {financialChanged ? (
            <p className="text-ink font-heading text-sm font-semibold">
              Opciones avanzadas de fechas
            </p>
          ) : (
            <button
              type="button"
              aria-expanded={showEffect}
              aria-controls="opciones-fechas"
              onClick={() => setAdvancedOpen((open) => !open)}
              className="text-primary focus-visible:outline-primary flex items-center gap-1.5 text-sm font-medium hover:underline focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              Opciones avanzadas de fechas
              <ChevronDown
                aria-hidden="true"
                className={`h-4 w-4 transition-transform ${showEffect ? 'rotate-180' : ''}`}
              />
            </button>
          )}
          {showEffect && (
            <div
              id="opciones-fechas"
              className="mt-2 sm:max-w-[calc(50%-0.375rem)]"
            >
              <Controller
                name="comision_desde"
                control={control}
                render={({ field }) => (
                  <PolizaDateField
                    id="comision-desde"
                    label="Cambios con efecto desde"
                    value={effectiveDate}
                    onChange={(value) => {
                      setEffectEdited(true);
                      field.onChange(value);
                    }}
                    onBlur={field.onBlur}
                    error={errors.comision_desde?.message}
                    hint="Fecha desde la que rigen los cambios de importe, estado y vigencia."
                  />
                )}
              />
            </div>
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
