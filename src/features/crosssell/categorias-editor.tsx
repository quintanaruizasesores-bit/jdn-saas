'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Sparkles, Trash2, Wand2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { fetchRamos } from '@/services/ramos.service';
import {
  asegurarCategoriasDefault,
  autosugerirMapeos,
  deleteCategoria,
  fetchCategorias,
  fetchRamoMap,
  setRamoMap,
  upsertCategoria,
} from '@/services/crosssell.service';
import { normalizarTexto } from '@/lib/crosssell/normalizar';

export function CategoriasEditor() {
  const qc = useQueryClient();
  const [nombre, setNombre] = useState('');

  const categoriasQuery = useQuery({
    queryKey: ['crosssell', 'categorias'],
    queryFn: () => fetchCategorias(createClient()),
  });
  const ramosQuery = useQuery({
    queryKey: ['ramos'],
    queryFn: async () => {
      const { data, error } = await fetchRamos(createClient());
      if (error) throw error;
      return data ?? [];
    },
  });
  const mapeoQuery = useQuery({
    queryKey: ['crosssell', 'ramo-map'],
    queryFn: () => fetchRamoMap(createClient()),
  });

  const categorias = categoriasQuery.data ?? [];
  const ramos = ramosQuery.data ?? [];
  const mapeo = new Map(
    (mapeoQuery.data ?? []).map((m) => [m.ramo_id, m])
  );

  const invalidate = () => qc.invalidateQueries({ queryKey: ['crosssell'] });

  const sembrar = useMutation({
    mutationFn: () => asegurarCategoriasDefault(createClient()),
    onSuccess: () => {
      invalidate();
      toast.success('Categorías sugeridas generadas.');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const autosugerir = useMutation({
    mutationFn: () => autosugerirMapeos(createClient()),
    onSuccess: (n) => {
      invalidate();
      toast.success(
        n > 0 ? `${n} ramos mapeados automáticamente.` : 'No había ramos nuevos para mapear.'
      );
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const agregar = useMutation({
    mutationFn: async () => {
      const n = nombre.trim();
      const slug = normalizarTexto(n).replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
      if (!slug) throw new Error('Nombre inválido');
      const { error } = await upsertCategoria(createClient(), {
        nombre: n,
        slug,
        activa: true,
        orden: categorias.length,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setNombre('');
      invalidate();
      toast.success('Categoría agregada.');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleActiva = useMutation({
    mutationFn: async (vars: { id: string; slug: string; nombre: string; activa: boolean }) => {
      const { error } = await upsertCategoria(createClient(), {
        id: vars.id,
        nombre: vars.nombre,
        slug: vars.slug,
        activa: vars.activa,
        orden: 0,
      });
      if (error) throw error;
    },
    onSuccess: () => invalidate(),
    onError: (e: Error) => toast.error(e.message),
  });

  const eliminar = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await deleteCategoria(createClient(), id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success('Categoría eliminada.');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const asignar = useMutation({
    mutationFn: async (vars: { ramoId: string; categoriaId: string | null }) => {
      const { error } = await setRamoMap(
        createClient(),
        vars.ramoId,
        vars.categoriaId
      );
      if (error) throw error;
    },
    onSuccess: () => invalidate(),
    onError: (e: Error) => toast.error(e.message),
  });

  const sinMapear = ramos.filter((r) => !mapeo.has(r.id)).length;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Categorías */}
      <section>
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="text-ink font-medium">Categorías de cobertura</h3>
          {categorias.length === 0 && (
            <Button
              size="sm"
              variant="outline"
              className="gap-1"
              onClick={() => sembrar.mutate()}
              disabled={sembrar.isPending}
            >
              <Sparkles className="h-4 w-4" /> Generar sugeridas
            </Button>
          )}
        </div>
        <div className="mb-3 flex gap-2">
          <Input
            placeholder="Nueva categoría"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            onKeyDown={(e) =>
              e.key === 'Enter' && nombre.trim() && agregar.mutate()
            }
            className="border-line bg-bg2"
          />
          <Button
            onClick={() => agregar.mutate()}
            disabled={!nombre.trim() || agregar.isPending}
          >
            Agregar
          </Button>
        </div>
        {categorias.length === 0 ? (
          <EmptyState
            title="Sin categorías"
            description="Generá las sugeridas o creá las tuyas."
          />
        ) : (
          <ul className="space-y-2">
            {categorias.map((c) => (
              <li
                key={c.id}
                className="border-line bg-panel flex items-center justify-between gap-2 rounded-xl border px-3 py-2"
              >
                <div className="min-w-0">
                  <span className="text-ink text-sm font-medium">
                    {c.nombre}
                  </span>
                  <span className="text-ink-faint ml-2 text-xs">{c.slug}</span>
                  {!c.activa && (
                    <Badge variant="baja" className="ml-2">
                      Inactiva
                    </Badge>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs"
                    onClick={() =>
                      toggleActiva.mutate({
                        id: c.id,
                        slug: c.slug,
                        nombre: c.nombre,
                        activa: !c.activa,
                      })
                    }
                  >
                    {c.activa ? 'Desactivar' : 'Activar'}
                  </Button>
                  <ConfirmDialog
                    trigger={
                      <Button variant="ghost" size="sm" className="text-red">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    }
                    title="Eliminar categoría"
                    description={`¿Eliminar "${c.nombre}"? Se quitarán sus mapeos y reglas asociadas.`}
                    confirmLabel="Eliminar"
                    destructive
                    onConfirm={() => eliminar.mutateAsync(c.id)}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Mapeo ramo -> categoría */}
      <section>
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="text-ink font-medium">
            Mapeo de ramos{' '}
            {sinMapear > 0 && (
              <span className="text-ink-dim text-xs">
                ({sinMapear} sin mapear)
              </span>
            )}
          </h3>
          <Button
            size="sm"
            variant="outline"
            className="gap-1"
            onClick={() => autosugerir.mutate()}
            disabled={autosugerir.isPending || categorias.length === 0}
          >
            <Wand2 className="h-4 w-4" /> Autosugerir
          </Button>
        </div>
        {ramos.length === 0 ? (
          <EmptyState
            title="Sin ramos"
            description="Cargá ramos en Configuración para poder mapearlos."
          />
        ) : (
          <ul className="max-h-[70vh] space-y-2 overflow-auto pr-1">
            {ramos.map((r) => {
              const m = mapeo.get(r.id);
              return (
                <li
                  key={r.id}
                  className="border-line bg-panel flex items-center justify-between gap-2 rounded-xl border px-3 py-2"
                >
                  <div className="min-w-0">
                    <span className="text-ink truncate text-sm">{r.nombre}</span>
                    {m?.origen === 'AUTO' && (
                      <Badge variant="default" className="ml-2">
                        auto
                      </Badge>
                    )}
                  </div>
                  <Select
                    value={m?.categoria_id ?? '__none__'}
                    onValueChange={(v) =>
                      asignar.mutate({
                        ramoId: r.id,
                        categoriaId: v === '__none__' ? null : v,
                      })
                    }
                  >
                    <SelectTrigger className="border-line bg-bg2 h-8 w-44 text-xs">
                      <SelectValue placeholder="Sin categoría" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Sin categoría</SelectItem>
                      {categorias.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
