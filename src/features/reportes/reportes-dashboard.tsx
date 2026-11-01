'use client';
import { useCallback, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { RefreshCw, SlidersHorizontal, AlertTriangle } from 'lucide-react';
import { AppHeader } from '@/components/dashboard/app-header';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/ui/error-state';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ScrollFade } from '@/components/ui/scroll-fade';
import { periodoComision } from '@/lib/dashboard/comision';
import { PROVINCIAS, SIN_UBICACION, EXTERIOR } from '@/lib/reportes/geografia';
import type {
  FiltrosInteligencia,
  ResultadoInteligencia,
} from '@/lib/reportes/inteligencia';
import { fecha, numero, selectClass } from './reportes-ui';
import { Resumen } from './vistas/resumen';
import { Rentabilidad } from './vistas/rentabilidad';
import { Salud } from './vistas/salud';
import { Oportunidades } from './vistas/oportunidades';
import { Calidad } from './vistas/calidad';

const VISTAS = [
  ['resumen', 'Resumen'],
  ['rentabilidad', 'Rentabilidad'],
  ['salud', 'Salud de cartera'],
  ['oportunidades', 'Oportunidades'],
  ['calidad', 'Calidad de datos'],
] as const;
type VistaId = (typeof VISTAS)[number][0];
const esVista = (v: string | null): v is VistaId =>
  !!v && VISTAS.some(([id]) => id === v);

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
  const router = useRouter();
  const searchParams = useSearchParams();
  const vista: VistaId = esVista(searchParams.get('vista'))
    ? (searchParams.get('vista') as VistaId)
    : 'resumen';
  const irA = useCallback(
    (v: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('vista', v);
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [router, searchParams]
  );

  const [aplicados, setAplicados] = useState(inicial),
    [borrador, setBorrador] = useState(inicial);

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

  const revisar = datos
    ? datos.calidad.sinHistoria +
      datos.calidad.sinImporte +
      datos.calidad.finLegacyAmbiguo
    : 0;

  return (
    <div className="space-y-5">
      <AppHeader
        title="Reportes e inteligencia de cartera"
        subtitle="Centro de decisión comercial: rentabilidad, salud, oportunidades y calidad de datos"
      />

      <details className="border-line bg-panel group rounded-xl border" open>
        <summary className="text-ink flex cursor-pointer list-none items-center gap-2 p-4 text-sm font-medium sm:p-5">
          <SlidersHorizontal className="text-primary h-4 w-4" />
          Filtros de cartera
          <span className="text-ink-dim ml-auto text-xs font-normal">
            {fecha(aplicados.desde)} — {fecha(aplicados.hasta)}
          </span>
        </summary>
        <form
          className="border-line border-t p-4 sm:p-5"
          onSubmit={(e) => {
            e.preventDefault();
            setAplicados({ ...borrador });
          }}
        >
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
              Hasta / corte
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
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={query.isFetching}
              onClick={() => query.refetch()}
              className="ml-auto"
            >
              <RefreshCw
                className={`h-3 w-3 ${query.isFetching ? 'animate-spin' : ''}`}
              />
              Actualizar
            </Button>
          </div>
        </form>
      </details>

      {datos && revisar > 0 && (
        <button
          type="button"
          onClick={() => irA('calidad')}
          className="border-line bg-bg2 hover:border-rust/40 flex w-full items-center gap-3 rounded-lg border p-3 text-left text-sm transition-colors"
        >
          <AlertTriangle className="text-rust h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="text-ink-dim min-w-0">
            <strong className="text-ink">{numero(revisar)} registros</strong> afectan
            el cálculo de la cartera. Revisá la calidad de datos para mejorar la
            precisión.
          </span>
          <span className="text-primary ml-auto shrink-0 text-xs font-medium">
            Ver calidad
          </span>
        </button>
      )}

      {query.isPending ? (
        <div role="status" className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
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
          <Tabs value={vista} onValueChange={irA}>
            <ScrollFade>
              <TabsList className="min-w-max">
                {VISTAS.map(([id, label]) => (
                  <TabsTrigger key={id} value={id}>
                    {label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </ScrollFade>
            <TabsContent value="resumen">
              <Resumen datos={datos} irA={irA} />
            </TabsContent>
            <TabsContent value="rentabilidad">
              <Rentabilidad datos={datos} />
            </TabsContent>
            <TabsContent value="salud">
              <Salud datos={datos} />
            </TabsContent>
            <TabsContent value="oportunidades">
              <Oportunidades datos={datos} />
            </TabsContent>
            <TabsContent value="calidad">
              <Calidad datos={datos} />
            </TabsContent>
          </Tabs>
        )
      )}

      <p className="text-ink-faint text-xs">
        Cartera compartida que tu sesión puede consultar (modelo mono-corredor).
        Comisiones estimadas al 14%, no cobradas ni liquidadas.
        {datos && ` Última lectura: ${new Date(datos.generado).toLocaleString('es-AR')}.`}
      </p>
    </div>
  );
}
