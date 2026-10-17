import Link from 'next/link';
import { UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function NewClientShortcut() {
  return (
    <Button
      asChild
      size="lg"
      className="fixed right-[calc(1rem+env(safe-area-inset-right))] bottom-[calc(1rem+env(safe-area-inset-bottom))] z-40 h-14 gap-2 px-5 shadow-lg hover:shadow-xl"
    >
      <Link href="/clientes/nuevo" title="Agregar cliente nuevo">
        <UserPlus className="h-5 w-5" aria-hidden="true" />
        Nuevo cliente
      </Link>
    </Button>
  );
}
