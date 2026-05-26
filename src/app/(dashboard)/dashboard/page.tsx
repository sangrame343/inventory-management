import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { 
  getDashboardStats, 
  getDashboardCharts, 
  getRecentActivity 
} from "@/lib/services/dashboard-service";
import { DashboardGrid } from "@/components/dashboard/dashboard-grid";
import { DashboardCharts } from "@/components/dashboard/dashboard-charts";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { UpcomingMaintenanceCard } from "@/components/dashboard/upcoming-maintenance-card";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { Separator } from "@/components/ui/separator";

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const companyId = (session.user as any).activeCompanyId;
  const userRole = (session.user as any).role;

  if (!companyId) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh] text-center p-6 bg-background rounded-xl border border-dashed">
        <div className="bg-primary/10 p-4 rounded-full mb-4">
          <svg className="w-12 h-12 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold tracking-tight">No Active Company Selected</h2>
        <p className="text-muted-foreground mt-2 max-w-md">
          Please select a company from the switcher in the header to view your operations dashboard.
        </p>
      </div>
    );
  }

  // Fetch all dashboard data in parallel for high performance
  const [stats, charts, activity] = await Promise.all([
    getDashboardStats(companyId),
    getDashboardCharts(companyId),
    getRecentActivity(companyId, 10),
  ]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-1">
        <h2 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-linear-to-r from-foreground to-foreground/70">
          Operations Dashboard
        </h2>
        <p className="text-muted-foreground text-sm">
          Real-time metrics and operational status for your active organization.
        </p>
      </div>

      <Separator className="bg-border/50" />
      
      {/* Primary Metrics Grid */}
      <DashboardGrid stats={stats} />

      <div className="grid gap-6 lg:grid-cols-7 lg:items-stretch">
        {/* Visual Analytics */}
        <div className="lg:col-span-4 space-y-6">
           <DashboardCharts 
             statusData={charts.statusDistribution} 
             categoryData={charts.categoryDistribution} 
           />
           <ActivityFeed activities={activity} />
        </div>

        {/* Secondary Widgets & Actions */}
        <div className="lg:col-span-3 h-full flex flex-col gap-6">
           <QuickActions role={userRole} />
           <div className="flex-1">
             <UpcomingMaintenanceCard schedules={stats.upcomingSchedules} />
           </div>
        </div>
      </div>
    </div>
  );
}
