'use client';

import { useCallback, useEffect, useState } from 'react';

/**
 * Estado local "WhatsApp preparado / abierto" por cliente y año. NO significa
 * "mensaje enviado": el sistema no sabe si el usuario finalmente presionó
 * enviar dentro de WhatsApp. Solo evita que, por error, se prepare dos veces el
 * mismo saludo.
 *
 * Se persiste en localStorage por usuario y año. La clave legacy sin usuario no
 * se lee porque no permite comprobar quién era su propietario. Toda
 * lectura/escritura va envuelta en try/catch: en modo privado o
 * con storage bloqueado, el módulo sigue funcionando sin marcar nada.
 */
function storageKey(year: number, userId: string): string {
  return `cumple:whatsapp-preparado:${userId}:${year}`;
}

export function useContactado(year: number, userId: string | null) {
  const key = userId ? storageKey(year, userId) : null;
  const [state, setState] = useState<{ key: string | null; ids: Set<string> }>({
    key: null,
    ids: new Set(),
  });

  useEffect(() => {
    if (!key) {
      setState({ key: null, ids: new Set() });
      return;
    }
    try {
      const raw = localStorage.getItem(key);
      setState({ key, ids: raw ? new Set(JSON.parse(raw) as string[]) : new Set() });
    } catch {
      setState({ key, ids: new Set() });
    }
  }, [key]);

  const marcar = useCallback(
    (id: string) => {
      if (!key) return;
      setState((prev) => {
        const current = prev.key === key ? prev.ids : new Set<string>();
        if (current.has(id)) return prev;
        const next = new Set(current);
        next.add(id);
        try {
          localStorage.setItem(key, JSON.stringify([...next]));
        } catch {
          // storage no disponible — el estado vive solo en memoria.
        }
        return { key, ids: next };
      });
    },
    [key]
  );

  return { ids: state.key === key ? state.ids : new Set<string>(), marcar };
}
