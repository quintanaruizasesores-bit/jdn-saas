export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <p className="font-serif text-xl italic text-ink-dim">{title}</p>
      {description && (
        <p className="mt-2 max-w-md text-sm text-ink-faint">{description}</p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
