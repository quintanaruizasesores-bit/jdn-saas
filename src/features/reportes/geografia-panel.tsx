'use client';
import { useState } from 'react';
import dynamic from 'next/dynamic';
import {
  PROVINCIAS,
  EXTERIOR,
  SIN_UBICACION,
  nombreProvincia,
} from '@/lib/reportes/geografia';
import type { ResultadoInteligencia } from '@/lib/reportes/inteligencia';
import { Barras, Seccion, SinDatos, numero, selectClass } from './reportes-ui';
const Mapa = dynamic(() => import('./mapa-argentina'), {
  ssr: false,
  loading: () => <p role="status">Cargando mapa…</p>,
});

export function GeografiaPanel({ datos }: { datos: ResultadoInteligencia }) {
  const [seleccion, setSeleccion] = useState('14');
  const regiones = datos.geografia,
    region = regiones?.find((r) => r.id === seleccion);
  return (
    <Seccion
      titulo="Presencia en Argentina"
      descripcion="Asegurados únicos con pólizas vigentes al corte. Ubicación actual del cliente; no se modifica su domicilio."
    >
      {regiones === null ? (
        <SinDatos texto="La distribución requiere historia suficiente para todas las pólizas del segmento." />
      ) : (
        <>
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(280px,1fr)]">
            <div className="min-w-0">
              <Mapa
                regiones={regiones}
                seleccion={seleccion}
                onSelect={setSeleccion}
              />
              <div className="text-ink-dim mt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                <span>
                  Menos asegurados{' '}
                  <span
                    aria-hidden="true"
                    className="mx-2 inline-block h-2 w-20 bg-gradient-to-r from-[#c2d7f8] to-[#1c53a9]"
                  />{' '}
                  Más asegurados
                </span>
                <span>Gris: 0 asegurados</span>
              </div>
              <p className="text-ink-dim mt-3 text-xs">
                {numero(datos.metricas.asegurados)} asegurados en el segmento.
                Argentina con provincia identificada:{' '}
                {numero(datos.nacionalIdentificado)}. Sin ubicación determinada:{' '}
                {numero(
                  regiones.find((r) => r.id === SIN_UBICACION)?.asegurados ?? 0
                )}
                . Exterior explícito:{' '}
                {numero(
                  regiones.find((r) => r.id === EXTERIOR)?.asegurados ?? 0
                )}
                .
              </p>
            </div>
            <aside
              className="border-line min-w-0 rounded-lg border p-4"
              aria-label="Detalle de provincia"
            >
              <label
                className="text-ink-dim mb-2 block text-xs font-medium"
                htmlFor="detalle-provincia"
              >
                Seleccionar jurisdicción
              </label>
              <select
                id="detalle-provincia"
                className={selectClass}
                value={seleccion}
                onChange={(e) => setSeleccion(e.target.value)}
              >
                {[
                  ...PROVINCIAS,
                  [SIN_UBICACION, nombreProvincia(SIN_UBICACION)],
                  [EXTERIOR, nombreProvincia(EXTERIOR)],
                ].map(([id, nombre]) => (
                  <option key={id} value={id}>
                    {nombre}
                  </option>
                ))}
              </select>
              <div aria-live="polite">
                <h3 className="mt-5 text-lg">{nombreProvincia(seleccion)}</h3>
                <p className="text-ink-dim mt-2 text-sm">
                  <strong className="text-ink">
                    {numero(region?.asegurados ?? 0)}
                  </strong>{' '}
                  asegurados únicos ·{' '}
                  <strong className="text-ink">
                    {numero(region?.polizas ?? 0)}
                  </strong>{' '}
                  pólizas vigentes
                </p>
                <p className="text-ink-dim mt-1 text-xs">
                  {numero(region?.porcentaje ?? 0, 1)}% del total filtrado de
                  asegurados
                </p>
                {PROVINCIAS.some((p) => p[0] === seleccion) && (
                  <p className="text-ink-dim mt-1 text-xs">
                    {numero(region?.porcentajeNacional ?? 0, 1)}% del total
                    nacional con provincia identificada.
                  </p>
                )}
              </div>
              {region ? (
                <div className="mt-5 max-h-[380px] space-y-5 overflow-y-auto pr-1">
                  <div>
                    <h4 className="mb-3 text-sm">Localidades · asegurados</h4>
                    <Barras
                      items={region.localidades.map((r) => ({
                        ...r,
                        valor: r.asegurados,
                      }))}
                    />
                  </div>
                  <div>
                    <h4 className="mb-3 text-sm">Ramos · pólizas</h4>
                    <Barras
                      items={region.ramos.map((r) => ({
                        ...r,
                        valor: r.polizas,
                      }))}
                    />
                  </div>
                  <div>
                    <h4 className="mb-3 text-sm">Aseguradoras · pólizas</h4>
                    <Barras
                      items={region.companias.map((r) => ({
                        ...r,
                        valor: r.polizas,
                      }))}
                    />
                  </div>
                </div>
              ) : (
                <div className="mt-5">
                  <SinDatos texto="Sin asegurados activos en esta jurisdicción para el corte y los filtros elegidos." />
                </div>
              )}
            </aside>
          </div>
        </>
      )}
    </Seccion>
  );
}
