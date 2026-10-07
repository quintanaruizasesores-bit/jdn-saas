'use client';

import { MessageCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export interface WhatsappPreviewData {
  nombre: string;
  /** Mensaje con las variables ya reemplazadas. */
  message: string;
  /** Link wa.me listo, o null si el teléfono falta/es inválido. */
  link: string | null;
}

/**
 * Previsualización del mensaje antes de abrir WhatsApp. Evita enviar por error
 * un mensaje mal configurado. "Abrir WhatsApp" solo genera/abre el link
 * `wa.me`; nunca envía automáticamente.
 */
export function WhatsappPreviewDialog({
  data,
  open,
  onOpenChange,
  onConfirm,
}: {
  data: WhatsappPreviewData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mensaje para {data?.nombre ?? 'el cliente'}</DialogTitle>
        </DialogHeader>

        <div className="px-6 py-5">
          <div className="whitespace-pre-wrap rounded-[3px] border border-line bg-bg2 p-4 text-sm leading-relaxed text-ink">
            {data?.message}
          </div>
          <p className="mt-3 text-[11px] text-ink-faint">
            Se abrirá WhatsApp con el mensaje precargado. Vas a tener que
            presionar «Enviar» vos mismo.
          </p>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" className="border-line text-ink-dim">
              Cancelar
            </Button>
          </DialogClose>
          <Button
            onClick={onConfirm}
            disabled={!data?.link}
            className="bg-green text-[#10140d] hover:opacity-90"
          >
            <MessageCircle className="mr-1 h-4 w-4" />
            Abrir WhatsApp
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
