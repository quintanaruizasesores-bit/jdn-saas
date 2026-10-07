'use client';

import { useCallback, useEffect, useState } from 'react';

/**
 * Estado local "WhatsApp preparado / abierto" por cliente y año. NO significa
 * "mensaje enviado": el sistema no sabe si el usuario finalmente presionó
 * enviar dentro de WhatsApp. Solo evita que, por error, se prepare dos veces el
 * mismo saludo.
 *
 * Se persiste en localStorage (por navegador) y se resetea cada año al cambiar
 * la clave. Toda lectura/escritura va envuelta en try/catch: en modo privado o
 * con storage bloqueado, el módulo sigue funcionando sin marcar nada.
 */
function storageKey(year: number): string {
  return `cumple:whatsapp-preparado:${year}`;
}

export function useContactado(year: number) {
  const [ids, setIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey(year));
      if (raw) setIds(new Set(JSON.parse(raw) as string[]));
      else setIds(new Set());
    } catch {
      setIds(new Set());
    }
  }, [year]);

  const marcar = useCallback(
    (id: string) => {
      setIds((prev) => {
        if (prev.has(id)) return prev;
        const next = new Set(prev);
        next.add(id);
        try {
          localStorage.setItem(storageKey(year), JSON.stringify([...next]));
        } catch {
          // storage no disponible — el estado vive solo en memoria.
        }
        return next;
      });
    },
    [year]
  );

  return { ids, marcar };
}
