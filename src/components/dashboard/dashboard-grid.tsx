import { StatCard, StatItem } from "./stat-card";
import { Package, Users, Activity, Hammer, ArrowRightLeft, Boxes, IndianRupee } from "lucide-react";

interface DashboardGridProps {
  stats: any;
}

function formatCurrency(value: number): string {
  if (value >= 10_000_000) {
    return `₹${(value / 10_000_000).toFixed(2)}Cr`;
  }
  if (value >= 100_000) {
    return `₹${(value / 100_000).toFixed(2)}L`;
  }
  if (value >= 1_000) {
    return `₹${(value / 1_000).toFixed(1)}K`;
  }
  return `₹${value.toLocaleString("en-IN")}`;
}

export function DashboardGrid({ stats }: DashboardGridProps) {
  const totalCost = stats.assets.totalCost ?? 0;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-6">
      {/* Total Asset Value — hero card */}
      <div className="sm:col-span-2 lg:col-span-3 xl:col-span-3 2xl:col-span-2">
        <StatCard
          title="Portfolio Value"
          icon={IndianRupee}
          href="/assets"
          mainValue={formatCurrency(totalCost)}
          mainLabel="Total purchase cost of all assets"
          accentColor="from-violet-500 via-fuchsia-500 to-pink-500"
          glowColor="bg-violet-500"
          iconBg="bg-violet-500/10"
          iconColor="text-violet-500"
        >
          <StatItem label="Active Assets" value={stats.assets.active} />
          <StatItem label="Assigned Assets" value={stats.assets.assigned} />
          <StatItem label="In Repair" value={stats.assets.repair} />
          <StatItem
            label="Disposed / Lost"
            value={stats.assets.disposed}
            className={stats.assets.disposed > 0 ? "text-rose-500" : ""}
          />
        </StatCard>
      </div>

      {/* Employees */}
      <StatCard
        title="Employees"
        icon={Users}
        href="/employees"
        mainValue={stats.employees.total}
        mainLabel="Company workforce"
        accentColor="from-emerald-400 to-teal-500"
        glowColor="bg-emerald-500"
        iconBg="bg-emerald-500/10"
        iconColor="text-emerald-500"
      >
        <StatItem label="Active" value={stats.employees.active} />
        <StatItem label="With Assets" value={stats.employees.withAssets} />
      </StatCard>

      {/* Maintenance */}
      <StatCard
        title="Maintenance"
        icon={Hammer}
        href="/maintenance"
        mainValue={stats.maintenance.open}
        mainLabel="Open tickets"
        accentColor="from-amber-400 to-orange-500"
        glowColor="bg-amber-500"
        iconBg="bg-amber-500/10"
        iconColor="text-amber-500"
      >
        <StatItem label="In Progress" value={stats.maintenance.inProgress} />
        <StatItem
          label="Critical / High"
          value={stats.maintenance.critical}
          className={stats.maintenance.critical > 0 ? "text-rose-500 font-black" : ""}
        />
        <StatItem
          label="Overdue"
          value={stats.maintenance.overdue}
          className={stats.maintenance.overdue > 0 ? "text-rose-600 font-black" : ""}
        />
        <StatItem label="Upcoming" value={stats.maintenance.upcoming} />
      </StatCard>

      {/* Inventory */}
      <StatCard
        title="Inventory"
        icon={Boxes}
        href="/inventory"
        mainValue={stats.inventory.total}
        mainLabel="Consumables & Parts"
        accentColor="from-purple-400 to-violet-600"
        glowColor="bg-purple-500"
        iconBg="bg-purple-500/10"
        iconColor="text-purple-500"
      >
        <StatItem
          label="Low Stock"
          value={stats.inventory.lowStock}
          className={
            stats.inventory.lowStock > 0 ? "text-rose-500 font-black animate-pulse" : ""
          }
        />
        <StatItem label="Inactive" value={stats.inventory.inactive} />
      </StatCard>

      {/* Transfers */}
      <StatCard
        title="Transfers"
        icon={ArrowRightLeft}
        href="/transfers"
        mainValue={stats.transfers.pending}
        mainLabel="Pending requests"
        accentColor="from-sky-400 to-blue-500"
        glowColor="bg-sky-500"
        iconBg="bg-sky-500/10"
        iconColor="text-sky-500"
      >
        <StatItem label="In-Transit" value={stats.transfers.inTransit} />
        <StatItem label="Completed (Mo)" value={stats.transfers.completedThisMonth} />
      </StatCard>
    </div>
  );
}
