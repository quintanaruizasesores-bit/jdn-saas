'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import Link from 'next/link';
import { AppHeader } from '@/components/dashboard/app-header';
import { createClient } from '@/lib/supabase/client';
import { fetchCompanias, upsertCompania, deleteCompania } from '@/services/companias.service';
import { fetchRamos, upsertRamo, deleteRamo } from '@/services/ramos.service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function ConfigPage() {
  const qc = useQueryClient();
  const [nombreCia, setNombreCia] = useState('');
  const [nombreRamo, setNombreRamo] = useState('');

  const { data: companias } = useQuery({
    queryKey: ['companias'],
    queryFn: async () => {
      const { data } = await fetchCompanias(createClient());
      return data ?? [];
    },
  });

  const { data: ramos } = useQuery({
    queryKey: ['ramos'],
    queryFn: async () => {
      const { data } = await fetchRamos(createClient());
      return data ?? [];
    },
  });

  const addCia = useMutation({
    mutationFn: () => upsertCompania(createClient(), { nombre: nombreCia, estado: 'ACTIVA' }),
    onSuccess: () => {
      setNombreCia('');
      qc.invalidateQueries({ queryKey: ['companias'] });
      toast.success('Compañía guardada');
    },
  });

  const addRamo = useMutation({
    mutationFn: () => upsertRamo(createClient(), { nombre: nombreRamo }),
    onSuccess: () => {
      setNombreRamo('');
      qc.invalidateQueries({ queryKey: ['ramos'] });
      toast.success('Ramo guardado');
    },
  });

  return (
    <div>
      <AppHeader title="Configuración" subtitle="Catálogos de compañías y ramos" />
      <Link href="/config/ramos" className="sr-only">
        Ramos
      </Link>

      <Tabs defaultValue="companias">
        <TabsList className="bg-panel2 border border-line">
          <TabsTrigger value="companias">Compañías</TabsTrigger>
          <TabsTrigger value="ramos">Ramos</TabsTrigger>
        </TabsList>
        <TabsContent value="companias" className="mt-4">
          <div className="mb-4 flex gap-2">
            <Input
              placeholder="Nombre compañía"
              value={nombreCia}
              onChange={(e) => setNombreCia(e.target.value)}
              className="max-w-xs border-line bg-bg2"
            />
            <Button onClick={() => addCia.mutate()} className="bg-amber text-[#1a1510]">
              Agregar
            </Button>
          </div>
          <ul className="space-y-2">
            {(companias ?? []).map((c) => (
              <li
                key={c.id}
                className="flex items-center justify-between rounded-[3px] border border-line bg-panel px-4 py-3"
              >
                <span>{c.nombre}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red"
                  onClick={async () => {
                    await deleteCompania(createClient(), c.id);
                    qc.invalidateQueries({ queryKey: ['companias'] });
                  }}
                >
                  Eliminar
                </Button>
              </li>
            ))}
          </ul>
        </TabsContent>
        <TabsContent value="ramos" className="mt-4">
          <div className="mb-4 flex gap-2">
            <Input
              placeholder="Nombre ramo"
              value={nombreRamo}
              onChange={(e) => setNombreRamo(e.target.value)}
              className="max-w-xs border-line bg-bg2"
            />
            <Button onClick={() => addRamo.mutate()} className="bg-amber text-[#1a1510]">
              Agregar
            </Button>
          </div>
          <ul className="space-y-2">
            {(ramos ?? []).map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between rounded-[3px] border border-line bg-panel px-4 py-3"
              >
                <span>{r.nombre}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red"
                  onClick={async () => {
                    await deleteRamo(createClient(), r.id);
                    qc.invalidateQueries({ queryKey: ['ramos'] });
                  }}
                >
                  Eliminar
                </Button>
              </li>
            ))}
          </ul>
        </TabsContent>
      </Tabs>
    </div>
  );
}
