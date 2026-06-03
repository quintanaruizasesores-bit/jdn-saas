import { Suspense } from 'react';
import { LoginForm } from '@/features/auth/login-form';

export default function LoginPage() {
  return (
    <>
      <h2 className="mb-6 font-serif text-xl">Iniciar sesión</h2>
      <Suspense fallback={<p className="text-ink-faint">Cargando…</p>}>
        <LoginForm />
      </Suspense>
    </>
  );
}
