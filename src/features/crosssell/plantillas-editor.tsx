'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Pencil, Plus, Sparkles, Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import type { CrossSellPlantilla } from '@/types/database';
import {
  asegurarPlantillasDefault,
  deletePlantilla,
  fetchPlantillas,
  upsertPlantilla,
} from '@/services/crosssell.service';
import { crossSellPlantillaSchema } from '@/validations/crosssell.schema';
import { VARIABLES_DISPONIBLES } from '@/lib/crosssell/correo/plantilla';

interface FormState {
  id?: string;
  nombre: string;
  asunto: string;
  cuerpo: string;
  activa: boolean;
}
const EMPTY: FormState = { nombre: '', asunto: '', cuerpo: '', activa: true };

export function PlantillasEditor() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);

  const query = useQuery({
    queryKey: ['crosssell', 'plantillas'],
    queryFn: () => fetchPlantillas(createClient()),
  });

  const guardar = useMutation({
    mutationFn: async () => {
      const parsed = crossSellPlantillaSchema.safeParse(form);
      if (!parsed.success)
        throw new Error(parsed.error.issues[0]?.message ?? 'Datos inválidos');
      const { error } = await upsertPlantilla(createClient(), {
        ...parsed.data,
        id: form.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['crosssell', 'plantillas'] });
      toast.success('Plantilla guardada.');
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const eliminar = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await deletePlantilla(createClient(), id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['crosssell', 'plantillas'] });
      toast.success('Plantilla eliminada.');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const sembrarEjemplos = useMutation({
    mutationFn: () => asegurarPlantillasDefault(createClient()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['crosssell', 'plantillas'] });
      toast.success('Plantillas de ejemplo generadas.');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const nueva = () => {
    setForm(EMPTY);
    setOpen(true);
  };
  const editar = (p: CrossSellPlantilla) => {
    setForm({
      id: p.id,
      nombre: p.nombre,
      asunto: p.asunto,
      cuerpo: p.cuerpo,
      activa: p.activa,
    });
    setOpen(true);
  };

  const plantillas = query.data ?? [];

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-ink-dim text-sm">
          Plantillas reutilizables. Variables:{' '}
          {VARIABLES_DISPONIBLES.map((v) => `{{${v.clave}}}`).join(' ')}
        </p>
        <div className="flex gap-2">
          {plantillas.length === 0 && (
            <Button
              onClick={() => sembrarEjemplos.mutate()}
              size="sm"
              variant="outline"
              className="gap-1"
              disabled={sembrarEjemplos.isPending}
            >
              <Sparkles className="h-4 w-4" /> Generar ejemplos
            </Button>
          )}
          <Button onClick={nueva} size="sm" className="gap-1">
            <Plus className="h-4 w-4" /> Nueva plantilla
          </Button>
        </div>
      </div>

      {plantillas.length === 0 ? (
        <EmptyState
          title="Sin plantillas"
          description='Tocá "Generar ejemplos" para cargar plantillas editables y ver cómo se usan las variables, o creá la tuya.'
        />
      ) : (
        <ul className="space-y-2">
          {plantillas.map((p) => (
            <li
              key={p.id}
              className="border-line bg-panel flex items-start justify-between gap-3 rounded-xl border px-4 py-3"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-ink font-medium">{p.nombre}</span>
                  {!p.activa && <Badge variant="baja">Inactiva</Badge>}
                </div>
                <p className="text-ink-dim mt-0.5 truncate text-xs">
                  {p.asunto}
                </p>
              </div>
              <div className="flex shrink-0 gap-1">
                <Button variant="ghost" size="sm" onClick={() => editar(p)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <ConfirmDialog
                  trigger={
                    <Button variant="ghost" size="sm" className="text-red">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  }
                  title="Eliminar plantilla"
                  description={`¿Eliminar "${p.nombre}"?`}
                  confirmLabel="Eliminar"
                  destructive
                  onConfirm={() => eliminar.mutateAsync(p.id)}
                />
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>
              {form.id ? 'Editar plantilla' : 'Nueva plantilla'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-ink-dim text-xs">Nombre</label>
              <Input
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                className="border-line bg-bg2 mt-1"
              />
            </div>
            <div>
              <label className="text-ink-dim text-xs">Asunto</label>
              <Input
                value={form.asunto}
                onChange={(e) => setForm({ ...form, asunto: e.target.value })}
                className="border-line bg-bg2 mt-1"
                placeholder="{{nombre}}, ¿sumamos tu {{coberturaOfrecida}}?"
              />
            </div>
            <div>
              <label className="text-ink-dim text-xs">Mensaje</label>
              <Textarea
                value={form.cuerpo}
                onChange={(e) => setForm({ ...form, cuerpo: e.target.value })}
                rows={9}
                className="border-line bg-bg2 mt-1 font-mono text-[13px]"
                placeholder={'Hola {{nombre}}, ...'}
              />
            </div>
            <p className="text-ink-faint text-[11px]">
              No afirmes que el cliente no tiene la cobertura en otra aseguradora:
              ofrecé sumarla con nosotros.
            </p>
          </div>
          <DialogFooter>
            <Button onClick={() => guardar.mutate()} disabled={guardar.isPending}>
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
