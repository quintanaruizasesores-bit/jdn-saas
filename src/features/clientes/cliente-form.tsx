'use client';

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { clienteSchema, type ClienteFormData } from '@/validations/cliente.schema';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { displayToIso, isoToDisplay, maskFechaInput } from '@/lib/clientes/fecha-nacimiento';
import type { Cliente } from '@/types/database';

export function ClienteForm({
  defaultValues,
  onSubmit,
  loading,
}: {
  defaultValues?: Cliente;
  onSubmit: (data: ClienteFormData) => Promise<void>;
  loading?: boolean;
}) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<ClienteFormData>({
    resolver: zodResolver(clienteSchema),
    defaultValues: defaultValues
      ? {
          nombre: defaultValues.nombre,
          apellido: defaultValues.apellido,
          dni: defaultValues.dni ?? '',
          observaciones: defaultValues.observaciones ?? '',
          email: defaultValues.email ?? '',
          telefono: defaultValues.telefono ?? '',
          direccion: defaultValues.direccion ?? '',
          localidad: defaultValues.localidad ?? '',
          provincia: defaultValues.provincia ?? '',
          fecha_nacimiento: isoToDisplay(defaultValues.fecha_nacimiento),
        }
      : undefined,
  });

  // El form trabaja con 'dd/mm/aaaa'; la columna DATE espera ISO 'yyyy-mm-dd'.
  const submit = handleSubmit((data) =>
    onSubmit({ ...data, fecha_nacimiento: displayToIso(data.fecha_nacimiento) })
  );

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        {(
          [
            ['nombre', 'Nombre'],
            ['apellido', 'Apellido'],
            ['dni', 'DNI / CUIT'],
            ['observaciones', 'Observaciones'],
            ['email', 'Email'],
            ['telefono', 'Teléfono'],
            ['direccion', 'Dirección'],
            ['localidad', 'Localidad'],
            ['provincia', 'Provincia'],
          ] as const
        ).map(([name, label]) => (
          <div key={name} className="space-y-2">
            <Label htmlFor={name}>{label}</Label>
            <Input
              id={name}
              type={name === 'email' ? 'email' : 'text'}
              {...register(name)}
            />
            {errors[name] && <p className="text-xs text-red">{errors[name]?.message}</p>}
          </div>
        ))}

        <div className="space-y-2">
          <Label htmlFor="fecha_nacimiento">Fecha nacimiento</Label>
          <Controller
            control={control}
            name="fecha_nacimiento"
            render={({ field }) => (
              <Input
                id="fecha_nacimiento"
                type="text"
                inputMode="numeric"
                maxLength={10}
                placeholder="dd/mm/aaaa"
                value={field.value ?? ''}
                onChange={(e) => field.onChange(maskFechaInput(e.target.value))}
                onBlur={field.onBlur}
                name={field.name}
                ref={field.ref}
              />
            )}
          />
          {errors.fecha_nacimiento && (
            <p className="text-xs text-red">{errors.fecha_nacimiento?.message}</p>
          )}
        </div>
      </div>
      <Button type="submit" disabled={loading}>
        {loading ? 'Guardando…' : defaultValues ? 'Actualizar' : 'Crear cliente'}
      </Button>
    </form>
  );
}
