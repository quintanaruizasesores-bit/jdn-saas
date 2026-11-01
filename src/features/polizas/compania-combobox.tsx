'use client';

import { useRef, useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import {
  Command,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { CompaniaBadge } from '@/components/ui/compania-badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export interface CompaniaOpcion {
  id: string;
  nombre: string;
  color?: string | null;
}

function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es-AR');
}

export function CompaniaCombobox({
  value,
  onChange,
  companias,
  className,
}: {
  value: string | null;
  onChange: (id: string) => void;
  companias: CompaniaOpcion[];
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const selected = companias.find((compania) => compania.id === value);
  const term = normalize(search.trim());
  const results = term
    ? companias.filter((compania) => normalize(compania.nombre).includes(term))
    : companias;

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setSearch('');
      }}
    >
      <PopoverTrigger asChild>
        <button
          id="compania-combobox"
          type="button"
          aria-label="Compañía"
          className={cn(
            'border-line bg-bg focus:border-primary focus:ring-primary/10 font-body text-ink flex h-10 w-full min-w-0 items-center justify-between gap-2 rounded-xl border px-3 text-left text-sm outline-none focus:ring-4',
            className
          )}
        >
          {selected ? (
            <CompaniaBadge nombre={selected.nombre} color={selected.color} />
          ) : (
            <span className="text-ink-faint">Seleccionar compañía</span>
          )}
          <ChevronsUpDown
            aria-hidden="true"
            className="text-ink-faint h-4 w-4 shrink-0"
          />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        collisionPadding={8}
        className="w-[var(--radix-popover-trigger-width)] max-w-[calc(100vw-1rem)] p-0"
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          inputRef.current?.focus();
        }}
      >
        <Command
          label="Buscar compañía"
          shouldFilter={false}
          className="min-h-0"
        >
          <CommandInput
            ref={inputRef}
            value={search}
            onValueChange={setSearch}
            aria-label="Buscar compañía"
            placeholder="Buscar compañía..."
          />
          <CommandList
            className="overflow-y-auto overscroll-contain"
            style={{
              maxHeight:
                'min(300px, calc(var(--radix-popover-content-available-height) - 48px))',
            }}
          >
            {results.length ? (
              results.map((compania) => (
                <CommandItem
                  key={compania.id}
                  value={compania.id}
                  onSelect={() => {
                    onChange(compania.id);
                    setOpen(false);
                    setSearch('');
                  }}
                  className={cn(
                    'flex-row justify-between gap-2',
                    compania.id === value && 'bg-primary/8'
                  )}
                >
                  <CompaniaBadge
                    nombre={compania.nombre}
                    color={compania.color}
                  />
                  {compania.id === value && (
                    <Check
                      aria-label="Seleccionada"
                      className="text-primary h-4 w-4 shrink-0"
                    />
                  )}
                </CommandItem>
              ))
            ) : (
              <p className="text-ink-faint px-3 py-6 text-center text-xs">
                No se encontraron compañías
              </p>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
