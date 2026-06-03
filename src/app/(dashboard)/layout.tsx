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
        <main className="flex-1 px-6 py-7 pb-20">
          <RenewalAlertsBanner />
          {children}
        </main>
      </div>
    </div>
  );
}
