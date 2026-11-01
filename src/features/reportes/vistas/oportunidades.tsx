'use client';
import type { ResultadoInteligencia } from '@/lib/reportes/inteligencia';
import { Barras, Seccion, SinDatos, numero } from '../reportes-ui';
import { CrossSelling } from '../cross-selling';

export function Oportunidades({ datos }: { datos: ResultadoInteligencia }) {
  const asegurados = datos.metricas.asegurados;
  const ramos = datos.ramos;

  return (
    <div className="space-y-5">
      <p className="text-ink-dim bg-bg2 rounded-lg px-4 py-3 text-xs leading-relaxed">
        Clientes reales del segmento filtrado agrupados por cantidad de pólizas
        vigentes. Los de <strong className="text-ink">una sola póliza</strong> son
        los principales candidatos a cross-selling. Cada grupo abre las fichas para
        actuar; Reportes resume y deriva al módulo operativo, sin inventar potencial
        de comisión que no tenga base verificable.
      </p>

      <CrossSelling datos={datos} />

      <Seccion
        titulo="Penetración por ramo"
        descripcion="Asegurados con cobertura en cada ramo sobre el total del segmento. Los ramos con menor cobertura son la oportunidad de venta cruzada; cada barra abre la cartera del ramo."
      >
        {ramos === null || !asegurados ? (
          <SinDatos texto="Sin historia suficiente para estimar la penetración al corte." />
        ) : (
          <Barras
            items={[...ramos]
              .sort((a, b) => b.asegurados - a.asegurados)
              .map((r) => ({
                id: r.id,
                nombre: `${r.nombre} · ${numero((r.asegurados / asegurados) * 100, 1)}% de la cartera`,
                valor: r.asegurados,
                href: r.id !== 'sin-ramo' ? `/polizas?ramo=${r.id}` : undefined,
              }))}
          />
        )}
      </Seccion>
    </div>
  );
}
