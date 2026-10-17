import { AppSidebar } from '@/components/dashboard/app-sidebar';
import { RenewalAlertsBanner } from '@/components/dashboard/renewal-alerts-banner';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen max-w-[1500px] mx-auto">
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <main className="flex-1 px-4 py-6 pb-20 sm:px-6 lg:px-8">
          <RenewalAlertsBanner />
          {children}
        </main>
      </div>
    </div>
  );
}
