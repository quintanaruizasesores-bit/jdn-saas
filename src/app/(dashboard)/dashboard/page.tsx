'use client';

import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { AppHeader } from '@/components/dashboard/app-header';
import { KpiCard } from '@/components/dashboard/kpi-card';
import { BarList } from '@/components/dashboard/bar-list';
import { ComisionChart } from '@/components/dashboard/comision-chart';
import { useComisionDashboard } from '@/features/dashboard/use-comision-dashboard';
import { getCompaniaColor } from '@/lib/companias/colores';
import { createClient } from '@/lib/supabase/client';
import {
  fetchDashboardKpis,
  fetchPolizasPorCompania,
  fetchPolizasPorRamo,
} from '@/services/dashboard.service';
import { formatCurrency, formatNumber } from '@/lib/utils/format';
import { Skeleton } from '@/components/ui/skeleton';

const CHART_COLORS = [
  '#1E5BBF',
  '#1A2556',
  '#608BD0',
  '#154A9F',
  '#879EC7',
  '#354B88',
  '#ABC1E4',
];

export default function DashboardPage() {
  const router = useRouter();
  const {
    data: comisiones,
    isLoading: isComisionesLoading,
    isError: isComisionesError,
  } = useComisionDashboard();

  const { data: kpis, isLoading } = useQuery({
    queryKey: ['dashboard-kpis'],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await fetchDashboardKpis(supabase);
      if (error) throw error;
      return data;
    },
  });

  const { data: porCompania } = useQuery({
    queryKey: ['dashboard-compania'],
    queryFn: async () => {
      const supabase = createClient();
      const { data } = await fetchPolizasPorCompania(supabase);
      return data ?? [];
    },
  });

  const { data: porRamo } = useQuery({
    queryKey: ['dashboard-ramo'],
    queryFn: async () => {
      const supabase = createClient();
      const { data } = await fetchPolizasPorRamo(supabase);
      return data ?? [];
    },
  });

  const topClientes = comisiones?.topClientes ?? [];

  if (isLoading) {
    return (
      <div>
        <AppHeader title="Tablero operativo" subtitle="Cargando métricas..." />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="bg-panel h-24" />
          ))}
        </div>
      </div>
    );
  }

  const totalRamo = (porRamo ?? []).reduce(
    (acc, r) => acc + Number(r.total_polizas),
    0
  );
  const porRamoData = (porRamo ?? []).map((r) => ({
    ...r,
    pct: totalRamo ? (Number(r.total_polizas) / totalRamo) * 100 : 0,
  }));

  const goToRamo = (ramoId?: string) => {
    if (ramoId) router.push(`/polizas?ramo=${ramoId}`);
  };

  return (
    <div>
      <AppHeader
        title={
          <>
            Tablero <em className="text-primary not-italic">operativo</em>
          </>
        }
        subtitle="Análisis en vivo de la cartera"
      />

      <div className="mb-6 grid grid-cols-1 gap-3.5 min-[480px]:grid-cols-2 lg:grid-cols-3">
        <KpiCard
          label="Clientes"
          value={formatNumber(kpis?.total_clientes ?? 0)}
          variant="blue"
        />
        <KpiCard
          label="Pólizas"
          value={formatNumber(kpis?.total_polizas ?? 0)}
        />
        <KpiCard
          label="Premio"
          value={formatCurrency(Number(kpis?.prima_total ?? 0))}
          variant="green"
        />
        <KpiCard
          label={
            comisiones?.resumen.sinDatos
              ? 'Comisión mensual · importes cargados'
              : 'Comisión mensual estimada'
          }
          value={
            comisiones?.resumen.comisionActual != null
              ? formatCurrency(comisiones.resumen.comisionActual)
              : '—'
          }
          subtitle={
            comisiones?.resumen.sinDatos
              ? `14% del premio mensual · ${comisiones.resumen.sinDatos} pólizas pendientes`
              : '14% del premio mensual · cartera al día'
          }
          variant="green"
        />
        <KpiCard
          label="Siniestros (90d)"
          value={formatNumber(kpis?.siniestros_recientes ?? 0)}
          variant="rust"
        />
        <KpiCard
          label="Renovaciones 30d"
          value={formatNumber(kpis?.renovaciones_proximas ?? 0)}
          variant="rust"
        />
      </div>

      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <div className="border-line bg-panel min-w-0 rounded-2xl border p-4 sm:p-5">
          <p className="text-ink-dim mb-4 text-[11px] tracking-widest uppercase">
            Distribución por <b className="text-primary">compañía</b>
          </p>
          <BarList
            items={(porCompania ?? []).map((c) => ({
              label: c.compania_nombre,
              value: c.total_polizas,
              color: getCompaniaColor(c.compania_nombre, c.color).accent,
            }))}
          />
        </div>
        <div className="border-line bg-panel min-w-0 rounded-2xl border p-4 sm:p-5">
          <p className="text-ink-dim mb-4 text-[11px] tracking-widest uppercase">
            Por <b className="text-primary">ramo</b>
          </p>
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={porRamoData}
                  dataKey="total_polizas"
                  nameKey="ramo_nombre"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  onClick={(e) =>
                    goToRamo((e as { ramo_id?: string })?.ramo_id)
                  }
                >
                  {porRamoData.map((_, i) => (
                    <Cell
                      key={i}
                      fill={CHART_COLORS[i % CHART_COLORS.length]}
                      stroke="var(--panel)"
                      className="cursor-pointer outline-none"
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: 'var(--panel)',
                    border: '1px solid var(--line)',
                    fontSize: 11,
                  }}
                  formatter={(value, _name, item) => [
                    `${formatNumber(Number(value))} pólizas · ${(item?.payload?.pct ?? 0).toFixed(1)}%`,
                    item?.payload?.ramo_nombre ?? '',
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <ul className="mt-4 space-y-1">
            {porRamoData.map((r, i) => (
              <li key={r.ramo_id}>
                <button
                  type="button"
                  onClick={() => goToRamo(r.ramo_id)}
                  className="text-ink-dim hover:bg-bg2 hover:text-ink flex w-full items-center gap-2 rounded-xl px-2 py-1 text-left text-xs transition-colors"
                >
                  <span
                    className="h-2.5 w-2.5 flex-shrink-0 rounded-lg"
                    style={{
                      background: CHART_COLORS[i % CHART_COLORS.length],
                    }}
                  />
                  <span className="flex-1 truncate">{r.ramo_nombre}</span>
                  <span className="text-ink-faint tabular-nums">
                    {formatNumber(Number(r.total_polizas))}
                  </span>
                  <span className="text-primary w-12 text-right tabular-nums">
                    {r.pct.toFixed(1)}%
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <ComisionChart />
        <div className="border-line bg-panel min-w-0 rounded-2xl border p-4 sm:p-5">
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-ink-dim text-[11px] tracking-widest uppercase">
              Top <b className="text-primary">10 clientes por premio</b>
            </p>
            <p className="text-ink-faint text-[10px]">
              Cartera vigente · comisión aproximada 14%
            </p>
          </div>
          {isComisionesLoading ? (
            <p className="bg-bg2 text-ink-dim rounded-xl p-4 text-sm">
              Calculando el ranking de clientes…
            </p>
          ) : isComisionesError ? (
            <p
              role="alert"
              className="bg-bg2 text-ink-dim rounded-xl p-4 text-sm"
            >
              No se pudo calcular el ranking de premios en este momento.
            </p>
          ) : topClientes.length ? (
            <ol className="divide-line divide-y">
              {topClientes.map((cliente, index) => (
                <li
                  key={cliente.cliente_id}
                  className="py-2.5 first:pt-0 last:pb-0"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="bg-bg2 text-primary flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold tabular-nums">
                      {index + 1}
                    </span>
                    <span className="text-ink min-w-0 flex-1 truncate text-sm font-medium">
                      {cliente.cliente_nombre}
                    </span>
                    <span className="text-ink-faint shrink-0 text-[10px]">
                      {formatNumber(cliente.total_polizas)} pólizas
                    </span>
                  </div>
                  <div className="mt-1.5 grid grid-cols-2 gap-3 pl-8">
                    <div>
                      <span className="text-ink-faint block text-[10px]">
                        Premio mensual
                      </span>
                      <span className="text-ink text-xs font-semibold tabular-nums">
                        {formatCurrency(cliente.prima_total)}
                      </span>
                    </div>
                    <div>
                      <span className="text-ink-faint block text-[10px]">
                        Comisión aproximada
                      </span>
                      <span className="text-ink text-xs font-semibold tabular-nums">
                        {formatCurrency(cliente.comision_aproximada)}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <p className="bg-bg2 text-ink-dim rounded-xl p-4 text-sm">
              No hay premios mensuales vigentes y calculables para mostrar.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
