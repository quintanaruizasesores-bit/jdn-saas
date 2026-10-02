'use client';

import * as React from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { Search, ChevronsUpDown, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { fetchClientes, fetchClienteById } from '@/services/clientes.service';
import { getClienteNombre } from '@/lib/utils';
import { cn } from '@/lib/utils';
import type { Cliente } from '@/types/database';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Command, CommandInput, CommandList, CommandItem } from '@/components/ui/command';

const MIN_CHARS = 2;
const DEBOUNCE_MS = 300;
const PAGE_SIZE = 15;

interface ClienteComboboxProps {
  value: string | null;
  onChange: (id: string) => void;
  disabled?: boolean;
  className?: string;
}

/** Línea secundaria para desambiguar homónimos: teléfono · email · DNI / CUIT (sólo lo que existe). */
function datosSecundarios(c: Cliente): string {
  const partes: string[] = [];
  if (c.telefono) partes.push(`📱 ${c.telefono}`);
  if (c.email) partes.push(c.email);
  if (c.dni) partes.push(`DNI / CUIT ${c.dni}`);
  return partes.join('  ·  ');
}

export function ClienteCombobox({ value, onChange, disabled, className }: ClienteComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [input, setInput] = React.useState('');
  const [debounced, setDebounced] = React.useState('');
  // Cache local del cliente recién elegido para mostrarlo sin refetch.
  const [picked, setPicked] = React.useState<Cliente | null>(null);

  // Debounce del término de búsqueda.
  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(input), DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [input]);

  const term = debounced.trim();
  const tooShort = term.length < MIN_CHARS;

  // Resultados de búsqueda. La query se keyea por el término: TanStack descarta
  // respuestas de términos viejos, así que una respuesta lenta anterior nunca
  // pisa los resultados de una búsqueda más reciente (race condition).
  const {
    data: resultados,
    isFetching,
    isError,
  } = useQuery({
    queryKey: ['clientes-combobox', term],
    queryFn: async () => {
      const res = await fetchClientes(createClient(), { search: term, pageSize: PAGE_SIZE });
      if (res.error) throw res.error;
      return (res.data ?? []) as Cliente[];
    },
    enabled: open && !tooShort,
    placeholderData: keepPreviousData,
  });

  // Hidrata el cliente seleccionado (modo edición / value inicial) si no lo tenemos en cache.
  const needsHydration = !!value && (!picked || picked.id !== value);
  const { data: hidratado } = useQuery({
    queryKey: ['cliente-by-id', value],
    queryFn: async () => {
      const res = await fetchClienteById(createClient(), value!);
      if (res.error) throw res.error;
      return res.data as Cliente;
    },
    enabled: needsHydration,
  });

  const seleccionado: Cliente | null =
    picked && picked.id === value ? picked : value ? (hidratado ?? null) : null;

  function handleSelect(c: Cliente) {
    setPicked(c);
    onChange(c.id);
    setOpen(false);
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      // Al cerrar, limpiamos la búsqueda para reabrir en limpio.
      setInput('');
      setDebounced('');
    }
  }

  const mostrarCargandoVacio = isFetching && (!resultados || resultados.length === 0);
  const hayResultados = !!resultados && resultados.length > 0;

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          aria-label="Buscar cliente"
          className={cn(
            'flex h-auto min-h-10 w-full items-center justify-between gap-2 rounded-[3px] border border-line bg-bg2 px-3 py-2 text-left font-mono text-xs outline-none focus:border-amber disabled:cursor-not-allowed disabled:opacity-50',
            className
          )}
        >
          {seleccionado ? (
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-ink">{getClienteNombre(seleccionado)}</span>
              {datosSecundarios(seleccionado) && (
                <span className="truncate text-ink-faint">{datosSecundarios(seleccionado)}</span>
              )}
            </span>
          ) : (
            <span className="flex items-center gap-2 text-ink-faint">
              <Search className="h-4 w-4" />
              Buscar cliente...
            </span>
          )}
          {seleccionado ? (
            <span className="shrink-0 text-[10px] uppercase tracking-wider text-amber">cambiar</span>
          ) : (
            <ChevronsUpDown className="h-4 w-4 shrink-0 text-ink-faint" />
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent
        className="w-[--radix-popover-trigger-width] min-w-[280px] p-0"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <Command shouldFilter={false}>
          <CommandInput
            value={input}
            onValueChange={setInput}
            placeholder="Nombre, apellido, teléfono o email..."
            autoFocus
          />
          <CommandList>
            {tooShort ? (
              <p className="px-3 py-6 text-center font-mono text-xs text-ink-faint">
                Escribí al menos {MIN_CHARS} caracteres para buscar un cliente.
              </p>
            ) : isError ? (
              <p className="px-3 py-6 text-center font-mono text-xs text-red">
                Ocurrió un error al buscar clientes. Intentá de nuevo.
              </p>
            ) : mostrarCargandoVacio ? (
              <p className="flex items-center justify-center gap-2 px-3 py-6 font-mono text-xs text-ink-faint">
                <Loader2 className="h-4 w-4 animate-spin" />
                Buscando...
              </p>
            ) : hayResultados ? (
              <>
                {isFetching && (
                  <p className="px-3 py-1 font-mono text-[10px] text-ink-faint">Actualizando...</p>
                )}
                {resultados!.map((c) => (
                  <CommandItem key={c.id} value={c.id} onSelect={() => handleSelect(c)}>
                    <span className="truncate text-ink">{getClienteNombre(c)}</span>
                    {datosSecundarios(c) && (
                      <span className="truncate text-ink-faint">{datosSecundarios(c)}</span>
                    )}
                  </CommandItem>
                ))}
              </>
            ) : (
              <p className="px-3 py-6 text-center font-mono text-xs text-ink-faint">
                No encontramos clientes con &quot;{term}&quot;.
              </p>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
