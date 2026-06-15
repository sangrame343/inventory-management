"use client";

import React, { useState } from "react";

import { format } from "date-fns";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { AcknowledgementActionsClient } from "@/components/assets/acknowledgement-actions-client";
import {
  Tag,
  CheckCircle2,
  Clock,
  AlertCircle,
  CalendarDays,
  User2,
  ShieldCheck,
  ChevronRight,
  Hash,
  Building2,
  FileCheck2,
} from "lucide-react";

// ─── Serialisable item shape passed from the server page ───────────────────
export interface AcknowledgementRowItem {
  id: string;
  assignmentId: string;
  status: "PENDING" | "ACKNOWLEDGED" | "EXPIRED" | "ARCHIVED" | "DELETED";
  assetNameSnapshot: string | null;
  assetTagSnapshot: string | null;
  assetCodeSnapshot: string | null;
  conditionSnapshot: string | null;
  assigneeNameSnapshot: string | null;
  assignedDateSnapshot: string; // ISO string
  acknowledgedByName: string | null;
  representativeName: string | null;
  usedAt: string | null; // ISO string
  pdfReceiptPath: string | null;
  createdAt: string; // ISO string
  // from include
  departmentName: string | null;
  assigneeType: "employee" | "department";
}

// ─── Config maps ───────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  PENDING: {
    label: "Pending",
    dot: "bg-amber-400",
    badge: "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800/50",
    accent: "border-l-amber-400/70",
    bannerBg: "bg-amber-50/60 dark:bg-amber-950/20 border-amber-200/60 dark:border-amber-800/30",
    bannerText: "text-amber-700 dark:text-amber-300",
    bannerIcon: Clock,
    bannerMsg: "Awaiting employee sign-off",
  },
  ACKNOWLEDGED: {
    label: "Acknowledged",
    dot: "bg-emerald-400",
    badge: "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800/50",
    accent: "border-l-emerald-500/70",
    bannerBg: "bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200/60 dark:border-emerald-800/30",
    bannerText: "text-emerald-700 dark:text-emerald-300",
    bannerIcon: CheckCircle2,
    bannerMsg: "",
  },
  EXPIRED: {
    label: "Expired",
    dot: "bg-rose-400",
    badge: "bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/30 dark:text-rose-300 dark:border-rose-800/50",
    accent: "border-l-rose-400/70",
    bannerBg: "bg-rose-50/60 dark:bg-rose-950/20 border-rose-200/60 dark:border-rose-800/30",
    bannerText: "text-rose-700 dark:text-rose-300",
    bannerIcon: AlertCircle,
    bannerMsg: "Link expired — regenerate to re-send",
  },
  ARCHIVED: {
    label: "Archived",
    dot: "bg-slate-400",
    badge: "bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
    accent: "border-l-slate-300/60",
    bannerBg: "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700",
    bannerText: "text-slate-600 dark:text-slate-300",
    bannerIcon: ShieldCheck,
    bannerMsg: "This record has been archived",
  },
  DELETED: {
    label: "Deleted",
    dot: "bg-red-400",
    badge: "bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/30 dark:text-red-300 dark:border-red-800/50",
    accent: "border-l-red-400/70",
    bannerBg: "bg-red-50/60 dark:bg-red-950/20 border-red-200/60 dark:border-red-800/30",
    bannerText: "text-red-700 dark:text-red-300",
    bannerIcon: AlertCircle,
    bannerMsg: "Permanently purged in 30 days",
  },
} as const;

const CONDITION_COLORS: Record<string, string> = {
  EXCELLENT: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800/40",
  GOOD:      "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-800/40",
  FAIR:      "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800/40",
  POOR:      "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-300 dark:border-rose-800/40",
  DAMAGED:   "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-300 dark:border-red-800/40",
  BRAND_NEW: "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/30 dark:text-violet-300 dark:border-violet-800/40",
};

