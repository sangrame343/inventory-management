"use client";

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { TrendingUp, LayoutGrid, ExternalLink, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback } from "react";

// Vibrant, distinct color palette
const PALETTE = [
  "#6366f1", // indigo
  "#10b981", // emerald
  "#f59e0b", // amber
  "#ec4899", // pink
  "#14b8a6", // teal
  "#8b5cf6", // violet
  "#f97316", // orange
  "#06b6d4", // cyan
  "#84cc16", // lime
  "#ef4444", // red
];

// Status → URL param mapping
const STATUS_URL: Record<string, string> = {
  ACTIVE: "ACTIVE",
  ASSIGNED: "ASSIGNED",
  REPAIR: "REPAIR",
  DISPOSED: "DISPOSED",
  LOST: "LOST",
};

// Status → human-readable label
const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Active",
  ASSIGNED: "Assigned",
  REPAIR: "In Repair",
  DISPOSED: "Disposed",
  LOST: "Lost",
};

interface DashboardChartsProps {
  statusData: { name: string; value: number }[];
  categoryData: { id: string; name: string; value: number }[];
}

// ── Status Donut Tooltip ──────────────────────────────────────────────────────

function StatusTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  return (
    <div className="rounded-xl border border-border bg-card px-3 py-2 shadow-lg text-xs">
      <div className="flex items-center gap-1.5 mb-1">
        <span
          className="inline-block h-2 w-2 rounded-full"
          style={{ background: item.payload.fill }}
        />
        <p className="font-semibold text-foreground">
          {STATUS_LABEL[item.name] ?? item.name}
        </p>
      </div>
      <p className="text-muted-foreground">
        <span className="font-bold text-foreground">{item.value}</span> assets
      </p>
      <p className="text-[10px] text-primary mt-1 flex items-center gap-1">
        <ExternalLink className="h-2.5 w-2.5" /> Click to view assets
      </p>
    </div>
  );
}

// ── Status Legend Button ──────────────────────────────────────────────────────

function StatusLegendItem({
  color,
  label,
  value,
  pct,
  onClick,
}: {
  color: string;
  label: string;
  value: number;
  pct: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between gap-3 py-1.5 px-2 rounded-lg hover:bg-muted/60 transition-colors group cursor-pointer text-left"
    >
      <div className="flex items-center gap-2 min-w-0">
        <span
          className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ background: color }}
        />
        <span className="text-xs text-muted-foreground truncate group-hover:text-foreground transition-colors">
          {label}
        </span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-xs font-bold tabular-nums">{value}</span>
        <span className="text-[10px] text-muted-foreground/60 font-medium w-8 text-right">
          {pct}%
        </span>
        <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-40 transition-opacity text-muted-foreground" />
      </div>
    </button>
  );
}

// ── Category Ranked Row ────────────────────────────────────────────────────────

function CategoryRow({
  rank,
  color,
  name,
  value,
  pct,
  onClick,
}: {
  rank: number;
  color: string;
  name: string;
  value: number;
  pct: number;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full group flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted/50 transition-all duration-150 cursor-pointer text-left"
    >
      {/* Rank badge */}
      <span
        className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black text-white"
        style={{ background: color }}
      >
        {rank}
      </span>

      {/* Name + progress bar */}
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold truncate group-hover:text-foreground transition-colors">
            {name}
          </span>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-black tabular-nums">{value}</span>
            <span className="text-[10px] text-muted-foreground/60 w-7 text-right tabular-nums">
              {pct.toFixed(0)}%
            </span>
          </div>
        </div>
        {/* Progress track */}
        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${pct}%`, background: color }}
          />
        </div>
      </div>

      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-60 transition-opacity shrink-0" />
    </button>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export function DashboardCharts({ statusData, categoryData }: DashboardChartsProps) {
  const router = useRouter();

  const hasStatusData = statusData.length > 0;
  const hasCategoryData = categoryData.length > 0;
  const statusTotal = statusData.reduce((s, d) => s + d.value, 0);

  const sortedCategories = [...categoryData]
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  const catTotal = sortedCategories.reduce((s, c) => s + c.value, 0);

  const goToStatus = useCallback(
    (statusName: string) => {
      router.push(`/assets?status=${STATUS_URL[statusName] ?? statusName}`);
    },
    [router]
  );

  const goToCategory = useCallback(
    (categoryId: string) => {
      router.push(`/assets?categoryId=${categoryId}`);
    },
    [router]
  );

  const handlePieClick = useCallback(
    (data: any) => {
      if (data?.name) goToStatus(data.name);
    },
    [goToStatus]
  );

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* ── Asset Status ─────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-border/60 bg-card overflow-hidden">
        <div className="flex items-center gap-3 px-5 pt-5 pb-4 border-b border-border/40">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-500/10">
            <TrendingUp className="h-4 w-4 text-indigo-500" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold">Asset Status</p>
            <p className="text-[11px] text-muted-foreground">
              Click a segment or row to filter assets
            </p>
          </div>
        </div>

        <div className="px-5 py-4">
          {hasStatusData ? (
            <div className="flex gap-3 items-start">
              {/* Donut */}
              <div className="w-[150px] h-[150px] shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={48}
                      outerRadius={68}
                      paddingAngle={3}
                      dataKey="value"
                      startAngle={90}
                      endAngle={-270}
                      onClick={handlePieClick}
                      cursor="pointer"
                    >
                      {statusData.map((_, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={PALETTE[index % PALETTE.length]}
                          stroke="transparent"
                          className="hover:opacity-80 transition-opacity"
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<StatusTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Legend buttons */}
              <div className="flex-1 min-w-0 space-y-0.5 -mx-2">
                {statusData.map((item, index) => (
                  <StatusLegendItem
                    key={item.name}
                    color={PALETTE[index % PALETTE.length]}
                    label={STATUS_LABEL[item.name] ?? item.name}
                    value={item.value}
                    pct={statusTotal > 0 ? ((item.value / statusTotal) * 100).toFixed(0) : "0"}
                    onClick={() => goToStatus(item.name)}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-[150px] text-muted-foreground text-sm gap-2">
              <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 opacity-30" />
              </div>
              <p>No status data available</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Assets by Category ───────────────────────────────────────── */}
      <div className="rounded-2xl border border-border/60 bg-card overflow-hidden">
        <div className="flex items-center gap-3 px-5 pt-5 pb-4 border-b border-border/40">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-fuchsia-500/10">
            <LayoutGrid className="h-4 w-4 text-fuchsia-500" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold">Assets by Category</p>
            <p className="text-[11px] text-muted-foreground">
              Click any row to view assets in that category
            </p>
          </div>
        </div>

        <div className="px-3 py-3">
          {hasCategoryData ? (
            <div className="space-y-0.5">
              {sortedCategories.map((item, index) => (
                <CategoryRow
                  key={item.id}
                  rank={index + 1}
                  color={PALETTE[index % PALETTE.length]}
                  name={item.name}
                  value={item.value}
                  pct={catTotal > 0 ? (item.value / catTotal) * 100 : 0}
                  onClick={() => goToCategory(item.id)}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-[220px] text-muted-foreground text-sm gap-2">
              <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center">
                <LayoutGrid className="h-5 w-5 opacity-30" />
              </div>
              <p>No category data available</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
