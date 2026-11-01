'use client';

import { useRef } from 'react';
import { CalendarDays } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  displayDate,
  isIsoDate,
  parseDisplayDate,
} from '@/lib/polizas/fecha-input';

function typingDate(value: string): string {
  if (isIsoDate(value)) return displayDate(value);
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

export function PolizaDateField({
  id,
  label,
  value,
  onChange,
  onBlur,
  error,
  hint,
}: {
  id: string;
  label: string;
  value: string | null | undefined;
  onChange: (value: string) => void;
  onBlur?: () => void;
  error?: string;
  hint?: string;
}) {
  const pickerRef = useRef<HTMLInputElement>(null);

  return (
    <div className="min-w-0">
      <Label htmlFor={id} className="text-ink-dim text-xs font-medium">
        {label}
      </Label>
      <div className="relative mt-1">
        <Input
          id={id}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder="DD/MM/AAAA"
          maxLength={10}
          value={displayDate(value)}
          onChange={(event) =>
            onChange(parseDisplayDate(typingDate(event.target.value)))
          }
          onBlur={onBlur}
          aria-invalid={!!error}
          aria-describedby={
            error ? `${id}-error` : hint ? `${id}-hint` : undefined
          }
          className="border-line bg-bg h-10 pr-11 tabular-nums"
        />
        <button
          type="button"
          aria-label={`Elegir ${label.toLowerCase()}`}
          onClick={() => {
            const picker = pickerRef.current;
            if (!picker) return;
            try {
              if (typeof picker.showPicker === 'function') picker.showPicker();
              else picker.click();
            } catch {
              picker.click();
            }
          }}
          className="text-ink-dim hover:text-primary focus-visible:ring-primary/30 absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-xl focus-visible:ring-2 focus-visible:outline-none"
        >
          <CalendarDays aria-hidden="true" className="h-4 w-4" />
        </button>
        <input
          ref={pickerRef}
          type="date"
          tabIndex={-1}
          aria-hidden="true"
          value={isIsoDate(value ?? '') ? (value ?? '') : ''}
          onChange={(event) => onChange(event.target.value)}
          className="pointer-events-none absolute right-0 bottom-0 h-10 w-10 opacity-0"
        />
      </div>
      {hint && !error && (
        <p id={`${id}-hint`} className="text-ink-faint mt-1 text-xs">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="text-red mt-1 text-xs">
          {error}
        </p>
      )}
    </div>
  );
}
