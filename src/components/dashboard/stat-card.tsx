import { cn } from "@/lib/utils";
import Link from "next/link";
import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";

interface StatItemProps {
  label: string;
  value: number | string;
  className?: string;
}

export function StatItem({ label, value, className }: StatItemProps) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={cn("text-xs font-bold tabular-nums", className)}>{value}</span>
    </div>
  );
}

interface StatCardProps {
  title: string;
  icon: LucideIcon;
  href?: string;
  mainValue: number | string;
  mainLabel: string;
  children?: React.ReactNode;
  trend?: {
    value: number;
    isUp: boolean;
  };
  accentColor?: string;
  glowColor?: string;
  iconBg?: string;
  iconColor?: string;
  gradientFrom?: string;
  gradientTo?: string;
}

export function StatCard({
  title,
  icon: Icon,
  href,
  mainValue,
  mainLabel,
  children,
  trend,
  accentColor = "from-blue-500 to-cyan-400",
  glowColor = "bg-blue-500",
  iconBg = "bg-blue-500/10",
  iconColor = "text-blue-500",
}: StatCardProps) {
  const CardWrapper = href ? Link : "div";

  return (
    <CardWrapper
      href={href as any}
      className={cn(
        "group relative overflow-hidden rounded-2xl transition-all duration-300",
        "bg-card border border-border/60",
        "hover:shadow-xl hover:-translate-y-0.5",
        href && "cursor-pointer"
      )}
    >
      {/* Top gradient accent bar */}
      <div className={cn("absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r opacity-80", accentColor)} />

      {/* Glow blob */}
      <div
        className={cn(
          "absolute -right-6 -top-6 h-24 w-24 rounded-full blur-2xl opacity-[0.07] transition-opacity duration-300 group-hover:opacity-[0.15]",
          glowColor
        )}
      />

      <div className="relative p-5">
        {/* Header row */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/70">
            {title}
          </span>
          <div
            className={cn(
              "flex items-center justify-center w-9 h-9 rounded-xl transition-transform duration-200 group-hover:scale-110",
              iconBg
            )}
          >
            <Icon className={cn("h-4 w-4", iconColor)} />
          </div>
        </div>

        {/* Main metric */}
        <div className="mb-1">
          <span className="text-3xl font-black tracking-tight tabular-nums">{mainValue}</span>
        </div>
        <p className="text-xs text-muted-foreground mb-4">{mainLabel}</p>

        {/* Trend badge */}
        {trend && (
          <div
            className={cn(
              "inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full mb-3",
              trend.isUp
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
            )}
          >
            {trend.isUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {trend.value}% vs last month
          </div>
        )}

        {/* Sub-items */}
        {children && (
          <div className="pt-3 border-t border-border/50 space-y-0.5">{children}</div>
        )}
      </div>
    </CardWrapper>
  );
}
