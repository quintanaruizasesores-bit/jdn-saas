'use client';
import { useState } from 'react';
import type { ResultadoInteligencia } from '@/lib/reportes/inteligencia';
import { getCompaniaColor } from '@/lib/companias/colores';
import {
  Barras,
  KpiCard,
  Delta,
  Seccion,
  SinDatos,
  dinero,
  numero,
  selectClass,
} from '../reportes-ui';
import { Tendencias } from '../tendencias';

export function Rentabilidad({ datos }: { datos: ResultadoInteligencia }) {
  const [unidad, setUnidad] = useState<'polizas' | 'comision'>('comision');
  const { metricas, previas, calidad } = datos;
  const comisionDisponible = metricas.comision !== null;
  const medir = unidad === 'comision' && comisionDisponible ? 'comision' : 'polizas';

  return (
    <div className="space-y-5">
      <p className="text-ink-dim bg-bg2 rounded-lg px-4 py-3 text-xs leading-relaxed">
        Las comisiones son <strong className="text-ink">estimaciones recurrentes</strong>{' '}
        (premio mensual × 14%), no cobros, facturas ni liquidaciones. Importes en
        ARS; no se suman monedas distintas. Las pólizas sin importe calculable se
        informan aparte y no se rellenan con cero.
      </p>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          titulo="Comisión mensual estimada"
          valor={dinero(metricas.comision)}
          nota={
            calidad.sinImporte > 0
              ? `Subtotal · ${numero(calidad.sinImporte)} sin importe`
              : 'Stock recurrente al corte'
          }
          delta={<Delta valor={metricas.comision} previo={previas.comision} />}
          hint="Suma de los aportes calculables de las pólizas vigentes al corte."
        />
        <KpiCard
          titulo="Comisión acumulada del rango"
          valor={dinero(metricas.acumulado)}
          nota={
            metricas.acumulado == null
              ? `${numero(calidad.mesesSinComisionDisponible)} meses sin evidencia`
              : 'Suma de las fotografías mensuales'
          }
          delta={<Delta valor={metricas.acumulado} previo={previas.acumulado} />}
          hint="Suma progresiva de las comisiones mensuales del rango, sin prorrateo. No disponible si falta evidencia de algún mes."
        />
        <KpiCard
          titulo="Promedio por póliza"
          valor={
            metricas.comision == null || !metricas.polizas
              ? 'No disponible'
              : dinero(metricas.comision / metricas.polizas)
          }
          nota="Comisión estimada ÷ pólizas vigentes"
          hint="Referencia del subtotal calculable sobre el total de pólizas vigentes; las pólizas sin importe bajan el promedio real."
        />
        <KpiCard
          titulo="Promedio por asegurado"
          valor={
            metricas.comision == null || !metricas.asegurados
              ? 'No disponible'
              : dinero(metricas.comision / metricas.asegurados)
          }
          nota="Comisión estimada ÷ asegurados activos"
          hint="Comisión mensual estimada dividida por clientes únicos con pólizas vigentes."
        />
      </div>

      <div className="grid min-w-0 gap-5 lg:grid-cols-2">
        <Seccion
          titulo="Comisión por aseguradora"
          descripcion={
            medir === 'comision'
              ? 'Comisión recurrente al corte (ARS), por aseguradora actual.'
              : 'Pólizas vigentes al corte, por aseguradora actual.'
          }
          acciones={
            <label className="text-ink-dim text-xs">
              Medir por
              <select
                className={selectClass}
                value={unidad}
                onChange={(e) => setUnidad(e.target.value as 'polizas' | 'comision')}
              >
                <option value="comision" disabled={!comisionDisponible}>
                  Comisiones
                </option>
                <option value="polizas">Pólizas</option>
              </select>
            </label>
          }
        >
          {datos.companias === null ? (
            <SinDatos texto="Sin datos suficientes para esta distribución." />
          ) : (
            <Barras
              moneda={medir === 'comision'}
              items={[...datos.companias]
                .sort((a, b) =>
                  medir === 'comision'
                    ? (b.comision ?? 0) - (a.comision ?? 0)
                    : b.polizas - a.polizas
                )
                .map((c) => ({
                  id: c.id,
                  nombre: c.nombre,
                  valor: medir === 'comision' ? c.comision : c.polizas,
                  color: getCompaniaColor(c.nombre, c.color).accent,
                }))}
            />
          )}
        </Seccion>
        <Seccion
          titulo="Comisión por ramo"
          descripcion={
            medir === 'comision'
              ? 'Comisión recurrente al corte (ARS), por ramo actual.'
              : 'Pólizas vigentes al corte, por ramo actual.'
          }
        >
          {datos.ramos === null ? (
            <SinDatos texto="Sin historia suficiente para esta distribución." />
          ) : (
            <Barras
              moneda={medir === 'comision'}
              items={[...datos.ramos]
                .sort((a, b) =>
                  medir === 'comision'
                    ? (b.comision ?? 0) - (a.comision ?? 0)
                    : b.polizas - a.polizas
                )
                .map((r) => ({
                  id: r.id,
                  nombre: r.nombre,
                  valor: medir === 'comision' ? r.comision : r.polizas,
                  href: r.id !== 'sin-ramo' ? `/polizas?ramo=${r.id}` : undefined,
                }))}
            />
          )}
        </Seccion>
      </div>

      <Tendencias datos={datos} />
    </div>
  );
}
