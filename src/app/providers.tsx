'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { Toaster } from 'sonner';

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
