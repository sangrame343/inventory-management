import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { LucideIcon } from "lucide-react";

interface StatItemProps {
  label: string;
  value: number | string;
  className?: string;
}

export function StatItem({ label, value, className }: StatItemProps) {
  return (
    <div className={cn("flex items-center justify-between py-1.5", className)}>
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-semibold">{value}</span>
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
  colorClassName?: string;
}

export function StatCard({
  title,
  icon: Icon,
  href,
  mainValue,
  mainLabel,
  children,
  colorClassName,
}: StatCardProps) {
  const CardWrapper = href ? Link : "div";

  return (
    <CardWrapper
      href={href as any}
      className={cn(
        "group relative overflow-hidden transition-all hover:shadow-lg",
        href && "cursor-pointer"
      )}
    >
      <Card className="h-full border-none bg-background/50 backdrop-blur-sm shadow-sm ring-1 ring-border/50">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {title}
          </CardTitle>
          <div className={cn("rounded-md p-2 ring-1 ring-border/50 bg-background shadow-xs", colorClassName)}>
            <Icon className="h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col space-y-1">
            <span className="text-3xl font-bold tracking-tight">{mainValue}</span>
            <p className="text-xs text-muted-foreground">{mainLabel}</p>
          </div>
          {children && <div className="mt-4 pt-4 border-t border-border/50 space-y-1">{children}</div>}
        </CardContent>
      </Card>
      
      {/* Decorative gradient blur */}
      <div className={cn(
        "absolute -right-4 -top-4 h-24 w-24 rounded-full blur-3xl opacity-10 transition-opacity group-hover:opacity-20",
        colorClassName?.includes("blue") && "bg-blue-500",
        colorClassName?.includes("emerald") && "bg-emerald-500",
        colorClassName?.includes("amber") && "bg-amber-500",
        colorClassName?.includes("rose") && "bg-rose-500",
        colorClassName?.includes("purple") && "bg-purple-500",
      )} />
    </CardWrapper>
  );
}
