// @vitest-environment node
import { readFile } from 'node:fs/promises';
import { expect, it } from 'vitest';
import { PROVINCIAS } from './geografia';
it('la cartografía local cubre exactamente las 24 jurisdicciones y sus códigos INDEC', async () => {
  const geo = JSON.parse(
    await readFile(
      new URL(
        '../../../public/geo/argentina-provincias.geojson',
        import.meta.url
      ),
      'utf8'
    )
  );
  expect(geo.type).toBe('FeatureCollection');
  expect(geo.features).toHaveLength(24);
  expect(
    geo.features
      .map((f: { properties: { id: string } }) => f.properties.id)
      .sort()
  ).toEqual(PROVINCIAS.map((p) => p[0]).sort());
  expect(
    geo.features.every(
      (f: { geometry: { type: string; coordinates: unknown[] } }) =>
        ['Polygon', 'MultiPolygon'].includes(f.geometry.type) &&
        f.geometry.coordinates.length > 0
    )
  ).toBe(true);
});
