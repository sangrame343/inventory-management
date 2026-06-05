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
import { WarrantyAlertsCard } from "@/components/dashboard/warranty-alerts-card";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { Building2, Sparkles } from "lucide-react";

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const companyId = (session.user as any).activeCompanyId;
  const userRole = (session.user as any).role;

  if (!companyId) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh] text-center p-6 rounded-2xl border border-dashed border-border/60 bg-muted/20">
        <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-5">
          <Building2 className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight">No Active Company Selected</h2>
        <p className="text-muted-foreground mt-2 max-w-md text-sm">
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

  const now = new Date();
  const dateString = now.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="space-y-7 animate-in fade-in duration-500">
      {/* ── Page Header ── */}
      <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-card via-card to-muted/30 p-6">
        {/* Decorative blobs */}
        <div className="absolute -top-8 -right-8 w-48 h-48 rounded-full bg-violet-500/5 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-8 -left-8 w-40 h-40 rounded-full bg-fuchsia-500/5 blur-3xl pointer-events-none" />

        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-1 w-6 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500" />
              <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Operations Center
              </span>
            </div>
            <h1 className="text-3xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground via-foreground to-foreground/60">
              Asset Dashboard
            </h1>
            <p className="text-sm text-muted-foreground max-w-lg">
              Real-time metrics, portfolio value, and operational status for your organization.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-1.5 rounded-xl border border-border/60 bg-background/60 px-4 py-2 text-xs text-muted-foreground backdrop-blur-sm">
              <Sparkles className="h-3.5 w-3.5 text-violet-500" />
              <span className="font-medium">{dateString}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Primary Metrics Grid ── */}
      <DashboardGrid stats={stats} />

      {/* ── Charts + Activity + Side Widgets ── */}
      <div className="grid gap-6 lg:grid-cols-7 lg:items-start">
        {/* Left: Charts + Activity */}
        <div className="lg:col-span-4 space-y-6">
          <DashboardCharts
            statusData={charts.statusDistribution}
            categoryData={charts.categoryDistribution}
          />
          <ActivityFeed activities={activity} />
        </div>

        {/* Right: Warranties + Quick Actions + Maintenance */}
        <div className="lg:col-span-3 flex flex-col gap-6">
          <WarrantyAlertsCard warranties={stats.warranties} />
          <QuickActions role={userRole} />
          <UpcomingMaintenanceCard schedules={stats.upcomingSchedules} />
        </div>
      </div>
    </div>
  );
}
