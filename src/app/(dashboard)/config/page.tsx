import { redirect } from 'next/navigation';

/** Índice de configuración: entra directamente a la pestaña de compañías. */
export default function ConfigIndexPage() {
  redirect('/config/companias');
}
