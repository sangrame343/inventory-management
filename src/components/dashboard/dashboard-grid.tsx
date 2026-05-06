import { StatCard, StatItem } from "./stat-card";
import { Package, Users, Activity, Hammer, ArrowRightLeft, Boxes } from "lucide-react";

interface DashboardGridProps {
  stats: any; // Using dynamic type for brevity, but could use Prisma types
}

export function DashboardGrid({ stats }: DashboardGridProps) {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {/* Assets Card */}
      <StatCard
        title="Assets"
        icon={Package}
        href="/assets"
        mainValue={stats.assets.total}
        mainLabel="Total items in catalog"
        colorClassName="text-blue-500 bg-blue-50/50 dark:bg-blue-950/20"
      >
        <StatItem label="Active" value={stats.assets.active} />
        <StatItem label="Assigned" value={stats.assets.assigned} />
        <StatItem label="In Repair" value={stats.assets.repair} />
        <StatItem label="Disposed/Lost" value={stats.assets.disposed} />
      </StatCard>

      {/* Employees Card */}
      <StatCard
        title="Employees"
        icon={Users}
        href="/employees"
        mainValue={stats.employees.total}
        mainLabel="Company workforce"
        colorClassName="text-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20"
      >
        <StatItem label="Active" value={stats.employees.active} />
        <StatItem label="With Assets" value={stats.employees.withAssets} />
      </StatCard>

      {/* Maintenance Card */}
      <StatCard
        title="Maintenance"
        icon={Hammer}
        href="/maintenance"
        mainValue={stats.maintenance.open}
        mainLabel="Open tickets"
        colorClassName="text-amber-500 bg-amber-50/50 dark:bg-amber-950/20"
      >
        <StatItem label="In Progress" value={stats.maintenance.inProgress} />
        <StatItem label="Critical/High" value={stats.maintenance.critical} className="text-rose-500 font-bold" />
        <StatItem label="Overdue" value={stats.maintenance.overdue} className="text-rose-600 underline decoration-dotted" />
        <StatItem label="Upcoming" value={stats.maintenance.upcoming} />
      </StatCard>

      {/* Inventory Card */}
      <StatCard
        title="Inventory"
        icon={Boxes}
        href="/inventory"
        mainValue={stats.inventory.total}
        mainLabel="Consumables & Parts"
        colorClassName="text-purple-500 bg-purple-50/50 dark:bg-purple-950/20"
      >
        <StatItem label="Low Stock" value={stats.inventory.lowStock} className={stats.inventory.lowStock > 0 ? "text-rose-500 font-bold animate-pulse" : ""} />
        <StatItem label="Inactive" value={stats.inventory.inactive} />
      </StatCard>

      {/* Transfers Card */}
      <StatCard
        title="Transfers"
        icon={ArrowRightLeft}
        href="/transfers"
        mainValue={stats.transfers.pending}
        mainLabel="Pending requests"
        colorClassName="text-slate-500 bg-slate-50/50 dark:bg-slate-950/20"
      >
        <StatItem label="In-Transit" value={stats.transfers.inTransit} />
        <StatItem label="Completed (Mo)" value={stats.transfers.completedThisMonth} />
      </StatCard>
    </div>
  );
}
