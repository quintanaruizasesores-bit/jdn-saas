'use client';
import { useState } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  LineChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import type { ResultadoInteligencia } from '@/lib/reportes/inteligencia';
import { dinero, numero, Seccion, selectClass } from './reportes-ui';

type Punto = ResultadoInteligencia['serie'][number];
export function agruparAnual(serie: Punto[]) {
  const grupos = new Map<string, Punto[]>();
  serie.forEach((p) => {
    const k = p.mes.slice(0, 4);
    grupos.set(k, [...(grupos.get(k) ?? []), p]);
  });
  const sumar = (ps: Punto[], key: 'altas' | 'bajas' | 'neto') =>
    ps.some((p) => p[key] === null)
      ? null
      : ps.reduce((sum, p) => sum + (p[key] ?? 0), 0);
  return [...grupos].map(([mes, ps]) => ({
    ...ps.at(-1)!,
    mes,
    altas: sumar(ps, 'altas'),
    bajas: sumar(ps, 'bajas'),
    neto: sumar(ps, 'neto'),
  }));
}
export function Tendencias({ datos }: { datos: ResultadoInteligencia }) {
  const [modo, setModo] = useState('mensual');
  const cartera = modo === 'anual' ? agruparAnual(datos.serie) : datos.serie;
  const currency = (n: unknown) =>
    typeof n === 'number' ? dinero(n) : 'No disponible';
  return (
    <div className="grid min-w-0 gap-5 xl:grid-cols-2">
      <Seccion
        titulo="Evolución de la cartera"
        descripcion="Stock al corte y movimientos verificados de cada intervalo. Los huecos indican historia insuficiente."
        acciones={
          <label className="text-ink-dim text-xs">
            Agrupar por
            <select
              aria-label="Agrupar evolución de cartera"
              value={modo}
              onChange={(e) => setModo(e.target.value)}
              className={selectClass}
            >
              <option value="mensual">Mes</option>
              <option value="anual">Año</option>
            </select>
          </label>
        }
      >
        <div
          className="h-72 min-w-0"
          role="img"
          aria-label="Evolución de pólizas vigentes, altas, bajas y neto. Los valores están disponibles debajo."
        >
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={cartera}
              margin={{ left: -20, right: 8, top: 8, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="var(--line)"
              />
              <XAxis dataKey="mes" tick={{ fontSize: 11 }} minTickGap={24} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  background: 'var(--panel)',
                  borderColor: 'var(--line)',
                  color: 'var(--ink)',
                }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar
                dataKey="altas"
                name="Altas"
                fill="#78A5DD"
                maxBarSize={14}
                isAnimationActive={false}
              />
              <Bar
                dataKey="bajas"
                name="Bajas"
                fill="#B66570"
                maxBarSize={14}
                isAnimationActive={false}
              />
              <Line
                type="linear"
                dataKey="polizas"
                name="Vigentes"
                stroke="#1E5BBF"
                strokeWidth={2}
                dot={false}
                connectNulls={false}
                isAnimationActive={false}
              />
              <Line
                type="linear"
                dataKey="neto"
                name="Neto"
                stroke="#1A2556"
                strokeDasharray="4 3"
                dot={false}
                connectNulls={false}
                isAnimationActive={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <details className="mt-4 text-xs">
          <summary className="text-primary cursor-pointer">
            Consultar valores de cartera
          </summary>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr>
                  {['Período', 'Vigentes', 'Altas', 'Bajas', 'Neto'].map(
                    (s) => (
                      <th key={s} className="p-2">
                        {s}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {cartera.map((p) => (
                  <tr key={p.mes} className="border-line border-t">
                    <td className="p-2">{p.mes}</td>
                    {[p.polizas, p.altas, p.bajas, p.neto].map((v, i) => (
                      <td key={i} className="p-2 tabular-nums">
                        {numero(v)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </Seccion>
      <Seccion
        titulo="Evolución de comisiones"
        descripcion="ARS estimados al 14%. Fotografías recurrentes mensuales y suma progresiva del período; no representan cobros."
      >
        <div
          className="h-72 min-w-0"
          role="img"
          aria-label="Comisión mensual y acumulada en pesos argentinos. Los valores están disponibles debajo."
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={datos.serie}
              margin={{ left: -10, right: 5, top: 8, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="var(--line)"
              />
              <XAxis dataKey="mes" tick={{ fontSize: 11 }} minTickGap={24} />
              <YAxis
                tickFormatter={(v) =>
                  new Intl.NumberFormat('es-AR', {
                    notation: 'compact',
                  }).format(v)
                }
                tick={{ fontSize: 11 }}
              />
              <Tooltip
                formatter={currency}
                contentStyle={{
                  background: 'var(--panel)',
                  borderColor: 'var(--line)',
                  color: 'var(--ink)',
                }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line
                type="linear"
                dataKey="comision"
                name="Mensual (ARS)"
                stroke="#1E5BBF"
                strokeWidth={2}
                dot={{ r: 2 }}
                connectNulls={false}
                isAnimationActive={false}
              />
              <Line
                type="linear"
                dataKey="acumulado"
                name="Acumulada (ARS)"
                stroke="#1A2556"
                strokeWidth={2}
                strokeDasharray="5 3"
                dot={false}
                connectNulls={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <details className="mt-4 text-xs">
          <summary className="text-primary cursor-pointer">
            Consultar valores de comisiones
          </summary>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr>
                  <th className="p-2">Corte</th>
                  <th className="p-2">Mensual ARS</th>
                  <th className="p-2">Acumulada ARS</th>
                </tr>
              </thead>
              <tbody>
                {datos.serie.map((p) => (
                  <tr key={p.mes} className="border-line border-t">
                    <td className="p-2">{p.corte}</td>
                    <td className="p-2">{dinero(p.comision)}</td>
                    <td className="p-2">{dinero(p.acumulado)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </Seccion>
    </div>
  );
}
