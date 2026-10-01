'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';
import { AppHeader } from '@/components/dashboard/app-header';
import { createClient } from '@/lib/supabase/client';
import { fetchCompanias, upsertCompania, deleteCompania } from '@/services/companias.service';
import { fetchRamos, upsertRamo, deleteRamo } from '@/services/ramos.service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type ConfigTab = 'companias' | 'ramos';

export function ConfigManager({ defaultTab = 'companias' }: { defaultTab?: ConfigTab }) {
  const qc = useQueryClient();
  const [nombreCia, setNombreCia] = useState('');
  const [nombreRamo, setNombreRamo] = useState('');

  const companiasQuery = useQuery({
    queryKey: ['companias'],
    queryFn: async () => {
      const { data, error } = await fetchCompanias(createClient());
      if (error) throw error;
      return data ?? [];
    },
  });

  const ramosQuery = useQuery({
    queryKey: ['ramos'],
    queryFn: async () => {
      const { data, error } = await fetchRamos(createClient());
      if (error) throw error;
      return data ?? [];
    },
  });

  const addCia = useMutation({
    mutationFn: async () => {
      const { error } = await upsertCompania(createClient(), {
        nombre: nombreCia.trim(),
        estado: 'ACTIVA',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setNombreCia('');
      qc.invalidateQueries({ queryKey: ['companias'] });
      toast.success('Compañía guardada');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const delCia = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await deleteCompania(createClient(), id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['companias'] });
      toast.success('Compañía eliminada');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const addRamo = useMutation({
    mutationFn: async () => {
      const { error } = await upsertRamo(createClient(), { nombre: nombreRamo.trim() });
      if (error) throw error;
    },
    onSuccess: () => {
      setNombreRamo('');
      qc.invalidateQueries({ queryKey: ['ramos'] });
      toast.success('Ramo guardado');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const delRamo = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await deleteRamo(createClient(), id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ramos'] });
      toast.success('Ramo eliminado');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div>
      <AppHeader title="Configuración" subtitle="Catálogos de compañías y ramos" />

      <Tabs defaultValue={defaultTab}>
        <TabsList className="border border-line bg-panel2">
          <TabsTrigger value="companias">Compañías</TabsTrigger>
          <TabsTrigger value="ramos">Ramos</TabsTrigger>
        </TabsList>

        <TabsContent value="companias" className="mt-4">
          <div className="mb-4 flex gap-2">
            <Input
              placeholder="Nombre compañía"
              value={nombreCia}
              onChange={(e) => setNombreCia(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && nombreCia.trim() && addCia.mutate()}
              className="max-w-xs border-line bg-bg2"
            />
            <Button
              onClick={() => addCia.mutate()}
              disabled={!nombreCia.trim() || addCia.isPending}
              className="bg-amber text-[#1a1510]"
            >
              Agregar
            </Button>
          </div>
          {companiasQuery.isError ? (
            <ErrorState onRetry={() => companiasQuery.refetch()} />
          ) : !companiasQuery.data?.length ? (
            <EmptyState title="Sin compañías" description="Agregá la primera compañía arriba." />
          ) : (
            <ul className="space-y-2">
              {companiasQuery.data.map((c) => (
                <li
                  key={c.id}
                  className="flex items-center justify-between rounded-[3px] border border-line bg-panel px-4 py-3"
                >
                  <span>{c.nombre}</span>
                  <ConfirmDialog
                    trigger={
                      <Button variant="ghost" size="sm" className="text-red" aria-label="Eliminar compañía">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    }
                    title="Eliminar compañía"
                    description={`¿Eliminar la compañía "${c.nombre}"? Esta acción es permanente.`}
                    confirmLabel="Eliminar"
                    destructive
                    onConfirm={() => delCia.mutateAsync(c.id)}
                  />
                </li>
              ))}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="ramos" className="mt-4">
          <div className="mb-4 flex gap-2">
            <Input
              placeholder="Nombre ramo"
              value={nombreRamo}
              onChange={(e) => setNombreRamo(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && nombreRamo.trim() && addRamo.mutate()}
              className="max-w-xs border-line bg-bg2"
            />
            <Button
              onClick={() => addRamo.mutate()}
              disabled={!nombreRamo.trim() || addRamo.isPending}
              className="bg-amber text-[#1a1510]"
            >
              Agregar
            </Button>
          </div>
          {ramosQuery.isError ? (
            <ErrorState onRetry={() => ramosQuery.refetch()} />
          ) : !ramosQuery.data?.length ? (
            <EmptyState title="Sin ramos" description="Agregá el primer ramo arriba." />
          ) : (
            <ul className="space-y-2">
              {ramosQuery.data.map((r) => (
                <li
                  key={r.id}
                  className="flex items-center justify-between rounded-[3px] border border-line bg-panel px-4 py-3"
                >
                  <span>{r.nombre}</span>
                  <ConfirmDialog
                    trigger={
                      <Button variant="ghost" size="sm" className="text-red" aria-label="Eliminar ramo">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    }
                    title="Eliminar ramo"
                    description={`¿Eliminar el ramo "${r.nombre}"? Esta acción es permanente.`}
                    confirmLabel="Eliminar"
                    destructive
                    onConfirm={() => delRamo.mutateAsync(r.id)}
                  />
                </li>
              ))}
            </ul>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