const CONDITION_DOT: Record<string, string> = {
  EXCELLENT: "bg-emerald-400",
  GOOD:      "bg-blue-400",
  FAIR:      "bg-amber-400",
  POOR:      "bg-rose-400",
  DAMAGED:   "bg-red-500",
  BRAND_NEW: "bg-violet-400",
};

const AVATAR_PALETTE = [
  "from-violet-400 to-indigo-500",
  "from-emerald-400 to-teal-500",
  "from-amber-400 to-orange-500",
  "from-rose-400 to-pink-500",
  "from-sky-400 to-blue-500",
  "from-fuchsia-400 to-purple-500",
];

// ─── Detail row helper ──────────────────────────────────────────────────────
function DetailRow({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ElementType;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted/60">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70 mb-0.5">
          {label}
        </p>
        <div className="text-sm font-medium text-foreground">{children}</div>
      </div>
    </div>
  );
}

// ─── Main component ─────────────────────────────────────────────────────────
export function AcknowledgementRow({
  item,
  index,
}: {
  item: AcknowledgementRowItem;
  index: number;
}) {
  const [open, setOpen] = useState(false);

  const sc = STATUS_CONFIG[item.status];
  const condKey = (item.conditionSnapshot || "GOOD").toUpperCase();
  const condClass =
    CONDITION_COLORS[condKey] ??
    "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700";
  const condDot = CONDITION_DOT[condKey] ?? "bg-slate-400";

  const avatarGradient =
    AVATAR_PALETTE[(item.assigneeNameSnapshot?.charCodeAt(0) ?? 0) % AVATAR_PALETTE.length];

  const isAcknowledged = item.status === "ACKNOWLEDGED";
  const isPending      = item.status === "PENDING";
  const isExpired      = item.status === "EXPIRED";

  const BannerIcon = sc.bannerIcon;

  return (
    <>
      {/* ─── Compact table row ─────────────────────────────────────────── */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen(true)}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setOpen(true)}
        className={`
          group relative flex cursor-pointer items-center gap-0
          border-l-[3px] ${sc.accent}
          transition-all duration-150
          hover:bg-muted/30 active:bg-muted/50
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/50
        `}
      >
        {/* Row number */}
        <span className="absolute top-1/2 left-[-1px] -translate-y-1/2 hidden xl:flex h-5 min-w-[1.5rem] items-center justify-center rounded-r-md bg-muted/60 px-1 text-[9px] font-black tabular-nums text-muted-foreground/50">
          {index + 1}
        </span>

        {/* ── 5-column grid ─────────────────────────────────────────────── */}
        <div className="grid w-full items-center gap-x-4 grid-cols-[1fr] sm:grid-cols-[1fr_auto] md:grid-cols-[minmax(0,2.2fr)_minmax(0,1.5fr)_minmax(0,110px)_minmax(0,140px)_minmax(0,140px)] px-5 py-3 pl-7">

          {/* ── Asset ── */}
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="relative shrink-0">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-violet-200/60 dark:border-violet-700/40 bg-gradient-to-br from-violet-50 to-indigo-100/80 dark:from-violet-950/40 dark:to-indigo-900/20">
                <Tag className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
              </div>
              {isAcknowledged && (
                <div className="absolute -bottom-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-emerald-500 ring-2 ring-background">
                  <CheckCircle2 className="h-2 w-2 text-white" />
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p
                className="truncate text-sm font-bold text-foreground leading-tight"
                title={item.assetNameSnapshot ?? ""}
              >
                {item.assetNameSnapshot}
              </p>
              <div className="mt-0.5 flex items-center gap-1 flex-wrap">
                {item.assetTagSnapshot && (
                  <span className="inline-flex items-center gap-0.5 rounded bg-slate-100 dark:bg-slate-800 px-1 py-px text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400">
                    <span className="text-slate-400/70">#</span>
                    {item.assetTagSnapshot}
                  </span>
                )}
                {item.assetCodeSnapshot && (
                  <span className="rounded bg-slate-100/70 dark:bg-slate-800/70 px-1 py-px text-[10px] font-mono text-slate-400 dark:text-slate-500">
                    {item.assetCodeSnapshot}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* ── Assignee ── */}
          <div className="hidden md:flex min-w-0 items-center gap-2">
            <div
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${avatarGradient} text-[11px] font-black text-white uppercase`}
            >
              {item.assigneeNameSnapshot?.charAt(0) ?? "?"}
            </div>
            <div className="min-w-0">
              <p
                className="truncate text-sm font-semibold text-foreground"
                title={item.assigneeNameSnapshot ?? ""}
              >
                {item.assigneeNameSnapshot}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {item.assigneeType === "department" ? "Department" : "Employee"}
              </p>
            </div>
          </div>

          {/* ── Condition ── */}
          <div className="hidden md:flex items-center pr-2">
            <span
              className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide whitespace-nowrap ${condClass}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${condDot}`} />
              {item.conditionSnapshot || "GOOD"}
            </span>
          </div>

          {/* ── Handover Date ── */}
          <div className="hidden md:flex flex-col justify-center pr-2">
            <div className="flex items-center gap-1">
              <CalendarDays className="h-3 w-3 text-muted-foreground/50 shrink-0" />
              <span className="text-sm font-semibold text-foreground whitespace-nowrap">
                {format(new Date(item.assignedDateSnapshot), "MMM d, yyyy")}
              </span>
            </div>
            <span className="pl-4 text-[10px] text-muted-foreground">
              {format(new Date(item.assignedDateSnapshot), "EEEE")}
            </span>
          </div>

          {/* ── Status chip ── */}
          <div className="flex items-center justify-between gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide whitespace-nowrap ${sc.badge}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${sc.dot} ${isPending ? "animate-pulse" : ""}`} />
              {sc.label}
            </span>
            {/* Chevron hint */}
            <ChevronRight className="h-4 w-4 text-muted-foreground/40 transition-transform group-hover:translate-x-0.5 group-hover:text-muted-foreground/70 shrink-0" />
          </div>
        </div>
      </div>

      {/* ─── Detail Sheet ──────────────────────────────────────────────── */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-md md:max-w-lg p-0 flex flex-col overflow-hidden gap-0"
        >
          {/* Header */}
          <div
            className={`
              shrink-0 border-b border-border/60 px-5 pt-5 pb-4
              border-l-4 ${sc.accent.replace("border-l-", "border-l-")}
            `}
          >
            <SheetHeader className="p-0 gap-0">
              <div className="flex items-start gap-3 pr-8">
                <div className="relative shrink-0">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-violet-200/60 dark:border-violet-700/40 bg-gradient-to-br from-violet-50 to-indigo-100/80 dark:from-violet-950/40 dark:to-indigo-900/20 shadow-sm">
                    <Tag className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                  </div>
                  {isAcknowledged && (
                    <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 ring-2 ring-background shadow-sm">
                      <CheckCircle2 className="h-3 w-3 text-white" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <SheetTitle className="text-base font-black leading-tight text-foreground break-words">
                    {item.assetNameSnapshot}
                  </SheetTitle>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    {item.assetTagSnapshot && (
                      <span className="inline-flex items-center gap-0.5 rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-[11px] font-mono font-bold text-slate-600 dark:text-slate-300">
                        <span className="text-slate-400">#</span>
                        {item.assetTagSnapshot}
                      </span>
                    )}
                    {item.assetCodeSnapshot && (
                      <span className="rounded bg-slate-100/60 dark:bg-slate-800/60 px-1.5 py-0.5 text-[11px] font-mono text-slate-500 dark:text-slate-400">
                        {item.assetCodeSnapshot}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Status banner */}
              <div
                className={`mt-3 flex items-center gap-2 rounded-lg border px-3 py-2 ${sc.bannerBg}`}
              >
                <BannerIcon className={`h-3.5 w-3.5 shrink-0 ${sc.bannerText}`} />
                <span className={`text-xs font-semibold ${sc.bannerText}`}>
                  {isAcknowledged && item.usedAt
                    ? `Signed on ${format(new Date(item.usedAt), "PPP 'at' p")}`
                    : sc.bannerMsg}
                </span>
                <span
                  className={`ml-auto inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${sc.badge}`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${sc.dot} ${isPending ? "animate-pulse" : ""}`} />
                  {sc.label}
                </span>
              </div>
            </SheetHeader>
          </div>

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

            {/* ── Assignee ── */}
            <section>
              <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                {item.assigneeType === "department" ? "Assigned Department" : "Assignee"}
              </p>
              <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-muted/20 px-4 py-3">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${avatarGradient} text-sm font-black text-white uppercase shadow-sm`}
                >
                  {item.assigneeType === "department" ? <Building2 className="h-5 w-5" /> : (item.assigneeNameSnapshot?.charAt(0) ?? "?")}
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">{item.assigneeNameSnapshot}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {item.assigneeType === "department" ? "Department" : "Employee"}
                  </p>
                </div>
                {isAcknowledged && (item.acknowledgedByName || item.representativeName) && (
                  <div className="ml-auto text-right">
                    <p className="text-[10px] text-muted-foreground">Signed by</p>
                    <p className="text-xs font-bold text-foreground">
                      {item.acknowledgedByName || item.representativeName}
                    </p>
                  </div>
                )}
              </div>
            </section>

            {/* ── Asset Details ── */}
            <section className="space-y-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                Asset Details
              </p>

              <DetailRow icon={CalendarDays} label="Handover Date">
                <span className="font-bold">
                  {format(new Date(item.assignedDateSnapshot), "PPP")}
                </span>
                <span className="ml-2 text-[11px] text-muted-foreground">
                  ({format(new Date(item.assignedDateSnapshot), "EEEE")})
                </span>
              </DetailRow>

              <DetailRow icon={FileCheck2} label="Condition at Handover">
                <span
                  className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-bold uppercase tracking-wide ${condClass}`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${condDot}`} />
                  {item.conditionSnapshot || "GOOD"}
                </span>
              </DetailRow>

              {item.departmentName && (
                <DetailRow icon={Building2} label="Department">
                  {item.departmentName}
                </DetailRow>
              )}

              {item.assetTagSnapshot && (
                <DetailRow icon={Hash} label="Asset Tag">
                  <span className="font-mono font-bold text-foreground">
                    #{item.assetTagSnapshot}
                  </span>
                </DetailRow>
              )}

              {item.assetCodeSnapshot && (
                <DetailRow icon={Hash} label="Asset Code">
                  <span className="font-mono text-muted-foreground">
                    {item.assetCodeSnapshot}
                  </span>
                </DetailRow>
              )}
            </section>

            {/* ── Audit Trail ── */}
            <section className="space-y-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                Audit Trail
              </p>

              <div className="rounded-xl border border-border/60 bg-muted/10 divide-y divide-border/40">
                <div className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-[11px] text-muted-foreground">Record created</span>
                  <span className="text-[11px] font-semibold text-foreground">
                    {format(new Date(item.createdAt), "PP · p")}
                  </span>
                </div>
                {isAcknowledged && item.usedAt && (
                  <div className="flex items-center justify-between px-4 py-2.5">
                    <span className="text-[11px] text-muted-foreground">Employee signed</span>
                    <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                      {format(new Date(item.usedAt), "PP · p")}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between px-4 py-2.5">
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="h-3 w-3 text-violet-500" />
                    <span className="text-[11px] text-muted-foreground">Immutable record</span>
                  </div>
                  <span className="text-[10px] font-bold text-violet-600 dark:text-violet-400 uppercase tracking-wide">
                    Audit-grade
                  </span>
                </div>
              </div>
            </section>

            {/* ── Actions ── */}
            <section>
              <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                Actions
              </p>
              <AcknowledgementActionsClient
                assignmentId={item.assignmentId}
                acknowledgement={{
                  status: item.status,
                  pdfReceiptPath: item.pdfReceiptPath,
                }}
              />
            </section>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
