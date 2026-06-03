'use client';

import Link from 'next/link';
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
} from 'recharts';
import { AppHeader } from '@/components/dashboard/app-header';
import { KpiCard } from '@/components/dashboard/kpi-card';
import { RiskBadge } from '@/components/ui/risk-badge';
import { createClient } from '@/lib/supabase/client';
import {
  fetchSiniestrosPorTipo,
  fetchSiniestrosPorResponsabilidad,
} from '@/services/dashboard.service';
import { calculateRiskScore } from '@/lib/riesgo/calculate-risk-score';
import { getClienteNombre } from '@/lib/utils';
import { SINIESTRO_TIPO_LABELS } from '@/lib/riesgo/calculate-risk-score';

const COLORS = ['#cf6a5c', '#e8a13c', '#7fa86b', '#6b93a8', '#c45a2e'];

export default function RiesgoPage() {
  const { data: clientesConRiesgo, isLoading } = useQuery({
    queryKey: ['riesgo-ranking'],
    queryFn: async () => {
      const supabase = createClient();
      const { data: clientesRaw } = await supabase
        .from('clientes')
        .select('id, nombre, apellido')
        .is('deleted_at', null);
      const clientes = (clientesRaw ?? []) as import('@/types/database').Cliente[];

      const results = await Promise.all(
        clientes.map(async (c) => {
          const [{ data: siniestros }, { count }] = await Promise.all([
            supabase.from('siniestros').select('tipo, responsabilidad, monto_estimado').eq('cliente_id', c.id),
            supabase.from('polizas').select('*', { count: 'exact', head: true }).eq('cliente_id', c.id),
          ]);
          const riesgo = calculateRiskScore({
            siniestros: siniestros ?? [],
            totalPolizas: count ?? 0,
          });
          return {
            cliente: c,
            riesgo,
            totalSiniestros: siniestros?.length ?? 0,
            totalPolizas: count ?? 0,
          };
        })
      );

      return results
        .filter((r) => r.totalSiniestros > 0)
        .sort((a, b) => b.riesgo.score - a.riesgo.score);
    },
  });

  const { data: porTipo } = useQuery({
    queryKey: ['siniestros-tipo'],
    queryFn: async () => {
      const { data } = await fetchSiniestrosPorTipo(createClient());
      return (data ?? []).map((r) => ({
        name: SINIESTRO_TIPO_LABELS[r.tipo as keyof typeof SINIESTRO_TIPO_LABELS] ?? r.tipo,
        total: r.total,
      }));
    },
  });

  const { data: porResp } = useQuery({
    queryKey: ['siniestros-resp'],
    queryFn: async () => {
      const { data } = await fetchSiniestrosPorResponsabilidad(createClient());
      return data ?? [];
    },
  });

  const enAlerta = (clientesConRiesgo ?? []).filter((r) => r.riesgo.alertas.length).length;
  const alto = (clientesConRiesgo ?? []).filter((r) => r.riesgo.nivel === 'alto').length;
  const totalSin = (clientesConRiesgo ?? []).reduce((s, r) => s + r.totalSiniestros, 0);

  return (
    <div>
      <AppHeader
        title={
          <>
            Análisis de <em>riesgo</em>
          </>
        }
        subtitle="Score por cliente · ranking y patrones"
      />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard label="En alerta" value={enAlerta} variant="rust" />
        <KpiCard label="Riesgo alto" value={alto} variant="rust" />
        <KpiCard label="Siniestros" value={totalSin} />
        <KpiCard label="Clientes evaluados" value={clientesConRiesgo?.length ?? 0} variant="blue" />
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-[3px] border border-line bg-panel p-5">
          <p className="mb-4 text-[11px] uppercase tracking-widest text-ink-dim">Por tipo</p>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={porTipo ?? []} layout="vertical">
                <XAxis type="number" tick={{ fill: '#6f6557', fontSize: 10 }} />
                <YAxis type="category" dataKey="name" width={100} tick={{ fill: '#a89c8c', fontSize: 9 }} />
                <Tooltip contentStyle={{ background: '#2a241e', border: '1px solid #3a322a' }} />
                <Bar dataKey="total" fill="#e8a13c" radius={3} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-[3px] border border-line bg-panel p-5">
          <p className="mb-4 text-[11px] uppercase tracking-widest text-ink-dim">Responsabilidad (choques)</p>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={porResp ?? []} dataKey="total" nameKey="responsabilidad" innerRadius={50} outerRadius={80}>
                  {(porResp ?? []).map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="#221d18" />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: '#2a241e', border: '1px solid #3a322a' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="rounded-[3px] border border-line bg-panel p-5">
        <p className="mb-4 text-[11px] uppercase tracking-widest text-ink-dim">
          Ranking de <b className="text-amber">riesgo</b>
        </p>
        {isLoading ? (
          <p className="text-ink-faint">Calculando scores...</p>
        ) : (
          <div className="space-y-2">
            {(clientesConRiesgo ?? []).slice(0, 30).map((row) => (
              <Link
                key={row.cliente.id}
                href={`/clientes/${row.cliente.id}`}
                className="grid grid-cols-[42px_1fr_auto] items-center gap-4 rounded-[3px] border border-line bg-bg2 p-4 transition-colors hover:border-amber"
              >
                <RiskBadge score={row.riesgo.score} nivel={row.riesgo.nivel} />
                <div>
                  <p className="font-medium text-ink">{getClienteNombre(row.cliente)}</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {row.riesgo.alertas.map((a, i) => (
                      <span
                        key={i}
                        className={`rounded-full border px-2 py-0.5 text-[9px] ${
                          a.nivel === 'alto'
                            ? 'border-red/30 bg-red/15 text-red'
                            : 'border-amber/25 bg-amber/12 text-amber'
                        }`}
                      >
                        {a.txt}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="text-right text-xs text-ink-faint">
                  <b className="block text-sm text-ink-dim">{row.totalSiniestros}</b>
                  siniestros · {row.totalPolizas} pólizas
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
