'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { RefreshCw, SlidersHorizontal } from 'lucide-react';
import { AppHeader } from '@/components/dashboard/app-header';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/ui/error-state';
import { periodoComision } from '@/lib/dashboard/comision';
import { getCompaniaColor } from '@/lib/companias/colores';
import { PROVINCIAS, SIN_UBICACION, EXTERIOR } from '@/lib/reportes/geografia';
import type {
  FiltrosInteligencia,
  ResultadoInteligencia,
} from '@/lib/reportes/inteligencia';
import {
  Barras,
  Seccion,
  SinDatos,
  dinero,
  numero,
  fecha,
  selectClass,
} from './reportes-ui';
import { Tendencias } from './tendencias';
import { GeografiaPanel } from './geografia-panel';
import { CrossSelling } from './cross-selling';

const DEFINICIONES = [
  [
    'asegurados',
    'Asegurados activos',
    'Clientes únicos con al menos una póliza vigente en la fecha de corte.',
  ],
  [
    'polizas',
    'Pólizas vigentes',
    'Pólizas con estado acreditado VIGENTE, dentro de vigencia y sin baja efectiva al corte.',
  ],
  [
    'comision',
    'Comisiones mensuales',
    'Stock recurrente al corte del mes seleccionado. Premio mensual × 14%; no son cobros.',
  ],
  [
    'acumulado',
    'Comisiones acumuladas',
    'Suma de las fotografías mensuales del rango. Sin prorrateo. No disponible si falta evidencia de algún mes.',
  ],
  [
    'vencimientos',
    'Próximas a vencer',
    'Vigentes con vencimiento confirmado entre la referencia y los próximos 30 días, ambos incluidos.',
  ],
  [
    'nuevos',
    'Nuevos asegurados registrados',
    'Clientes cuya primera creación de póliza en el sistema pertenece al período. Una importación no acredita una adquisición comercial.',
  ],
  [
    'bajas',
    'Bajas de cartera',
    'Transiciones verificadas de vigencia a baja efectiva, vencimiento o estado histórico en el período.',
  ],
  [
    'promedio',
    'Pólizas por asegurado',
    'Cantidad de pólizas vigentes dividida por asegurados activos dentro de los filtros.',
  ],
] as const;
function inicial(): FiltrosInteligencia {
  const { hoy } = periodoComision();
  return {
    desde: `${hoy.slice(0, 4)}-01-01`,
    hasta: hoy,
    compania: '',
    ramo: '',
    estado: '',
    provincia: '',
  };
}
export function ReportesDashboard() {
  const [aplicados, setAplicados] = useState(inicial),
    [borrador, setBorrador] = useState(inicial),
    [unidad, setUnidad] = useState('polizas');
  const query = useQuery<ResultadoInteligencia>({
    queryKey: ['inteligencia', aplicados],
    staleTime: 60_000,
    queryFn: async ({ signal }) => {
      const params = new URLSearchParams(
        Object.entries(aplicados).filter(([, v]) => !!v)
      );
      const r = await fetch(`/api/inteligencia?${params}`, {
          signal,
          cache: 'no-store',
        }),
        body = await r.json();
      if (!r.ok)
        throw new Error(body.error ?? 'No se pudo calcular el reporte.');
      return body;
    },
  });
  const datos = query.data;
  const cambiar = (k: keyof FiltrosInteligencia, v: string) =>
    setBorrador({ ...borrador, [k]: v });
  const alCorte = [
    'asegurados',
    'polizas',
    'comision',
    'vencimientos',
    'promedio',
  ];
  return (
    <div className="space-y-5">
      <AppHeader
        title="Reportes e inteligencia de cartera"
        subtitle="Una lectura comercial de tus asegurados, la producción y el territorio"
      />
      <form
        className="border-line bg-panel rounded-xl border p-4 sm:p-5"
        onSubmit={(e) => {
          e.preventDefault();
          setAplicados({ ...borrador });
        }}
      >
        <div className="text-ink mb-4 flex items-center gap-2 text-sm font-medium">
          <SlidersHorizontal className="text-primary h-4 w-4" />
          Segmentar la cartera
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <label className="text-ink-dim text-xs">
            Desde
            <input
              type="date"
              required
              value={borrador.desde}
              max={borrador.hasta}
              onChange={(e) => cambiar('desde', e.target.value)}
              className={selectClass}
            />
          </label>
          <label className="text-ink-dim text-xs">
            Hasta / fecha de corte
            <input
              type="date"
              required
              value={borrador.hasta}
              min={borrador.desde}
              max={periodoComision().hoy}
              onChange={(e) => cambiar('hasta', e.target.value)}
              className={selectClass}
            />
          </label>
          <label className="text-ink-dim text-xs">
            Aseguradora
            <select
              value={borrador.compania}
              onChange={(e) => cambiar('compania', e.target.value)}
              className={selectClass}
            >
              <option value="">Todas</option>
              {datos?.opciones.companias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </label>
          <label className="text-ink-dim text-xs">
            Ramo
            <select
              value={borrador.ramo}
              onChange={(e) => cambiar('ramo', e.target.value)}
              className={selectClass}
            >
              <option value="">Todos</option>
              {datos?.opciones.ramos.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </label>
          <label className="text-ink-dim text-xs">
            Estado al corte
            <select
              value={borrador.estado}
              onChange={(e) => cambiar('estado', e.target.value)}
              className={selectClass}
            >
              <option value="">Todos</option>
              <option value="VIGENTE">Vigente</option>
              <option value="VENCIDA">Vencida</option>
              <option value="BAJA">Baja</option>
              <option value="HISTORICA">Histórica</option>
            </select>
          </label>
          <label className="text-ink-dim text-xs">
            Provincia
            <select
              value={borrador.provincia}
              onChange={(e) => cambiar('provincia', e.target.value)}
              className={selectClass}
            >
              <option value="">Todas</option>
              {PROVINCIAS.map(([id, n]) => (
                <option key={id} value={id}>
                  {n}
                </option>
              ))}
              <option value={SIN_UBICACION}>Sin ubicación determinada</option>
              <option value={EXTERIOR}>Exterior explícito</option>
            </select>
          </label>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={query.isFetching}>
            Aplicar filtros
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              const f = inicial();
              setBorrador(f);
              setAplicados(f);
            }}
          >
            Restablecer
          </Button>
          <p className="text-ink-dim text-xs">
            No hay asignación de productor en el modelo actual.
          </p>
        </div>
      </form>
      <div className="text-ink-dim flex flex-wrap items-center justify-between gap-3 text-xs">
        <p>
          Período aplicado:{' '}
          <strong className="text-ink">
            {fecha(aplicados.desde)} al {fecha(aplicados.hasta)}
          </strong>
          . Stock al {fecha(aplicados.hasta)}.
        </p>
        <Button
          variant="ghost"
          size="sm"
          disabled={query.isFetching}
          onClick={() => query.refetch()}
        >
          <RefreshCw
            className={`h-3 w-3 ${query.isFetching ? 'animate-spin' : ''}`}
          />
          Actualizar
        </Button>
      </div>
      {query.isPending ? (
        <div role="status" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 8 }, (_, i) => (
            <div
              key={i}
              className="border-line bg-panel h-32 animate-pulse rounded-xl border p-4"
            >
              {i === 0 ? 'Calculando indicadores…' : ''}
            </div>
          ))}
        </div>
      ) : query.isError ? (
        <div role="alert">
          <p className="text-red mb-3 text-sm">{query.error.message}</p>
          <ErrorState onRetry={() => query.refetch()} />
        </div>
      ) : (
        datos && (
          <>
            {(datos.calidad.sinHistoria > 0 ||
              datos.calidad.sinImporte > 0 ||
              datos.calidad.finLegacyAmbiguo > 0) && (
              <div
                className="border-line bg-bg2 text-ink-dim rounded-lg border p-4 text-sm"
                role="status"
              >
                <strong className="text-ink">Cobertura de los datos. </strong>
                {datos.calidad.sinHistoria > 0 &&
                  `${numero(datos.calidad.sinHistoria)} pólizas sin historia suficiente al corte. `}
                {datos.calidad.sinImporte > 0 &&
                  `${numero(datos.calidad.sinImporte)} pólizas sin comisión calculable. `}
                {datos.calidad.comisionPendiente.premio > 0 &&
                  `${numero(datos.calidad.comisionPendiente.premio)} sin premio cargado. `}
                {datos.calidad.comisionPendiente.periodicidad > 0 &&
                  `${numero(datos.calidad.comisionPendiente.periodicidad)} sin periodicidad válida. `}
                {datos.calidad.comisionPendiente.fechas > 0 &&
                  `${numero(datos.calidad.comisionPendiente.fechas)} con fechas inválidas. `}
                {datos.calidad.finLegacyAmbiguo > 0 &&
                  `${numero(datos.calidad.finLegacyAmbiguo)} pólizas importadas con fecha final sin confirmar; se conserva su vigencia observada y no se incluyen entre próximos vencimientos.`}
              </div>
            )}
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {DEFINICIONES.map(([key, titulo, def]) => {
                const valor = datos.metricas[key],
                  previo = datos.previas[key];
                const comparar =
                  valor !== null && previo !== null && previo > 0;
                const monetario = key === 'comision' || key === 'acumulado';
                const causaComision =
                  key === 'comision' && valor === null
                    ? `${numero(datos.calidad.sinHistoria)} sin versión al corte · ${numero(datos.calidad.sinImporte)} con importe no calculable`
                    : key === 'acumulado' && valor === null
                      ? `${numero(datos.calidad.mesesSinComisionDisponible)} meses del rango sin comisión verificable`
                      : key === 'comision' && datos.calidad.sinImporte > 0
                        ? `Subtotal · ${numero(datos.calidad.sinImporte)} pólizas sin importe no incluidas`
                        : key === 'acumulado' &&
                            datos.calidad.mesesComisionParcial > 0
                          ? `Subtotal · ${numero(datos.calidad.mesesComisionParcial)} meses con pólizas pendientes`
                          : null;
                return (
                  <article
                    key={key}
                    className="border-line bg-panel min-w-0 rounded-xl border p-4 sm:p-5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h2 className="text-ink-dim text-xs leading-relaxed font-medium">
                        {titulo}
                      </h2>
                      <span className="bg-bg2 text-ink-dim shrink-0 rounded px-1.5 py-0.5 text-[10px]">
                        {alCorte.includes(key) ? 'Al corte' : 'Período'}
                      </span>
                    </div>
                    <p
                      className={`font-heading text-navy mt-3 font-semibold break-words tabular-nums ${valor === null ? 'text-lg' : 'text-2xl'}`}
                    >
                      {monetario
                        ? dinero(valor)
                        : numero(valor, key === 'promedio' ? 2 : 0)}
                    </p>
                    {causaComision && (
                      <p className="text-ink-dim mt-2 text-xs leading-relaxed">
                        {causaComision}
                      </p>
                    )}
                    <p className="text-ink-dim mt-2 text-xs">
                      {comparar
                        ? `${(((valor - previo) / previo) * 100).toLocaleString('es-AR', { maximumFractionDigits: 1, signDisplay: 'exceptZero' })}% respecto del período anterior`
                        : 'Sin comparación válida'}
                    </p>
                    <details className="text-ink-dim mt-3 text-xs">
                      <summary className="text-primary cursor-pointer">
                        Definición
                      </summary>
                      <p className="mt-2 leading-relaxed">{def}</p>
                    </details>
                  </article>
                );
              })}
            </div>
            <p className="text-ink-dim text-xs">
              Comparación: {fecha(datos.anterior.desde)} al{' '}
              {fecha(datos.anterior.hasta)}, igual cantidad de días. Comisiones:
              cortes mensuales sin prorrateo; los extremos del rango pueden ser
              parciales. Compañía, ramo y provincia usan la clasificación
              actual; el estado se evalúa con evidencia al corte seleccionado.
            </p>
            {datos.motivos && (
              <p className="text-ink-dim text-xs">
                Bajas verificadas: {numero(datos.motivos.baja)} por baja
                efectiva, {numero(datos.motivos.vencimiento)} por vencimiento y{' '}
                {numero(datos.motivos.historica)} por pase a histórica. No hay
                motivos comerciales estructurados.
              </p>
            )}
            {datos.metricas.polizas === 0 && (
              <SinDatos texto="No hay pólizas vigentes al corte para este segmento. Podés cambiar el estado o ampliar los filtros para analizar la cartera activa." />
            )}
            <Tendencias datos={datos} />
            <GeografiaPanel datos={datos} />
            <div className="grid min-w-0 gap-5 lg:grid-cols-2">
              <Seccion
                titulo="Participación por aseguradora"
                descripcion={
                  unidad === 'comision'
                    ? 'Comisión recurrente al corte (ARS), agrupada por aseguradora actual.'
                    : 'Pólizas vigentes al corte, agrupadas por aseguradora actual.'
                }
                acciones={
                  <label className="text-ink-dim text-xs">
                    Medir por
                    <select
                      className={selectClass}
                      value={unidad}
                      onChange={(e) => setUnidad(e.target.value)}
                    >
                      <option value="polizas">Pólizas</option>
                      <option
                        value="comision"
                        disabled={datos.metricas.comision === null}
                      >
                        Comisiones
                      </option>
                    </select>
                  </label>
                }
              >
                {datos.companias === null ||
                (unidad === 'comision' && datos.metricas.comision === null) ? (
                  <SinDatos texto="Sin datos suficientes para esta distribución." />
                ) : (
                  <Barras
                    moneda={unidad === 'comision'}
                    items={[...datos.companias]
                      .sort((a, b) =>
                        unidad === 'comision'
                          ? (b.comision ?? 0) - (a.comision ?? 0)
                          : b.polizas - a.polizas
                      )
                      .map((c) => ({
                        ...c,
                        valor: unidad === 'comision' ? c.comision : c.polizas,
                        color: getCompaniaColor(c.nombre, c.color).accent,
                      }))}
                  />
                )}
              </Seccion>
              <Seccion
                titulo="Participación por ramo"
                descripcion="Pólizas vigentes al corte, agrupadas por ramo actual y participación dentro del segmento."
              >
                {datos.ramos === null ? (
                  <SinDatos texto="Sin historia suficiente para esta distribución." />
                ) : (
                  <Barras
                    items={datos.ramos.map((r) => ({
                      ...r,
                      nombre: `${r.nombre} (${datos.metricas.polizas ? numero((r.polizas / datos.metricas.polizas) * 100, 1) : 0}%)`,
                      valor: r.polizas,
                    }))}
                  />
                )}
              </Seccion>
            </div>
            <CrossSelling datos={datos} />
            <details className="border-line bg-panel text-ink-dim rounded-lg border p-4 text-xs">
              <summary className="text-primary cursor-pointer">
                Criterios y límites de este análisis
              </summary>
              <div className="mt-3 max-w-3xl space-y-2 leading-relaxed">
                <p>
                  Un asegurado se identifica por cliente_id. El domicilio y las
                  relaciones comerciales usan sus atributos actuales; no hay
                  historial completo de domicilios, cambios de compañía o
                  reasignación de clientes. No se infiere un país de origen.
                </p>
                <p>
                  Las bajas e importes históricos requieren versiones completas.
                  Las comisiones muestran el subtotal de las pólizas con importe
                  calculable; las pólizas sin importe se informan aparte y no se
                  rellenan con cero. Un mes queda en «No disponible» sólo cuando
                  falta evidencia para saber qué pólizas están vigentes al corte.
                  La evolución neta cuenta transiciones de vigencia; una baja
                  lógica de cliente puede cambiar el stock sin ser una baja de
                  póliza.
                </p>
                <p>
                  Los nuevos asegurados se miden por la primera póliza
                  registrada. Las importaciones iniciales pueden concentrar
                  altas registrales. Las comisiones son estimaciones recurrentes
                  al 14%, no cobros ni liquidaciones contractuales.
                </p>
                <p>
                  La información pertenece a la cartera compartida que tu sesión
                  puede consultar. Última lectura:{' '}
                  {new Date(datos.generado).toLocaleString('es-AR')}.
                </p>
              </div>
            </details>
          </>
        )
      )}
    </div>
  );
}
