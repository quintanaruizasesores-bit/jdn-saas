'use client';
import Link from 'next/link';
import { useState } from 'react';
import type { ResultadoInteligencia } from '@/lib/reportes/inteligencia';
import { Seccion, SinDatos, numero, selectClass } from './reportes-ui';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import * as DialogPrimitive from '@radix-ui/react-dialog';

export function CrossSelling({ datos }: { datos: ResultadoInteligencia }) {
  const [segmento, setSegmento] = useState<number | null>(null),
    [busqueda, setBusqueda] = useState(''),
    [pagina, setPagina] = useState(0);
  const clientes =
    datos.segmentos?.find((s) => s.cantidad === segmento)?.clientes ?? [];
  const filtrados = clientes.filter((c) =>
    c.nombre.toLocaleLowerCase('es').includes(busqueda.toLocaleLowerCase('es'))
  );
  return (
    <Seccion
      titulo="Oportunidades de cross-selling"
      descripcion="Clientes según su cantidad de pólizas vigentes dentro del segmento filtrado. Abrí un grupo para consultar sus fichas."
    >
      {datos.segmentos === null ? (
        <SinDatos texto="Sin historia suficiente para determinar los segmentos al corte." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {datos.segmentos.map((s) => (
            <button
              key={s.cantidad}
              onClick={() => {
                setSegmento(s.cantidad);
                setBusqueda('');
                setPagina(0);
              }}
              className="border-line hover:border-primary hover:bg-bg2 rounded-lg border p-4 text-left transition-colors"
            >
              <span className="text-ink-dim text-sm">
                {s.cantidad === 4
                  ? '4 o más pólizas'
                  : `${s.cantidad} ${s.cantidad === 1 ? 'póliza' : 'pólizas'}`}
              </span>
              <strong className="font-heading text-navy mt-2 block text-3xl">
                {numero(s.clientes.length)}
              </strong>
              <span className="text-primary text-xs">Consultar asegurados</span>
            </button>
          ))}
        </div>
      )}
      <Dialog
        open={segmento !== null}
        onOpenChange={(open) => {
          if (!open) setSegmento(null);
        }}
      >
        <DialogContent className="max-h-[85vh] space-y-4 overflow-y-auto p-6">
          <DialogPrimitive.Title asChild>
            <DialogTitle>
              Asegurados con {segmento === 4 ? '4 o más' : segmento}{' '}
              {segmento === 1 ? 'póliza' : 'pólizas'}
            </DialogTitle>
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="text-ink-dim text-sm">
            Pólizas vigentes del segmento aplicado. Los enlaces abren la ficha
            del cliente.
          </DialogPrimitive.Description>
          <input
            aria-label="Buscar en el segmento"
            placeholder="Buscar por nombre"
            className={selectClass}
            value={busqueda}
            onChange={(e) => {
              setBusqueda(e.target.value);
              setPagina(0);
            }}
          />
          <p className="text-ink-dim text-xs">
            {numero(filtrados.length)} asegurados
          </p>
          {!filtrados.length ? (
            <SinDatos texto="No hay clientes que coincidan con la búsqueda." />
          ) : (
            <ul className="divide-line divide-y">
              {filtrados.slice(pagina * 25, (pagina + 1) * 25).map((c) => (
                <li key={c.id} className="py-3">
                  <Link
                    href={`/clientes/${c.id}`}
                    className="text-primary font-medium hover:underline"
                  >
                    {c.nombre}
                  </Link>
                  <p className="text-ink-dim text-xs">
                    {c.polizas} pólizas · {c.provincia}
                  </p>
                </li>
              ))}
            </ul>
          )}
          <div className="flex justify-between gap-2">
            <Button
              variant="outline"
              disabled={!pagina}
              onClick={() => setPagina(pagina - 1)}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              disabled={(pagina + 1) * 25 >= filtrados.length}
              onClick={() => setPagina(pagina + 1)}
            >
              Siguiente
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Seccion>
  );
}
