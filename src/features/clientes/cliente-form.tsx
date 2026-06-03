'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { clienteSchema, type ClienteFormData } from '@/validations/cliente.schema';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
    formState: { errors },
  } = useForm<ClienteFormData>({
    resolver: zodResolver(clienteSchema),
    defaultValues: defaultValues
      ? {
          nombre: defaultValues.nombre,
          apellido: defaultValues.apellido,
          dni: defaultValues.dni ?? '',
          cuit: defaultValues.cuit ?? '',
          email: defaultValues.email ?? '',
          telefono: defaultValues.telefono ?? '',
          direccion: defaultValues.direccion ?? '',
          localidad: defaultValues.localidad ?? '',
          provincia: defaultValues.provincia ?? '',
          fecha_nacimiento: defaultValues.fecha_nacimiento ?? '',
        }
      : undefined,
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        {(
          [
            ['nombre', 'Nombre'],
            ['apellido', 'Apellido'],
            ['dni', 'DNI'],
            ['cuit', 'CUIT'],
            ['email', 'Email'],
            ['telefono', 'Teléfono'],
            ['direccion', 'Dirección'],
            ['localidad', 'Localidad'],
            ['provincia', 'Provincia'],
            ['fecha_nacimiento', 'Fecha nacimiento'],
          ] as const
        ).map(([name, label]) => (
          <div key={name} className="space-y-2">
            <Label htmlFor={name}>{label}</Label>
            <Input
              id={name}
              type={name === 'fecha_nacimiento' ? 'date' : name === 'email' ? 'email' : 'text'}
              {...register(name)}
            />
            {errors[name] && <p className="text-xs text-red">{errors[name]?.message}</p>}
          </div>
        ))}
      </div>
      <Button type="submit" disabled={loading}>
        {loading ? 'Guardando…' : defaultValues ? 'Actualizar' : 'Crear cliente'}
      </Button>
    </form>
  );
}
