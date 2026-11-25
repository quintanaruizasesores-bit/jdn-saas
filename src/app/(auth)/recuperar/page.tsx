import Link from 'next/link';
import { RecuperarForm } from '@/features/auth/recuperar-form';

export default async function RecuperarPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; estado?: string }>;
}) {
  const { error, estado } = await searchParams;
  return (
    <>
      <h2 className="font-heading mb-6 text-xl">Recuperar contraseña</h2>
      {error === 'enlace' && (
        <p role="alert" className="text-red mb-4 text-sm">
          El enlace venció, ya se usó o se abrió en otro navegador. Pedí uno
          nuevo y abrilo en el navegador donde lo solicitaste.
        </p>
      )}
      {estado === 'actualizada' ? (
        <p role="status" className="text-green text-sm">
          Tu contraseña se actualizó.
        </p>
      ) : (
        <RecuperarForm />
      )}
      <Link
        href="/login"
        className="text-ink-faint hover:text-primary mt-4 block text-center text-xs"
      >
        Volver al inicio de sesión
      </Link>
    </>
  );
}
