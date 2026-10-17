import * as React from 'react';
import { cn } from '@/lib/utils';

function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        'border-line bg-panel font-body text-ink placeholder:text-ink-faint focus:border-primary focus:ring-primary/10 aria-invalid:border-red flex min-h-30 w-full resize-y rounded-xl border-[1.5px] px-3 py-3 text-sm transition-colors outline-none focus:ring-4 disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    />
  );
}

export { Textarea };
