export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="font-serif text-3xl font-semibold tracking-tight">
            Cartera <em className="text-amber not-italic">JDN</em>
          </h1>
          <p className="mt-2 text-[11px] uppercase tracking-[0.2em] text-ink-faint">
            Gestión de cartera de seguros
          </p>
        </div>
        <div className="rounded-[5px] border border-line bg-panel p-8">{children}</div>
      </div>
    </div>
  );
}
