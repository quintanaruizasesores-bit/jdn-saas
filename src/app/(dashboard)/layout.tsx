import { NewClientShortcut } from '@/components/dashboard/new-client-shortcut';
import { AppSidebar } from '@/components/dashboard/app-sidebar';
import { MobileNav } from '@/components/dashboard/mobile-nav';
import { RenewalAlertsBanner } from '@/components/dashboard/renewal-alerts-banner';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex min-h-screen max-w-[1500px]">
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <main className="flex-1 px-4 py-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] sm:px-6 sm:py-6 md:pb-24 lg:px-8">
          <RenewalAlertsBanner />
          {children}
        </main>
      </div>
      <NewClientShortcut />
      <MobileNav />
    </div>
  );
}
