'use client';
import { ChevronRight } from 'lucide-react';
import type { ResultadoInteligencia } from '@/lib/reportes/inteligencia';
import { getCompaniaColor } from '@/lib/companias/colores';
import {
  Barras,
  Delta,
  KpiCard,
  Panel,
  SinDatos,
  VerTodo,
  dinero,
  numero,
} from '../reportes-ui';

const TOP = 6;

function FilaAlerta({
  texto,
  valor,
  tono = 'neutral',
  onClick,
}: {
  texto: string;
  valor: number | null;
  tono?: 'neutral' | 'warning';
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="hover:bg-bg2 -mx-2 flex w-full items-center justify-between gap-3 rounded-md px-2 py-2 text-left transition-colors"
    >
      <span className="flex items-center gap-2">
        <span
          aria-hidden="true"
          className={`h-2 w-2 shrink-0 rounded-full ${tono === 'warning' ? 'bg-rust' : 'bg-primary/50'}`}
        />
        <span className="text-ink text-sm">{texto}</span>
      </span>
      <span className="flex items-center gap-1">
        <span className="text-ink shrink-0 text-sm font-semibold tabular-nums">
          {numero(valor)}
        </span>
        <ChevronRight className="text-ink-faint h-3.5 w-3.5" aria-hidden="true" />
      </span>
    </button>
  );
}

