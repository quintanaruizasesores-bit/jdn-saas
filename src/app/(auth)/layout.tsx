import Image from 'next/image';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10 sm:p-6">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto w-fit rounded-3xl bg-white px-6 py-3">
            <Image
              src="/brand/quintana-ruiz/logo.png"
              alt="Quintana Ruiz Asesores de Seguros"
              width={971}
              height={550}
              priority
              unoptimized
              className="h-auto w-[230px] max-w-full"
            />
          </div>
          <p className="text-ink-dim mt-4 text-sm">
            Gestión de cartera de seguros
          </p>
        </div>
        <div className="border-line bg-panel rounded-3xl border p-6 shadow-lg sm:p-8">
          {children}
        </div>
      </div>
    </div>
  );
}
