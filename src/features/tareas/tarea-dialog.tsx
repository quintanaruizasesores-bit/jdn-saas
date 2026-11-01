'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { createTarea } from '@/services/tareas.service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

export function TareaDialog({
  clienteId,
  polizaId,
  siniestroId,
  trigger,
  onCreated,
}: {
  clienteId?: string | null;
  polizaId?: string | null;
  siniestroId?: string | null;
  trigger?: React.ReactNode;
  onCreated?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [titulo, setTitulo] = useState('');
  const [fechaVencimiento, setFechaVencimiento] = useState('');

  const createMut = useMutation({
    mutationFn: () =>
      createTarea(createClient(), {
        titulo: titulo.trim(),
        estado: 'PENDIENTE',
        descripcion: null,
        fecha_vencimiento: fechaVencimiento || null,
        cliente_id: clienteId ?? null,
        poliza_id: polizaId ?? null,
        siniestro_id: siniestroId ?? null,
      }),
    onSuccess: () => {
      toast.success('Tarea creada');
      setTitulo('');
      setFechaVencimiento('');
      setOpen(false);
      onCreated?.();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setTitulo('');
          setFechaVencimiento('');
        }
      }}
    >
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" className="border-primary text-primary">
            <Plus className="mr-1 h-4 w-4" /> Agregar tarea
          </Button>
        )}
      </DialogTrigger>
      <DialogContent aria-describedby={undefined}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (titulo.trim()) createMut.mutate();
          }}
        >
          <DialogHeader>
            <DialogTitle>Nueva tarea</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 px-6 py-5">
            <div>
              <Label htmlFor="tarea-titulo">Título</Label>
              <Input
                id="tarea-titulo"
                autoFocus
                placeholder="Escribí una tarea..."
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                className="border-line bg-bg mt-1"
              />
            </div>
            <div>
              <Label htmlFor="tarea-vencimiento">Vencimiento (opcional)</Label>
              <Input
                id="tarea-vencimiento"
                type="date"
                value={fechaVencimiento}
                onChange={(e) => setFechaVencimiento(e.target.value)}
                className="border-line bg-bg mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="submit"
              disabled={!titulo.trim() || createMut.isPending}
            >
              {createMut.isPending ? 'Guardando...' : 'Crear tarea'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
