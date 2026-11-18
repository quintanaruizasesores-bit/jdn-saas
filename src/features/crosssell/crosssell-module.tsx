'use client';

import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { RefreshCw } from 'lucide-react';
import { AppHeader } from '@/components/dashboard/app-header';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { OportunidadEnriquecida } from '@/services/crosssell.service';
import { Bandeja } from '@/features/crosssell/bandeja';
import { ReglasEditor } from '@/features/crosssell/reglas-editor';
import { CategoriasEditor } from '@/features/crosssell/categorias-editor';
import { PlantillasEditor } from '@/features/crosssell/plantillas-editor';
import { HistorialPanel } from '@/features/crosssell/historial-panel';

export const OPORTUNIDADES_KEY = ['crosssell', 'oportunidades'] as const;

async function fetchOportunidadesApi(): Promise<OportunidadEnriquecida[]> {
  const res = await fetch('/api/cross-selling/oportunidades', {
    cache: 'no-store',
  });
  const json = await res.json();
  if (!res.ok)
    throw new Error(json.error ?? 'No se pudieron cargar las oportunidades.');
  return json.oportunidades as OportunidadEnriquecida[];
}

const ABIERTOS = new Set(['NUEVA', 'VISTA', 'CONTACTADA', 'EN_NEGOCIACION']);

export function CrossSellingModule() {
  const qc = useQueryClient();
  const oportunidadesQuery = useQuery({
    queryKey: OPORTUNIDADES_KEY,
    queryFn: fetchOportunidadesApi,
    staleTime: 30_000,
  });

  const regenerar = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/cross-selling/regenerar', {
        method: 'POST',
      });
      const json = await res.json();
      if (!res.ok)
        throw new Error(json.error ?? 'No se pudieron regenerar las oportunidades.');
      return json as { detectadas: number; convertidas: number };
    },
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ['crosssell'] });
      toast.success(
        `Detectadas ${r.detectadas} oportunidades${
          r.convertidas ? ` · ${r.convertidas} convertidas` : ''
        }.`
      );
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const kpis = useMemo(
    () => computeKpis(oportunidadesQuery.data ?? []),
    [oportunidadesQuery.data]
  );

  return (
    <div>
      <AppHeader
        title="Cross-Selling"
        subtitle="Oportunidades de venta cruzada y contacto personalizado"
        actions={
          <Button
            onClick={() => regenerar.mutate()}
            disabled={regenerar.isPending}
            className="gap-2"
          >
            <RefreshCw
              className={`h-4 w-4 ${regenerar.isPending ? 'animate-spin' : ''}`}
            />
            {regenerar.isPending ? 'Analizando…' : 'Detectar oportunidades'}
          </Button>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-5">
        <Kpi label="Abiertas" value={kpis.abiertas} />
        <Kpi label="Pendientes" value={kpis.pendientes} hint="Sin contactar" />
        <Kpi label="En seguimiento" value={kpis.seguimiento} />
        <Kpi label="Convertidas" value={kpis.convertidas} />
        <Kpi label="Descartadas" value={kpis.descartadas} />
      </div>

      <Tabs defaultValue="oportunidades">
        <TabsList className="border-line bg-panel2 h-auto flex-wrap justify-start border">
          <TabsTrigger value="oportunidades">Oportunidades</TabsTrigger>
          <TabsTrigger value="reglas">Reglas</TabsTrigger>
          <TabsTrigger value="categorias">Categorías y mapeo</TabsTrigger>
          <TabsTrigger value="plantillas">Plantillas</TabsTrigger>
          <TabsTrigger value="historial">Historial</TabsTrigger>
        </TabsList>

        <TabsContent value="oportunidades" className="mt-4">
          <Bandeja query={oportunidadesQuery} />
        </TabsContent>
        <TabsContent value="reglas" className="mt-4">
          <ReglasEditor />
        </TabsContent>
        <TabsContent value="categorias" className="mt-4">
          <CategoriasEditor />
        </TabsContent>
        <TabsContent value="plantillas" className="mt-4">
          <PlantillasEditor />
        </TabsContent>
        <TabsContent value="historial" className="mt-4">
          <HistorialPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Kpi({
  label,
  value,
  hint,
}: {
  label: string;
  value: number;
  hint?: string;
}) {
  return (
    <div className="border-line bg-panel rounded-xl border px-4 py-3">
      <div className="text-ink-dim text-xs">{label}</div>
      <div className="text-primary text-2xl font-semibold">{value}</div>
      {hint && <div className="text-ink-dim text-[11px]">{hint}</div>}
    </div>
  );
}

function computeKpis(opps: OportunidadEnriquecida[]) {
  let abiertas = 0,
    pendientes = 0,
    seguimiento = 0,
    convertidas = 0,
    descartadas = 0;
  for (const o of opps) {
    if (ABIERTOS.has(o.estado)) abiertas++;
    if (o.estado === 'NUEVA' || o.estado === 'VISTA') pendientes++;
    if (o.estado === 'CONTACTADA' || o.estado === 'EN_NEGOCIACION') seguimiento++;
    if (o.estado === 'CONVERTIDA') convertidas++;
    if (o.estado === 'DESCARTADA' || o.estado === 'NO_APLICA') descartadas++;
  }
  return { abiertas, pendientes, seguimiento, convertidas, descartadas };
}
