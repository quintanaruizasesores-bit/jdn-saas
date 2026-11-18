'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import type { CrossSellRegla } from '@/types/database';
import {
  deleteRegla,
  fetchCategorias,
  fetchReglas,
  upsertRegla,
} from '@/services/crosssell.service';
import { crossSellReglaSchema } from '@/validations/crosssell.schema';

interface FormState {
  id?: string;
  nombre: string;
  descripcion: string;
  activa: boolean;
  prioridad: number;
  modo: 'ALL' | 'ANY';
  categorias_requeridas: string[];
  categoria_objetivo_id: string;
  min_polizas: string;
}

const EMPTY: FormState = {
  nombre: '',
  descripcion: '',
  activa: true,
  prioridad: 50,
  modo: 'ANY',
  categorias_requeridas: [],
  categoria_objetivo_id: '',
  min_polizas: '',
};

export function ReglasEditor() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);

  const reglasQuery = useQuery({
    queryKey: ['crosssell', 'reglas'],
    queryFn: () => fetchReglas(createClient()),
  });
  const categoriasQuery = useQuery({
    queryKey: ['crosssell', 'categorias'],
    queryFn: () => fetchCategorias(createClient()),
  });
  const categorias = categoriasQuery.data ?? [];
  const catNombre = (id: string) =>
    categorias.find((c) => c.id === id)?.nombre ?? '—';

  const guardar = useMutation({
    mutationFn: async () => {
      const parsed = crossSellReglaSchema.safeParse({
        nombre: form.nombre,
        descripcion: form.descripcion || null,
        activa: form.activa,
        prioridad: Number(form.prioridad),
        categorias_requeridas: form.categorias_requeridas,
        modo: form.modo,
        categoria_objetivo_id: form.categoria_objetivo_id,
        condiciones: form.min_polizas
          ? { min_polizas: Number(form.min_polizas) }
          : {},
      });
      if (!parsed.success)
        throw new Error(parsed.error.issues[0]?.message ?? 'Datos inválidos');
      const { error } = await upsertRegla(createClient(), {
        ...parsed.data,
        id: form.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['crosssell'] });
      toast.success('Regla guardada.');
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const eliminar = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await deleteRegla(createClient(), id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['crosssell'] });
      toast.success('Regla eliminada.');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const nueva = () => {
    setForm(EMPTY);
    setOpen(true);
  };
  const editar = (r: CrossSellRegla) => {
    setForm({
      id: r.id,
      nombre: r.nombre,
      descripcion: r.descripcion ?? '',
      activa: r.activa,
      prioridad: r.prioridad,
      modo: r.modo,
      categorias_requeridas: r.categorias_requeridas,
      categoria_objetivo_id: r.categoria_objetivo_id,
      min_polizas: r.condiciones?.min_polizas
        ? String(r.condiciones.min_polizas)
        : '',
    });
    setOpen(true);
  };

  const toggleReq = (id: string) =>
    setForm((f) => ({
      ...f,
      categorias_requeridas: f.categorias_requeridas.includes(id)
        ? f.categorias_requeridas.filter((x) => x !== id)
        : [...f.categorias_requeridas, id],
    }));

  const reglas = reglasQuery.data ?? [];

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-ink-dim text-sm">
          Reglas configurables: cliente que tiene las categorías requeridas y no
          tiene la objetivo.
        </p>
        <Button onClick={nueva} size="sm" className="gap-1">
          <Plus className="h-4 w-4" /> Nueva regla
        </Button>
      </div>

      {reglas.length === 0 ? (
        <EmptyState
          title="Sin reglas"
          description="Creá una regla o usá las de ejemplo que se generan al detectar oportunidades."
        />
      ) : (
        <ul className="space-y-2">
          {reglas.map((r) => (
            <li
              key={r.id}
              className="border-line bg-panel flex items-start justify-between gap-3 rounded-xl border px-4 py-3"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-ink font-medium">{r.nombre}</span>
                  {!r.activa && <Badge variant="baja">Inactiva</Badge>}
                  <Badge variant="default">prioridad {r.prioridad}</Badge>
                </div>
                <p className="text-ink-dim mt-0.5 text-xs">
                  Tiene{' '}
                  <b>
                    {r.modo === 'ALL' ? 'todas' : 'alguna'} de:{' '}
                    {r.categorias_requeridas.map(catNombre).join(', ') || '—'}
                  </b>{' '}
                  → ofrecer <b>{catNombre(r.categoria_objetivo_id)}</b>
                  {r.condiciones?.min_polizas
                    ? ` · mín. ${r.condiciones.min_polizas} pólizas`
                    : ''}
                </p>
              </div>
              <div className="flex shrink-0 gap-1">
                <Button variant="ghost" size="sm" onClick={() => editar(r)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <ConfirmDialog
                  trigger={
                    <Button variant="ghost" size="sm" className="text-red">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  }
                  title="Eliminar regla"
                  description={`¿Eliminar la regla "${r.nombre}"?`}
                  confirmLabel="Eliminar"
                  destructive
                  onConfirm={() => eliminar.mutateAsync(r.id)}
                />
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>{form.id ? 'Editar regla' : 'Nueva regla'}</DialogTitle>
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
              <label className="text-ink-dim text-xs">Descripción</label>
              <Input
                value={form.descripcion}
                onChange={(e) =>
                  setForm({ ...form, descripcion: e.target.value })
                }
                className="border-line bg-bg2 mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-ink-dim text-xs">Modo requisitos</label>
                <Select
                  value={form.modo}
                  onValueChange={(v) =>
                    setForm({ ...form, modo: v as 'ALL' | 'ANY' })
                  }
                >
                  <SelectTrigger className="border-line bg-bg2 mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ANY">Alguna categoría</SelectItem>
                    <SelectItem value="ALL">Todas las categorías</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-ink-dim text-xs">Prioridad (0–100)</label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={form.prioridad}
                  onChange={(e) =>
                    setForm({ ...form, prioridad: Number(e.target.value) })
                  }
                  className="border-line bg-bg2 mt-1"
                />
              </div>
            </div>
            <div>
              <label className="text-ink-dim text-xs">
                Categorías requeridas (las que el cliente debe tener)
              </label>
              <div className="border-line bg-bg2 mt-1 max-h-40 space-y-1 overflow-auto rounded-lg border p-2">
                {categorias.map((c) => (
                  <label
                    key={c.id}
                    className="flex cursor-pointer items-center gap-2 text-sm"
                  >
                    <Checkbox
                      checked={form.categorias_requeridas.includes(c.id)}
                      onCheckedChange={() => toggleReq(c.id)}
                    />
                    {c.nombre}
                  </label>
                ))}
                {categorias.length === 0 && (
                  <p className="text-ink-dim text-xs">
                    Primero creá categorías en la pestaña Categorías.
                  </p>
                )}
              </div>
            </div>
            <div>
              <label className="text-ink-dim text-xs">
                Categoría objetivo (la que se ofrece)
              </label>
              <Select
                value={form.categoria_objetivo_id}
                onValueChange={(v) =>
                  setForm({ ...form, categoria_objetivo_id: v })
                }
              >
                <SelectTrigger className="border-line bg-bg2 mt-1">
                  <SelectValue placeholder="Elegí una categoría" />
                </SelectTrigger>
                <SelectContent>
                  {categorias.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 items-center gap-3">
              <div>
                <label className="text-ink-dim text-xs">
                  Mín. pólizas (opcional)
                </label>
                <Input
                  type="number"
                  min={1}
                  value={form.min_polizas}
                  onChange={(e) =>
                    setForm({ ...form, min_polizas: e.target.value })
                  }
                  className="border-line bg-bg2 mt-1"
                />
              </div>
              <label className="mt-5 flex cursor-pointer items-center gap-2 text-sm">
                <Checkbox
                  checked={form.activa}
                  onCheckedChange={(v) =>
                    setForm({ ...form, activa: v === true })
                  }
                />
                Regla activa
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => guardar.mutate()}
              disabled={guardar.isPending}
            >
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
