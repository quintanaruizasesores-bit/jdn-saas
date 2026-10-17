'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AppHeader } from '@/components/dashboard/app-header';
import { createClient } from '@/lib/supabase/client';
import {
  fetchTareas,
  createTarea,
  updateTarea,
  deleteTarea,
} from '@/services/tareas.service';
import { getClienteNombre } from '@/lib/utils';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import Link from 'next/link';
import type { TareaEstado } from '@/types/database';

export default function TareasPage() {
  const qc = useQueryClient();
  const [titulo, setTitulo] = useState('');
  const [fechaVencimiento, setFechaVencimiento] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');

  const { data: tareas, isLoading } = useQuery({
    queryKey: ['tareas', filtroEstado],
    queryFn: async () => {
      const { data } = await fetchTareas(createClient(), {
        estado: filtroEstado || undefined,
      });
      return data ?? [];
    },
  });

  const createMut = useMutation({
    mutationFn: () =>
      createTarea(createClient(), {
        titulo,
        estado: 'PENDIENTE',
        cliente_id: null,
        descripcion: null,
        fecha_vencimiento: fechaVencimiento || null,
      }),
    onSuccess: () => {
      toast.success('Tarea creada');
      setTitulo('');
      setFechaVencimiento('');
      qc.invalidateQueries({ queryKey: ['tareas'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMut = useMutation({
    mutationFn: ({
      id,
      ...cambios
    }: { id: string } & Partial<{
      estado: TareaEstado;
      fecha_vencimiento: string | null;
    }>) => updateTarea(createClient(), id, cambios),
    onSuccess: (_, variables) => {
      if ('fecha_vencimiento' in variables)
        toast.success(
          variables.fecha_vencimiento
            ? 'Vencimiento actualizado'
            : 'Vencimiento quitado'
        );
      qc.invalidateQueries({ queryKey: ['tareas'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteTarea(createClient(), id),
    onSuccess: () => {
      toast.success('Tarea eliminada');
      qc.invalidateQueries({ queryKey: ['tareas'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div>
      <AppHeader title="Tareas" subtitle="Seguimiento comercial" />

      <div className="mb-4 flex flex-wrap items-end gap-2">
        <label className="text-ink-dim min-w-48 flex-1 text-xs sm:flex-none">
          <span className="mb-1 block">Nueva tarea</span>
          <Input
            placeholder="Escribí una tarea..."
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            className="border-line bg-bg2"
          />
        </label>
        <label
          htmlFor="nueva-tarea-vencimiento"
          className="text-ink-dim w-full text-xs sm:w-48"
        >
          <span className="mb-1 block">Vencimiento (opcional)</span>
          <Input
            id="nueva-tarea-vencimiento"
            type="date"
            value={fechaVencimiento}
            onChange={(e) => setFechaVencimiento(e.target.value)}
            className="border-line bg-bg2"
          />
        </label>
        <Button
          onClick={() => createMut.mutate()}
          disabled={!titulo.trim() || createMut.isPending}
        >
          Agregar
        </Button>
        <Select
          value={filtroEstado || 'all'}
          onValueChange={(v) => setFiltroEstado(v === 'all' ? '' : v)}
        >
          <SelectTrigger className="border-line bg-bg2 w-[160px]">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="PENDIENTE">Pendiente</SelectItem>
            <SelectItem value="EN_PROCESO">En proceso</SelectItem>
            <SelectItem value="FINALIZADA">Finalizada</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        {isLoading ? (
          <p className="text-ink-faint">Cargando...</p>
        ) : (
          (tareas ?? []).map((t) => {
            const c = t.cliente as {
              nombre: string;
              apellido: string;
              id: string;
            } | null;
            return (
              <div
                key={t.id}
                className="border-line bg-panel flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4"
              >
                <div>
                  <p className="text-ink font-medium">{t.titulo}</p>
                  {c && (
                    <Link
                      href={`/clientes/${c.id}`}
                      className="text-blue hover:text-primary text-xs"
                    >
                      {getClienteNombre(c)}
                    </Link>
                  )}
                </div>
                <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
                  <label className="text-ink-dim flex min-w-0 items-center gap-2 text-xs">
                    <span>Vence</span>
                    <Input
                      type="date"
                      aria-label={`Vencimiento de ${t.titulo}`}
                      value={t.fecha_vencimiento ?? ''}
                      onChange={(e) =>
                        updateMut.mutate({
                          id: t.id,
                          fecha_vencimiento: e.target.value || null,
                        })
                      }
                      disabled={updateMut.isPending}
                      className="border-line bg-bg2 h-9 w-36 px-2"
                    />
                  </label>
                  <Select
                    value={t.estado}
                    onValueChange={(v) =>
                      updateMut.mutate({
                        id: t.id,
                        estado: v as 'PENDIENTE' | 'EN_PROCESO' | 'FINALIZADA',
                      })
                    }
                  >
                    <SelectTrigger className="border-line bg-bg2 w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PENDIENTE">Pendiente</SelectItem>
                      <SelectItem value="EN_PROCESO">En proceso</SelectItem>
                      <SelectItem value="FINALIZADA">Finalizada</SelectItem>
                    </SelectContent>
                  </Select>
                  <ConfirmDialog
                    trigger={
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red"
                        aria-label="Eliminar tarea"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    }
                    title="Eliminar tarea"
                    description="Esta acción es permanente. ¿Querés eliminar esta tarea?"
                    confirmLabel="Eliminar"
                    destructive
                    onConfirm={() => deleteMut.mutateAsync(t.id)}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
