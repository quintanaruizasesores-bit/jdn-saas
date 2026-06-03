'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AppHeader } from '@/components/dashboard/app-header';
import { createClient } from '@/lib/supabase/client';
import { fetchTareas, createTarea, updateTarea } from '@/services/tareas.service';
import { formatDate, getClienteNombre } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import Link from 'next/link';

export default function TareasPage() {
  const qc = useQueryClient();
  const [titulo, setTitulo] = useState('');
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
        fecha_vencimiento: null,
      }),
    onSuccess: () => {
      toast.success('Tarea creada');
      setTitulo('');
      qc.invalidateQueries({ queryKey: ['tareas'] });
    },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, estado }: { id: string; estado: 'PENDIENTE' | 'EN_PROCESO' | 'FINALIZADA' }) =>
      updateTarea(createClient(), id, { estado }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tareas'] }),
  });

  return (
    <div>
      <AppHeader title="Tareas" subtitle="Seguimiento comercial" />

      <div className="mb-4 flex flex-wrap gap-2">
        <Input
          placeholder="Nueva tarea..."
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          className="max-w-xs border-line bg-bg2"
        />
        <Button onClick={() => createMut.mutate()} disabled={!titulo} className="bg-amber text-[#1a1510]">
          Agregar
        </Button>
        <Select value={filtroEstado || 'all'} onValueChange={(v) => setFiltroEstado(v === 'all' ? '' : v)}>
          <SelectTrigger className="w-[160px] border-line bg-bg2">
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
            const c = t.cliente as { nombre: string; apellido: string; id: string } | null;
            return (
              <div
                key={t.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-[3px] border border-line bg-panel p-4"
              >
                <div>
                  <p className="font-medium text-ink">{t.titulo}</p>
                  {c && (
                    <Link href={`/clientes/${c.id}`} className="text-xs text-blue hover:text-amber">
                      {getClienteNombre(c)}
                    </Link>
                  )}
                  <p className="text-xs text-ink-faint">Vence: {formatDate(t.fecha_vencimiento)}</p>
                </div>
                <Select
                  value={t.estado}
                  onValueChange={(v) =>
                    updateMut.mutate({
                      id: t.id,
                      estado: v as 'PENDIENTE' | 'EN_PROCESO' | 'FINALIZADA',
                    })
                  }
                >
                  <SelectTrigger className="w-[140px] border-line bg-bg2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PENDIENTE">Pendiente</SelectItem>
                    <SelectItem value="EN_PROCESO">En proceso</SelectItem>
                    <SelectItem value="FINALIZADA">Finalizada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