export function Resumen({
  datos,
  irA,
}: {
  datos: ResultadoInteligencia;
  irA: (vista: string) => void;
}) {
  const { metricas, previas, calidad, companias, ramos, segmentos } = datos;
  const revisar =
    calidad.sinHistoria + calidad.sinImporte + calidad.finLegacyAmbiguo;
  const unaPoliza =
    segmentos?.find((s) => s.cantidad === 1)?.clientes.length ?? null;
  const serieComision = datos.serie.filter((p) => p.comision !== null);
  const evolucionValida = serieComision.length >= 2;

  const concentracion = (
    items:
      | { id: string; nombre: string; polizas: number; color?: string | null }[]
      | null,
    conHref: boolean
  ) => {
    if (items === null)
      return <SinDatos texto="Sin historia suficiente al corte." />;
    if (!items.length) return <SinDatos texto="Sin pólizas vigentes al corte." />;
    const top = [...items].sort((a, b) => b.polizas - a.polizas).slice(0, TOP);
    const resto = items.length - top.length;
    return (
      <>
        <Barras
          items={top.map((c) => ({
            id: c.id,
            nombre: c.nombre,
            valor: c.polizas,
            color: 'color' in c ? getCompaniaColor(c.nombre, c.color).accent : undefined,
            href: conHref && c.id !== 'sin-ramo' ? `/polizas?ramo=${c.id}` : undefined,
          }))}
        />
        {resto > 0 && (
          <p className="text-ink-faint mt-3 text-xs">
            + {numero(resto)} {resto === 1 ? 'categoría más' : 'categorías más'}
          </p>
        )}
      </>
    );
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          titulo="Cartera vigente"
          valor={metricas.polizas == null ? 'No disponible' : numero(metricas.polizas)}
          nota={
            metricas.polizas == null
              ? 'Falta historia para acreditar el stock al corte.'
              : `${numero(metricas.asegurados)} asegurados · ${numero(metricas.promedio, 2)} pólizas por asegurado`
          }
          delta={<Delta valor={metricas.polizas} previo={previas.polizas} />}
          hint="Pólizas con estado acreditado VIGENTE, dentro de vigencia y sin baja efectiva a la fecha de corte."
          accion="Ver salud"
          onClick={() => irA('salud')}
        />
        <KpiCard
          titulo="Comisión mensual estimada"
          valor={dinero(metricas.comision)}
          nota={
            metricas.comision == null
              ? 'Sin evidencia suficiente para el subtotal.'
              : calidad.sinImporte > 0
                ? `Subtotal · ${numero(calidad.sinImporte)} pólizas sin importe no incluidas`
                : 'Estimación recurrente al 14%. No es un cobro.'
          }
          delta={<Delta valor={metricas.comision} previo={previas.comision} />}
          hint="Stock recurrente al corte: premio mensual × 14%. Son estimaciones, no comisiones cobradas, facturadas ni liquidadas."
          accion="Ver rentabilidad"
          onClick={() => irA('rentabilidad')}
        />
        <KpiCard
          titulo="Próximas a vencer (30 d)"
          valor={numero(metricas.vencimientos)}
          nota="Vigentes con vencimiento confirmado en los próximos 30 días."
          acento={metricas.vencimientos ? 'warning' : 'neutral'}
          hint="No incluye pólizas importadas con fecha final sin confirmar; esas se conservan como vigentes y se informan en Calidad de datos."
          accion="Ver salud"
          onClick={() => irA('salud')}
        />
        <KpiCard
          titulo="Datos a revisar"
          valor={numero(revisar)}
          nota={
            revisar
              ? 'Registros que afectan el cálculo de la cartera.'
              : 'Sin pendientes de datos en este segmento.'
          }
          acento={revisar ? 'warning' : 'neutral'}
          hint="Suma de pólizas sin historia suficiente, sin comisión calculable y con fecha final legacy sin confirmar."
          accion="Ver calidad"
          onClick={() => irA('calidad')}
        />
      </div>

      <div className="grid min-w-0 gap-4 lg:grid-cols-2">
        <Panel
          titulo="Concentración por aseguradora"
          hint="Pólizas vigentes al corte agrupadas por la aseguradora actual de cada póliza."
          pie={<VerTodo onClick={() => irA('rentabilidad')}>Ver rentabilidad</VerTodo>}
        >
          {concentracion(companias, false)}
        </Panel>
        <Panel
          titulo="Concentración por ramo"
          hint="Pólizas vigentes al corte agrupadas por ramo. Cada barra abre la cartera filtrada por ese ramo."
          pie={<VerTodo onClick={() => irA('salud')}>Ver salud de cartera</VerTodo>}
        >
          {concentracion(ramos, true)}
        </Panel>
        <Panel
          titulo="Oportunidades comerciales"
          hint="Clientes con una sola póliza vigente dentro del segmento: candidatos a cross-selling. El detalle abre sus fichas."
          pie={
            <VerTodo onClick={() => irA('oportunidades')}>
              Ver oportunidades
            </VerTodo>
          }
        >
          {segmentos === null ? (
            <SinDatos texto="Sin historia suficiente para segmentar la cartera." />
          ) : (
            <div className="flex items-baseline gap-3">
              <span className="font-heading text-navy text-3xl font-semibold tabular-nums">
                {numero(unaPoliza)}
              </span>
              <span className="text-ink-dim text-sm">
                clientes con una sola póliza vigente
              </span>
            </div>
          )}
        </Panel>
        <Panel
          titulo="Alertas de cartera"
          hint="Señales accionables del segmento filtrado. Cada fila abre la vista correspondiente."
        >
          <div className="space-y-1">
            <FilaAlerta
              texto="Próximas a vencer (30 d)"
              valor={metricas.vencimientos}
              tono={metricas.vencimientos ? 'warning' : 'neutral'}
              onClick={() => irA('salud')}
            />
            <FilaAlerta
              texto="Bajas verificadas del período"
              valor={metricas.bajas}
              onClick={() => irA('salud')}
            />
            <FilaAlerta
              texto="Pólizas sin premio cargado"
              valor={calidad.comisionPendiente.premio}
              tono={calidad.comisionPendiente.premio ? 'warning' : 'neutral'}
              onClick={() => irA('calidad')}
            />
            <FilaAlerta
              texto="Pólizas sin historia suficiente"
              valor={calidad.sinHistoria}
              tono={calidad.sinHistoria ? 'warning' : 'neutral'}
              onClick={() => irA('calidad')}
            />
          </div>
        </Panel>
      </div>

      {evolucionValida && (
        <Panel
          titulo="Evolución de la cartera"
          hint="Serie mensual de stock y comisiones al corte. Disponible porque el rango tiene historia suficiente."
          pie={
            <VerTodo onClick={() => irA('rentabilidad')}>
              Ver evolución completa
            </VerTodo>
          }
        >
          <p className="text-ink-dim text-sm">
            Hay {numero(serieComision.length)} meses con comisión verificable en
            el rango. La evolución mensual y acumulada está disponible en
            Rentabilidad.
          </p>
        </Panel>
      )}
    </div>
  );
}
