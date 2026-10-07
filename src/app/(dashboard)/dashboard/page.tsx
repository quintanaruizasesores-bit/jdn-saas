'use client';

import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  CartesianGrid,
} from 'recharts';
import { AppHeader } from '@/components/dashboard/app-header';
import { KpiCard } from '@/components/dashboard/kpi-card';
import { BarList } from '@/components/dashboard/bar-list';
import { createClient } from '@/lib/supabase/client';
import {
  fetchClientesTop,
  fetchDashboardKpis,
  fetchPolizasPorCompania,
  fetchPolizasPorRamo,
  fetchProduccionMensual,
} from '@/services/dashboard.service';
import { formatCurrency, formatNumber } from '@/lib/utils/format';
import { Skeleton } from '@/components/ui/skeleton';

const CHART_COLORS = ['#c45a2e', '#e8a13c', '#7fa86b', '#6b93a8', '#cf6a5c', '#a89c8c', '#d4902f'];

/** Comisión aproximada del corredor sobre el premio. */
const COMISION_RATE = 0.14;

export default function DashboardPage() {
  const router = useRouter();

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

  const { data: produccion } = useQuery({
    queryKey: ['dashboard-produccion'],
    queryFn: async () => {
      const supabase = createClient();
      const { data } = await fetchProduccionMensual(supabase);
      return (data ?? []).map((r) => ({
        mes: new Date(r.mes).toLocaleDateString('es-AR', { month: 'short', year: '2-digit' }),
        prima: Number(r.prima_total),
        polizas: r.polizas_count,
      }));
    },
  });

  const { data: topClientes } = useQuery({
    queryKey: ['dashboard-top-clientes'],
    queryFn: async () => {
      const supabase = createClient();
      const { data } = await fetchClientesTop(supabase);
      return data ?? [];
    },
  });

  if (isLoading) {
    return (
      <div>
        <AppHeader title="Tablero operativo" subtitle="Cargando métricas..." />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 bg-panel" />
          ))}
        </div>
      </div>
    );
  }

  const totalRamo = (porRamo ?? []).reduce((acc, r) => acc + Number(r.total_polizas), 0);
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
            Tablero <em className="text-amber not-italic">operativo</em>
          </>
        }
        subtitle="Análisis en vivo de la cartera"
      />

      <div className="mb-6 grid grid-cols-2 gap-3.5 lg:grid-cols-3 xl:grid-cols-6">
        <KpiCard label="Clientes" value={formatNumber(kpis?.total_clientes ?? 0)} variant="blue" />
        <KpiCard label="Pólizas" value={formatNumber(kpis?.total_polizas ?? 0)} />
        <KpiCard label="Premio" value={formatCurrency(Number(kpis?.prima_total ?? 0))} variant="green" />
        <KpiCard
          label="Comisión aproximada"
          value={formatCurrency(Number(kpis?.prima_total ?? 0) * COMISION_RATE)}
          subtitle="14% del premio"
          variant="green"
        />
        <KpiCard label="Siniestros (90d)" value={formatNumber(kpis?.siniestros_recientes ?? 0)} variant="rust" />
        <KpiCard label="Renovaciones 30d" value={formatNumber(kpis?.renovaciones_proximas ?? 0)} variant="rust" />
      </div>

      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <div className="rounded-[3px] border border-line bg-panel p-5">
          <p className="mb-4 text-[11px] uppercase tracking-widest text-ink-dim">
            Distribución por <b className="text-amber">compañía</b>
          </p>
          <BarList
            items={(porCompania ?? []).map((c) => ({
              label: c.compania_nombre,
              value: c.total_polizas,
            }))}
          />
        </div>
        <div className="rounded-[3px] border border-line bg-panel p-5">
          <p className="mb-4 text-[11px] uppercase tracking-widest text-ink-dim">
            Por <b className="text-amber">ramo</b>
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
                  onClick={(e) => goToRamo((e as { ramo_id?: string })?.ramo_id)}
                >
                  {porRamoData.map((_, i) => (
                    <Cell
                      key={i}
                      fill={CHART_COLORS[i % CHART_COLORS.length]}
                      stroke="#221d18"
                      className="cursor-pointer outline-none"
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: '#2a241e', border: '1px solid #3a322a', fontSize: 11 }}
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
                  className="flex w-full items-center gap-2 rounded-[3px] px-2 py-1 text-left text-xs text-ink-dim transition-colors hover:bg-bg2 hover:text-ink"
                >
                  <span
                    className="h-2.5 w-2.5 flex-shrink-0 rounded-[2px]"
                    style={{ background: CHART_COLORS[i % CHART_COLORS.length] }}
                  />
                  <span className="flex-1 truncate">{r.ramo_nombre}</span>
                  <span className="tabular-nums text-ink-faint">{formatNumber(Number(r.total_polizas))}</span>
                  <span className="w-12 text-right tabular-nums text-amber">{r.pct.toFixed(1)}%</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <div className="rounded-[3px] border border-line bg-panel p-5">
          <p className="mb-4 text-[11px] uppercase tracking-widest text-ink-dim">
            Evolución <b className="text-amber">mensual</b>
          </p>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={produccion ?? []}>
                <CartesianGrid stroke="#3a322a" strokeDasharray="3 3" />
                <XAxis dataKey="mes" tick={{ fill: '#6f6557', fontSize: 10 }} />
                <YAxis tick={{ fill: '#6f6557', fontSize: 10 }} />
                <Tooltip contentStyle={{ background: '#2a241e', border: '1px solid #3a322a' }} />
                <Line type="monotone" dataKey="prima" name="Premio" stroke="#e8a13c" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-[3px] border border-line bg-panel p-5">
          <p className="mb-4 text-[11px] uppercase tracking-widest text-ink-dim">
            Top <b className="text-amber">clientes</b>
          </p>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={(topClientes ?? []).slice(0, 8)} layout="vertical">
                <XAxis type="number" tick={{ fill: '#6f6557', fontSize: 10 }} />
                <YAxis
                  type="category"
                  dataKey="cliente_nombre"
                  width={120}
                  tick={{ fill: '#a89c8c', fontSize: 9 }}
                />
                <Tooltip contentStyle={{ background: '#2a241e', border: '1px solid #3a322a' }} />
                <Bar dataKey="total_polizas" fill="#c45a2e" radius={3} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
