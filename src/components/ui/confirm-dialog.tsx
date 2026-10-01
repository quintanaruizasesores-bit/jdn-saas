'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './dialog';
import { Button } from './button';

interface ConfirmDialogProps {
  /** Element that opens the dialog (e.g. a Button). */
  trigger: React.ReactNode;
  title: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Visual intent of the confirm action. */
  destructive?: boolean;
  /** Called when the user confirms. May be async; the dialog waits for it and shows a loading state. */
  onConfirm: () => void | Promise<void>;
}

/**
 * Reusable confirmation modal built on top of the shared Dialog primitive.
 * Prefer this over window.confirm for any destructive or irreversible action.
 * Guards against double-submit and closes automatically after a successful confirm.
 */
export function ConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  destructive = false,
  onConfirm,
}: ConfirmDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  async function handleConfirm() {
    if (loading) return; // guard against double click
    setLoading(true);
    try {
      await onConfirm();
      setOpen(false);
    } catch {
      // El llamador maneja el error (p. ej. toast en onError de la mutación).
      // Mantenemos el diálogo abierto para que el usuario pueda reintentar.
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !loading && setOpen(v)}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {description && (
          <div className="px-6 py-5 text-sm leading-relaxed text-ink-dim">{description}</div>
        )}
        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => setOpen(false)}
            disabled={loading}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={destructive ? 'destructive' : 'default'}
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading ? 'Procesando...' : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
