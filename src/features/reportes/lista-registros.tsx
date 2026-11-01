'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Button } from '@/components/ui/button';
import { SinDatos, numero, selectClass } from './reportes-ui';

export interface Registro {
  id: string;
  href: string;
  principal: string;
  secundario?: string;
  etiqueta?: string;
}

const PAGE = 25;

/** Diálogo accesible y paginado para abrir los registros detrás de un indicador.
 *  Reutilizable por Salud y Calidad; busca sin acentos y enlaza a cada ficha. */
export function ListaRegistrosDialog({
  abierto,
  onCerrar,
  titulo,
  descripcion,
  registros,
  buscarPlaceholder = 'Buscar por nombre',
}: {
  abierto: boolean;
  onCerrar: () => void;
  titulo: string;
  descripcion?: string;
  registros: Registro[];
  buscarPlaceholder?: string;
}) {
  const [busqueda, setBusqueda] = useState('');
  const [pagina, setPagina] = useState(0);
  const norm = (s: string) =>
    s
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLocaleLowerCase('es');
  const filtrados = useMemo(() => {
    const t = norm(busqueda.trim());
    return t
      ? registros.filter(
          (r) =>
            norm(r.principal).includes(t) ||
            (r.secundario ? norm(r.secundario).includes(t) : false)
        )
      : registros;
  }, [registros, busqueda]);

  return (
    <Dialog
      open={abierto}
      onOpenChange={(o) => {
        if (!o) {
          onCerrar();
          setBusqueda('');
          setPagina(0);
        }
      }}
    >
      <DialogContent className="max-h-[85vh] space-y-4 overflow-y-auto p-6">
        <DialogPrimitive.Title asChild>
          <DialogTitle>{titulo}</DialogTitle>
        </DialogPrimitive.Title>
        {descripcion && (
          <DialogPrimitive.Description className="text-ink-dim text-sm">
            {descripcion}
          </DialogPrimitive.Description>
        )}
        <input
          aria-label="Buscar en la lista"
          placeholder={buscarPlaceholder}
          className={selectClass}
          value={busqueda}
          onChange={(e) => {
            setBusqueda(e.target.value);
            setPagina(0);
          }}
        />
        <p className="text-ink-dim text-xs">{numero(filtrados.length)} registros</p>
        {!filtrados.length ? (
          <SinDatos texto="No hay registros que coincidan con la búsqueda." />
        ) : (
          <ul className="divide-line divide-y">
            {filtrados.slice(pagina * PAGE, (pagina + 1) * PAGE).map((r) => (
              <li key={r.id}>
                <Link
                  href={r.href}
                  className="hover:bg-bg2 -mx-2 flex items-center justify-between gap-3 rounded-md px-2 py-3 transition-colors"
                >
                  <span className="min-w-0">
                    <span className="text-primary block font-medium">
                      {r.principal}
                    </span>
                    {r.secundario && (
                      <span className="text-ink-dim block text-xs">
                        {r.secundario}
                      </span>
                    )}
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    {r.etiqueta && (
                      <span className="bg-bg2 text-ink-dim rounded px-1.5 py-0.5 text-[10px]">
                        {r.etiqueta}
                      </span>
                    )}
                    <ChevronRight
                      className="text-ink-faint h-4 w-4"
                      aria-hidden="true"
                    />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        {filtrados.length > PAGE && (
          <div className="flex justify-between gap-2">
            <Button
              variant="outline"
              disabled={!pagina}
              onClick={() => setPagina(pagina - 1)}
            >
              Anterior
            </Button>
            <span className="text-ink-dim self-center text-xs tabular-nums">
              Página {pagina + 1} de {Math.ceil(filtrados.length / PAGE)}
            </span>
            <Button
              variant="outline"
              disabled={(pagina + 1) * PAGE >= filtrados.length}
              onClick={() => setPagina(pagina + 1)}
            >
              Siguiente
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
