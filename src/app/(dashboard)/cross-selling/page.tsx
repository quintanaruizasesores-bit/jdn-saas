import { Suspense } from 'react';
import { CrossSellingModule } from '@/features/crosssell/crosssell-module';

export const dynamic = 'force-dynamic';

export default function CrossSellingPage() {
  return (
    <Suspense fallback={null}>
      <CrossSellingModule />
    </Suspense>
  );
}
