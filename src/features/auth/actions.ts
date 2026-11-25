'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import {
  nuevaContrasenaSchema,
  recuperarSchema,
} from '@/validations/auth.schema';

type RecoveryState = { error?: string; success?: boolean };

export async function loginAction(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const redirectTo = (formData.get('redirect') as string) || '/dashboard';

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: error.message };
  }

  redirect(redirectTo);
}

export async function registerAction(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const nombre = formData.get('nombre') as string;

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { nombre, role: 'ADMIN' },
    },
  });

  if (error) {
    return { error: error.message };
  }

  redirect('/dashboard');
}

export async function recoverAction(
  _previousState: RecoveryState,
  formData: FormData
): Promise<RecoveryState> {
  const parsed = recuperarSchema.safeParse({ email: formData.get('email') });
  if (!parsed.success) {
    return { error: 'Ingresá un email válido.' };
  }

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : null);
  if (!siteUrl) {
    return {
      error: 'La recuperación de contraseña todavía no está configurada.',
    };
  }

  const redirectTo = URL.canParse(siteUrl)
    ? new URL('/auth/callback?type=recovery', siteUrl)
    : null;
  if (!redirectTo || !['http:', 'https:'].includes(redirectTo.protocol)) {
    return {
      error: 'La recuperación de contraseña todavía no está configurada.',
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(
    parsed.data.email,
    {
      redirectTo: redirectTo.toString(),
    }
  );

  if (error && error.code !== 'user_not_found') {
    if (error.status === 429) {
      return {
        error: 'Esperá unos minutos antes de volver a pedir un enlace.',
      };
    }
    return {
      error: 'No se pudo solicitar el enlace. Intentá de nuevo más tarde.',
    };
  }

  return { success: true };
}

export async function restablecerContrasenaAction(
  userId: string,
  _previousState: { error: string },
  formData: FormData
) {
  const parsed = nuevaContrasenaSchema.safeParse({
    password: formData.get('password'),
    confirmPassword: formData.get('confirmPassword'),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.id !== userId) {
    redirect('/recuperar?error=enlace');
  }

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });
  if (error?.code === 'same_password') {
    return { error: 'Elegí una contraseña distinta de la anterior.' };
  }
  if (error?.code === 'weak_password') {
    return { error: 'Elegí una contraseña más segura.' };
  }
  if (error) {
    return { error: 'No se pudo guardar la contraseña. Intentá de nuevo.' };
  }

  // Supabase revoca las sesiones de la cuenta al cerrar sesión globalmente.
  const { error: signOutError } = await supabase.auth.signOut();
  if (signOutError) {
    redirect('/recuperar?estado=actualizada');
  }
  redirect('/login?estado=contrasena-actualizada');
}

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}
