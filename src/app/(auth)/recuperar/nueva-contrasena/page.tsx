import { redirect } from 'next/navigation';
import { NuevaContrasenaForm } from '@/features/auth/nueva-contrasena-form';
import { createClient } from '@/lib/supabase/server';

export default async function NuevaContrasenaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect('/recuperar?error=enlace');
  }

  return (
    <>
      <h2 className="font-heading mb-6 text-xl">Restablecer contraseña</h2>
      <NuevaContrasenaForm userId={user.id} />
    </>
  );
}
