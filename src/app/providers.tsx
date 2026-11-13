'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Toaster } from 'sonner';
import { createClient } from '@/lib/supabase/client';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: 1,
          },
        },
      })
  );

  useEffect(() => {
    const supabase = createClient();
    let previousUserId: string | null | undefined;
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        const currentUserId = session?.user.id ?? null;
        if (previousUserId !== undefined && previousUserId !== currentUserId) {
          queryClient.clear();
        }
        if (event === 'SIGNED_OUT') queryClient.clear();
        previousUserId = currentUserId;
      }
    );
    return () => subscription.unsubscribe();
  }, [queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster
        theme="light"
        position="bottom-center"
        toastOptions={{
          style: {
            background: 'var(--panel)',
            border: '1px solid var(--line)',
            color: 'var(--ink)',
            fontFamily: 'var(--font-body)',
          },
        }}
      />
    </QueryClientProvider>
  );
}
