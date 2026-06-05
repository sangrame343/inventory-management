import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { Role } from "@prisma/client";

// ✅ FIXED: named import instead of default
import CompanySwitcherWrapper from "@/components/company-switcher-wrapper";
import { ModeToggle } from "@/components/mode-toggle";
import { DynamicHeader } from "@/components/dynamic-header";

import NextAuthSessionProvider from "@/components/providers/session-provider";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  // Determine if the current user is a SUPER_ADMIN (has at least one CompanyUser entry with that role)
  const isSuperAdmin = await db.companyUser.findFirst({
    where: { userId: session.user.id, role: Role.SUPER_ADMIN },
  }).then((r) => !!r);

  const companies = isSuperAdmin
    ? // Super admin sees every company
      await db.company.findMany({ select: { id: true, name: true } })
    : // Regular tenant isolation (current logic)
      await db.company.findMany({
        where: {
          OR: [
            { id: session.user.activeCompanyId || undefined },
            { users: { some: { userId: session.user.id } } },
          ],
        },
        select: { id: true, name: true },
      });
  console.log('DashboardLayout companies:', companies);
  console.log('Session user:', session.user);

  return (
    <NextAuthSessionProvider>
      <SidebarProvider>
        <AppSidebar />

        <div className="flex flex-1 flex-col overflow-hidden">
          <header className="flex h-16 shrink-0 items-center justify-between gap-2 border-b border-border/40 px-6 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 bg-background/80 backdrop-blur-md sticky top-0 z-50">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="-ml-1 hover:bg-muted/60 transition-colors" />
              <div className="h-4 w-[1px] bg-border/60" />
              <DynamicHeader />
            </div>

            <div className="flex items-center gap-4">
              <ModeToggle />
              <CompanySwitcherWrapper
                companies={companies}
                activeCompanyId={session.user.activeCompanyId}
              />
            </div>
          </header>

          <main className="flex-1 overflow-y-auto p-6 bg-muted/20">
            {children}
          </main>
        </div>
      </SidebarProvider>
    </NextAuthSessionProvider>
  );
}
