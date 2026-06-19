"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format, formatDistanceToNow, isPast, isToday } from "date-fns";
import {
  Clock,
  ShieldAlert,
  AlertTriangle,
  ExternalLink,
  ChevronRight,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";

interface WarrantyAlertsCardProps {
  warranties: {
    expired: number;
    expiringThisMonth: number;
    expiringThisYear: number;
    expiringAssets: Array<{
      id: string;
      name: string;
      assetTag: string;
      warrantyExpiration: string | Date;
    }>;
  };
}

export function WarrantyAlertsCard({ warranties }: WarrantyAlertsCardProps) {
  const expiringAssets = warranties.expiringAssets || [];

  return (
    <Card className="border-none bg-background/50 backdrop-blur-sm shadow-sm ring-1 ring-border/50 h-full flex flex-col overflow-hidden">
      <CardHeader className="pb-3 border-b border-border/30 bg-muted/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-red-500/10 rounded-lg">
              <ShieldAlert className="h-5 w-5 text-red-500" />
            </div>
            <div>
              <CardTitle className="text-lg font-bold tracking-tight">
                Warranty Alerts
              </CardTitle>
              <p className="text-xs text-muted-foreground font-medium">
                Monitoring asset expirations
              </p>
            </div>
          </div>
          <Badge
            variant="secondary"
            className="font-bold text-[10px] h-6 px-2 bg-red-500/10 text-red-600 border-red-500/20"
          >
            {warranties.expired + warranties.expiringThisMonth} URGENT
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="flex-1 min-h-[400px] overflow-y-auto px-4 pt-4 scrollbar-thin scrollbar-thumb-border/50">
        {/* Overall Statistics Bar */}
        <div className="grid grid-cols-3 gap-2 mb-4 p-2 rounded-xl bg-muted/30 border border-border/40 text-center">
          <div>
            <div className="text-sm font-black text-rose-500">
              {warranties.expired}
            </div>
            <div className="text-[10px] text-muted-foreground font-medium">
              Expired
            </div>
          </div>
          <div className="border-x border-border/60">
            <div className="text-sm font-black text-amber-500">
              {warranties.expiringThisMonth}
            </div>
            <div className="text-[10px] text-muted-foreground font-medium">
              This Month
            </div>
          </div>
          <div>
            <div className="text-sm font-black text-blue-500">
              {warranties.expiringThisYear}
            </div>
            <div className="text-[10px] text-muted-foreground font-medium">
              This Year
            </div>
          </div>
        </div>

        {expiringAssets.length > 0 ?
          <div className="flex flex-col">
            {expiringAssets.map((asset) => {
              const expiryDate = new Date(asset.warrantyExpiration);
              const isExpired = isPast(expiryDate) && !isToday(expiryDate);
              const expiresToday = isToday(expiryDate);
              const daysToExpiry = Math.ceil(
                (expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
              );
              const isCritical = daysToExpiry > 0 && daysToExpiry <= 30;

              return (
                <div
                  key={asset.id}
                  className={cn(
                    "flex flex-col gap-2 p-3.5 rounded-xl border border-border/50 bg-background/50 hover:bg-muted/30 transition-all duration-200 group mb-3",
                    isExpired ?
                      "ring-1 ring-red-500/10 shadow-sm border-red-500/20"
                    : isCritical ?
                      "ring-1 ring-orange-500/10 border-orange-500/20"
                    : "",
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-col min-w-0">
                      <Link
                        href={`/assets/${asset.id}`}
                        className="text-sm font-bold text-foreground group-hover:text-primary transition-colors flex items-center gap-1 hover:underline underline-offset-2"
                      >
                        <span className="truncate">{asset.name}</span>
                        <ExternalLink className="h-3 w-3 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </Link>
                      <span className="text-[10px] text-muted-foreground font-mono mt-0.5">
                        Tag: {asset.assetTag}
                      </span>
                    </div>

                    {isExpired ?
                      <Badge
                        variant="destructive"
                        className="text-[9px] uppercase font-black tracking-tight px-1.5 h-5 shadow-sm shrink-0 bg-rose-600 text-white"
                      >
                        Expired
                      </Badge>
                    : expiresToday ?
                      <Badge
                        variant="outline"
                        className="text-[9px] uppercase font-black tracking-tight px-1.5 h-5 text-amber-600 bg-amber-500/10 border-amber-500/30 shrink-0"
                      >
                        Expires Today
                      </Badge>
                    : isCritical ?
                      <Badge
                        variant="outline"
                        className="text-[9px] uppercase font-bold tracking-tight px-1.5 h-5 text-orange-600 bg-orange-500/10 border-orange-500/30 shrink-0"
                      >
                        Expiring Soon
                      </Badge>
                    : <Badge
                        variant="outline"
                        className="text-[9px] uppercase font-bold tracking-tight px-1.5 h-5 text-emerald-600 bg-emerald-500/10 border-emerald-500/30 shrink-0"
                      >
                        Active
                      </Badge>
                    }
                  </div>

                  <div className="flex items-center justify-between mt-1 text-[10px] font-bold">
                    <div
                      className={cn(
                        "flex items-center gap-1.5",
                        isExpired ? "text-red-500"
                        : isCritical ? "text-orange-500"
                        : "text-muted-foreground",
                      )}
                    >
                      <Clock className="h-3.5 w-3.5" />
                      <span>
                        {format(expiryDate, "MMM d, yyyy")} (
                        {formatDistanceToNow(expiryDate, { addSuffix: true })})
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}

            <div className="mt-2 mb-6">
              <Link
                href="/assets"
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                  "w-full text-xs font-bold gap-2 group h-9",
                )}
              >
                View All Assets
                <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
          </div>
        : <div className="flex flex-col items-center justify-center h-full py-20 text-muted-foreground gap-4 text-center">
            <div className="p-5 bg-muted/30 rounded-full">
              <CheckCircle2 className="h-10 w-10 text-emerald-500/40" />
            </div>
            <div>
              <p className="text-sm font-bold">All Secure</p>
              <p className="text-xs opacity-60 max-w-[180px] mx-auto mt-1">
                No upcoming warranty expirations found.
              </p>
            </div>
          </div>
        }
      </CardContent>
    </Card>
  );
}
