'use client';

import { useQuery } from '@tanstack/react-query';
import { Bell } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { getTaskAlertWindow, taskDueLabel } from '@/lib/tareas/alertas';
import { createClient } from '@/lib/supabase/client';
import { fetchTareasAlertas } from '@/services/tareas-alertas.service';

export function TaskAlertBell() {
  const [alertWindow, setAlertWindow] = useState(() => getTaskAlertWindow());
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const updateWindow = () => setAlertWindow(getTaskAlertWindow());
    const interval = setInterval(updateWindow, 60_000);
    window.addEventListener('focus', updateWindow);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', updateWindow);
    };
  }, []);

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ['tareas', 'alertas', alertWindow.today],
    queryFn: () => fetchTareasAlertas(createClient(), alertWindow.through),
    refetchInterval: 60_000,
    refetchOnWindowFocus: 'always',
  });

  const count = data?.count ?? 0;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-label={
            isPending
              ? 'Alertas de tareas: cargando'
              : isError
                ? 'Alertas de tareas: error al cargar'
                : `Alertas de tareas: ${count}`
          }
          aria-expanded={open}
          className="border-line text-ink-dim hover:border-primary hover:text-primary relative h-9 w-9 p-0"
        >
          <Bell aria-hidden="true" className="h-4 w-4" />
          {!isPending && !isError && count > 0 && (
            <span className="bg-primary absolute -top-2 -right-2 flex min-h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white">
              {count > 99 ? '99+' : count}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-[min(22rem,calc(100vw-2rem))] p-0"
      >
        <div className="border-line border-b px-4 py-3">
          <h2 className="text-ink font-heading text-sm font-semibold">
            Tareas por vencer
          </h2>
          <p className="text-ink-dim text-xs">
            Vencidas o dentro de los próximos 7 días
          </p>
        </div>
        {isPending ? (
          <p className="text-ink-dim px-4 py-5 text-sm" role="status">
            Cargando alertas...
          </p>
        ) : isError ? (
          <div className="px-4 py-5 text-sm">
            <p className="text-red">No se pudieron cargar las alertas.</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => refetch()}
            >
              Reintentar
            </Button>
          </div>
        ) : count === 0 ? (
          <p className="text-ink-dim px-4 py-5 text-sm">
            No hay tareas próximas a vencer.
          </p>
        ) : (
          <ul className="max-h-72 overflow-y-auto py-1">
            {data?.items.map((task) => (
              <li
                key={task.id}
                className="border-line border-b px-4 py-2.5 last:border-b-0"
              >
                <p className="text-ink text-sm font-medium break-words">
                  {task.titulo}
                </p>
                <p
                  className={
                    task.fecha_vencimiento < alertWindow.today
                      ? 'text-red text-xs'
                      : 'text-ink-dim text-xs'
                  }
                >
                  {taskDueLabel(task.fecha_vencimiento, alertWindow.today)}
                </p>
              </li>
            ))}
          </ul>
        )}
        <div className="border-line border-t px-4 py-3">
          <Link
            href="/tareas"
            onClick={() => setOpen(false)}
            className="text-primary text-sm font-medium hover:underline"
          >
            Ver todas las tareas
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
