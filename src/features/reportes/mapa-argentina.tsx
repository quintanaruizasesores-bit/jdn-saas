'use client';
import { useEffect, useState } from 'react';
import { MapContainer, GeoJSON, ZoomControl } from 'react-leaflet';
import type { FeatureCollection } from 'geojson';
import type { PathOptions } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { ResultadoInteligencia } from '@/lib/reportes/inteligencia';

type Region = NonNullable<ResultadoInteligencia['geografia']>[number];
export default function MapaArgentina({
  regiones,
  seleccion,
  onSelect,
}: {
  regiones: Region[];
  seleccion: string;
  onSelect: (id: string) => void;
}) {
  const [geo, setGeo] = useState<FeatureCollection | null>(null),
    [error, setError] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    fetch('/geo/argentina-provincias.geojson', { signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw Error();
        return r.json();
      })
      .then((g) => {
        if (g.features?.length !== 24) throw Error();
        setGeo(g);
      })
      .catch((e) => {
        if (e.name !== 'AbortError') setError(true);
      });
    return () => controller.abort();
  }, []);
  if (error)
    return (
      <p role="alert" className="text-red p-5 text-sm">
        No se pudo cargar la cartografía. Podés consultar las provincias con el
        selector.
      </p>
    );
  if (!geo)
    return (
      <p role="status" className="text-ink-dim p-5 text-sm">
        Cargando cartografía de Argentina…
      </p>
    );
  const porId = new Map(regiones.map((r) => [r.id, r])),
    max = Math.max(1, ...regiones.map((r) => r.asegurados));
  const estilo = (id: string): PathOptions => {
    const n = porId.get(id)?.asegurados ?? 0;
    return {
      color: seleccion === id ? '#1A2556' : '#FFFFFF',
      weight: seleccion === id ? 3 : 1,
      fillOpacity: 1,
      fillColor: n
        ? `hsl(217 72% ${86 - 47 * Math.sqrt(n / max)}%)`
        : '#E4E8F0',
    };
  };
  return (
    <div
      className="bg-bg2 relative z-0 h-[430px] overflow-hidden rounded-lg sm:h-[540px]"
      role="region"
      aria-label="Mapa de asegurados activos por provincia. Alternativa: selector de provincia."
    >
      <MapContainer
        bounds={[
          [-56, -75],
          [-21, -53],
        ]}
        minZoom={2}
        maxZoom={9}
        scrollWheelZoom={false}
        zoomControl={false}
        style={{ height: '100%', width: '100%', background: 'var(--bg2)' }}
        attributionControl
      >
        <ZoomControl
          position="topleft"
          zoomInTitle="Acercar"
          zoomOutTitle="Alejar"
        />
        <GeoJSON
          key={
            JSON.stringify(
              regiones.map((r) => [r.id, r.asegurados, r.polizas])
            ) + seleccion
          }
          data={geo}
          style={(f) => estilo(String(f?.properties?.id))}
          onEachFeature={(feature, layer) => {
            const id = String(feature.properties?.id),
              r = porId.get(id);
            const tooltip = document.createElement('span');
            tooltip.textContent = `${feature.properties?.nombre}: ${r?.asegurados ?? 0} asegurados · ${r?.polizas ?? 0} pólizas · ${r?.porcentajeNacional ?? 0}% del total nacional con provincia identificada`;
            layer.bindTooltip(tooltip, { sticky: true });
            layer.on('click', () => onSelect(id));
          }}
          attribution='<a href="https://www.argentina.gob.ar/georef">Georef / IGN</a>'
        />
      </MapContainer>
    </div>
  );
}
