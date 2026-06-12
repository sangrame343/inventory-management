import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AcknowledgementActionsClient } from "@/components/assets/acknowledgement-actions-client";
import {
  FileCheck2,
  Clock,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Archive,
  Trash2,
  User2,
  Tag,
  CalendarDays,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AcknowledgementsPage(props: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await auth();

  if (!session?.user?.activeCompanyId) {
    redirect("/login");
  }

  const companyId = session.user.activeCompanyId;
  const searchParams = await props.searchParams;
  const tab = searchParams.tab || "active";

  const allItems = await db.assetAcknowledgement.findMany({
    where: { companyId },
    include: {
      assignment: {
        include: {
          asset: true,
          employee: true,
          department: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const activeItems = allItems.filter((i) =>
    ["PENDING", "ACKNOWLEDGED", "EXPIRED"].includes(i.status)
  );
  const total = activeItems.length;
  const pending = activeItems.filter((i) => i.status === "PENDING").length;
  const acknowledged = activeItems.filter(
    (i) => i.status === "ACKNOWLEDGED"
  ).length;
  const expired = activeItems.filter((i) => i.status === "EXPIRED").length;
  const archivedCount = allItems.filter((i) => i.status === "ARCHIVED").length;
  const deletedCount = allItems.filter((i) => i.status === "DELETED").length;

  let filteredItems = activeItems;
  if (tab === "archived") {
    filteredItems = allItems.filter((i) => i.status === "ARCHIVED");
  } else if (tab === "deleted") {
    filteredItems = allItems.filter((i) => i.status === "DELETED");
  }

  const acknowledgedPct = total > 0 ? Math.round((acknowledged / total) * 100) : 0;

  const statusConfig = {
    PENDING: {
      label: "Pending",
      dot: "bg-amber-400",
      badge:
        "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800/50",
    },
    ACKNOWLEDGED: {
      label: "Acknowledged",
      dot: "bg-emerald-400",
      badge:
        "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800/50",
    },
    EXPIRED: {
      label: "Expired",
      dot: "bg-rose-400",
      badge:
        "bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/30 dark:text-rose-300 dark:border-rose-800/50",
    },
    ARCHIVED: {
      label: "Archived",
      dot: "bg-slate-400",
      badge:
        "bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
    },
    DELETED: {
      label: "Deleted",
      dot: "bg-red-400",
      badge:
        "bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/30 dark:text-red-300 dark:border-red-800/50",
    },
  } as const;

  const conditionColors: Record<string, string> = {
    EXCELLENT:
      "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800/40",
    GOOD: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-800/40",
    FAIR: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800/40",
    POOR: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-300 dark:border-rose-800/40",
    DAMAGED:
      "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-300 dark:border-red-800/40",
  };

  return (
    <div className="space-y-7 pb-14">
      {/* ── Hero Header ─────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl border border-violet-200/60 dark:border-violet-500/20 bg-gradient-to-br from-violet-50 via-white to-indigo-50/40 dark:from-violet-950/40 dark:via-card dark:to-indigo-950/20 p-7 shadow-sm">
        {/* Decorative blobs */}
        <div className="pointer-events-none absolute -top-8 -right-8 h-40 w-40 rounded-full bg-violet-400/10 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-24 h-24 w-24 rounded-full bg-indigo-400/10 blur-2xl" />

        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-lg shadow-violet-500/25">
              <ShieldCheck className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-foreground">
                Asset Sign-offs &amp; Acknowledgements
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Monitor employee sign-offs, manage public receipt links, and
                download signed audit documents.
              </p>
            </div>
          </div>

          {/* Sign-off completion pill */}
          {total > 0 && (
            <div className="flex shrink-0 flex-col items-center gap-1.5 rounded-xl border border-violet-200/70 dark:border-violet-700/40 bg-white/70 dark:bg-violet-950/30 px-5 py-3 backdrop-blur-sm">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                <TrendingUp className="h-3.5 w-3.5 text-violet-500" />
                Sign-off Rate
              </div>
              <div className="text-3xl font-black text-violet-600 dark:text-violet-400 leading-none">
                {acknowledgedPct}%
              </div>
              <div className="h-1.5 w-24 rounded-full bg-violet-100 dark:bg-violet-900/50 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-500 transition-all duration-700"
                  style={{ width: `${acknowledgedPct}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Summary Cards ───────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total */}
        <Card className="group relative overflow-hidden rounded-2xl border border-border/50 bg-card shadow-sm transition-shadow hover:shadow-md">
          <div className="pointer-events-none absolute top-0 right-0 h-20 w-20 rounded-full bg-slate-400/5 blur-2xl" />
          <CardHeader className="flex flex-row items-center justify-between pb-1 pt-4 px-5">
            <CardTitle className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              Total Handovers
            </CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted/60">
              <HelpCircle className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <div className="text-3xl font-black tabular-nums">{total}</div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Active in ledger
            </p>
          </CardContent>
        </Card>

        {/* Pending */}
        <Card className="group relative overflow-hidden rounded-2xl border border-amber-200/60 dark:border-amber-800/30 bg-gradient-to-br from-amber-50/60 to-card dark:from-amber-950/20 shadow-sm transition-shadow hover:shadow-md">
          <div className="pointer-events-none absolute top-0 right-0 h-20 w-20 rounded-full bg-amber-400/10 blur-2xl" />
          <CardHeader className="flex flex-row items-center justify-between pb-1 pt-4 px-5">
            <CardTitle className="text-[11px] font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400">
              Awaiting Sign-off
            </CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100/80 dark:bg-amber-900/30">
              <Clock className="h-4 w-4 text-amber-500" />
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <div className="text-3xl font-black tabular-nums text-amber-600 dark:text-amber-400">
              {pending}
            </div>
            <div className="mt-2 h-1.5 w-full rounded-full bg-amber-100 dark:bg-amber-900/40 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-500"
                style={{ width: total > 0 ? `${(pending / total) * 100}%` : "0%" }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Acknowledged */}
        <Card className="group relative overflow-hidden rounded-2xl border border-emerald-200/60 dark:border-emerald-800/30 bg-gradient-to-br from-emerald-50/60 to-card dark:from-emerald-950/20 shadow-sm transition-shadow hover:shadow-md">
          <div className="pointer-events-none absolute top-0 right-0 h-20 w-20 rounded-full bg-emerald-400/10 blur-2xl" />
          <CardHeader className="flex flex-row items-center justify-between pb-1 pt-4 px-5">
            <CardTitle className="text-[11px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
              Acknowledged
            </CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100/80 dark:bg-emerald-900/30">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <div className="text-3xl font-black tabular-nums text-emerald-600 dark:text-emerald-400">
              {acknowledged}
            </div>
            <div className="mt-2 h-1.5 w-full rounded-full bg-emerald-100 dark:bg-emerald-900/40 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500"
                style={{
                  width: total > 0 ? `${(acknowledged / total) * 100}%` : "0%",
                }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Expired */}
        <Card className="group relative overflow-hidden rounded-2xl border border-rose-200/60 dark:border-rose-800/30 bg-gradient-to-br from-rose-50/60 to-card dark:from-rose-950/20 shadow-sm transition-shadow hover:shadow-md">
          <div className="pointer-events-none absolute top-0 right-0 h-20 w-20 rounded-full bg-rose-400/10 blur-2xl" />
          <CardHeader className="flex flex-row items-center justify-between pb-1 pt-4 px-5">
            <CardTitle className="text-[11px] font-bold uppercase tracking-widest text-rose-600 dark:text-rose-400">
              Expired Links
            </CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-100/80 dark:bg-rose-900/30">
              <AlertCircle className="h-4 w-4 text-rose-500" />
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <div className="text-3xl font-black tabular-nums text-rose-600 dark:text-rose-400">
              {expired}
            </div>
            <div className="mt-2 h-1.5 w-full rounded-full bg-rose-100 dark:bg-rose-900/40 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-rose-400 to-rose-500"
                style={{ width: total > 0 ? `${(expired / total) * 100}%` : "0%" }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Tabs ────────────────────────────────────────── */}
      <div className="flex items-end gap-1 border-b border-border/60">
        {(
          [
            { key: "active", label: "Active Handovers", count: total, icon: FileCheck2 },
            { key: "archived", label: "Archived", count: archivedCount, icon: Archive },
            { key: "deleted", label: "Deleted", count: deletedCount, icon: Trash2 },
          ] as const
        ).map(({ key, label, count, icon: Icon }) => (
          <a
            key={key}
            href={`?tab=${key}`}
            className={`group relative flex items-center gap-2 px-4 pb-3 pt-1 text-sm font-semibold transition-colors ${
              tab === key
                ? "text-violet-600 dark:text-violet-400"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums transition-colors ${
                tab === key
                  ? "bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {count}
            </span>
            {/* Active underline */}
            <span
              className={`absolute bottom-0 left-0 right-0 h-0.5 rounded-full transition-all ${
                tab === key
                  ? "bg-gradient-to-r from-violet-500 to-indigo-500 opacity-100"
                  : "opacity-0"
              }`}
            />
          </a>
        ))}
      </div>

      {/* ── Audit Ledger ─────────────────────────────────── */}
      <div className="rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden">

        {/* Ledger header */}
        <div className="flex items-center justify-between border-b border-border/60 bg-gradient-to-r from-muted/30 to-transparent px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-md shadow-violet-500/20">
              <FileCheck2 className="h-4.5 w-4.5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-foreground text-sm leading-tight">
                {tab === "active" && "Active Handovers Audit Ledger"}
                {tab === "archived" && "Archived Handovers Ledger"}
                {tab === "deleted" && "Deleted Handovers — Purged after 30 days"}
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Cryptographically-tracked sign-off events
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 rounded-lg border border-border/50 bg-muted/40 px-3 py-1.5 text-[11px] text-muted-foreground">
              <ShieldCheck className="h-3 w-3 text-violet-500" />
              Immutable ledger
            </div>
            <span className="rounded-full bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 px-3 py-1 text-[11px] font-bold tabular-nums">
              {filteredItems.length} {filteredItems.length === 1 ? "record" : "records"}
            </span>
          </div>
        </div>

        {/* Column headers */}
        <div className="hidden md:grid grid-cols-[2.5fr_1.5fr_1fr_1.2fr_2fr] gap-0 border-b border-border/50 bg-muted/10 px-6 py-2.5">
          {[
            { label: "Asset", icon: Tag },
            { label: "Assignee", icon: User2 },
            { label: "Condition", icon: null },
            { label: "Handover Date", icon: CalendarDays },
            { label: "Status & Actions", icon: null },
          ].map(({ label, icon: Icon }) => (
            <div
              key={label}
              className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70"
            >
              {Icon && <Icon className="h-3 w-3" />}
              {label}
            </div>
          ))}
        </div>

        {/* Rows */}
        <div className="divide-y divide-border/40">
          {filteredItems.length === 0 ? (
            /* ── Empty State ── */
            <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
              <div className="relative">
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl border-2 border-dashed border-border/60 bg-muted/30">
                  <FileCheck2 className="h-8 w-8 text-muted-foreground/30" />
                </div>
                <div className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-violet-100 dark:bg-violet-900/40">
                  <span className="text-[9px] font-black text-violet-600 dark:text-violet-400">0</span>
                </div>
              </div>
              <div>
                <p className="font-bold text-muted-foreground text-base">No records found</p>
                <p className="text-xs text-muted-foreground/60 mt-1 max-w-xs mx-auto">
                  There are no handovers in this section yet. Assign an asset to an employee to create the first ledger entry.
                </p>
              </div>
            </div>
          ) : (
            filteredItems.map((item, idx) => {
              const sc = statusConfig[item.status as keyof typeof statusConfig];
              const condKey = (item.conditionSnapshot || "GOOD").toUpperCase();
              const condClass =
                conditionColors[condKey] ??
                "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700";

              /* avatar colour derived from name initial */
              const avatarPalette = [
                "from-violet-400 to-indigo-500",
                "from-emerald-400 to-teal-500",
                "from-amber-400 to-orange-500",
                "from-rose-400 to-pink-500",
                "from-sky-400 to-blue-500",
                "from-fuchsia-400 to-purple-500",
              ];
              const avatarGradient =
                avatarPalette[
                  (item.assigneeNameSnapshot?.charCodeAt(0) ?? 0) %
                    avatarPalette.length
                ];

              const isAcknowledged = item.status === "ACKNOWLEDGED";
              const isPending = item.status === "PENDING";
              const isExpired = item.status === "EXPIRED";

              return (
                <div
                  key={item.id}
                  className={`group relative transition-all duration-150 hover:bg-muted/20 ${
                    isAcknowledged
                      ? "border-l-[3px] border-l-emerald-500/60"
                      : isPending
                      ? "border-l-[3px] border-l-amber-400/60"
                      : isExpired
                      ? "border-l-[3px] border-l-rose-400/60"
                      : "border-l-[3px] border-l-slate-300/60"
                  }`}
                >
                  {/* Row number ribbon */}
                  <span className="absolute top-4 left-[-1px] hidden xl:flex h-5 min-w-[1.5rem] items-center justify-center rounded-r-md bg-muted/60 px-1 text-[9px] font-black tabular-nums text-muted-foreground/50">
                    {idx + 1}
                  </span>

                  <div className="grid grid-cols-1 md:grid-cols-[2.5fr_1.5fr_1fr_1.2fr_2fr] gap-4 md:gap-0 px-6 py-5 pl-7">

                    {/* ── Asset Cell ── */}
                    <div className="flex items-start gap-3 md:pr-4">
                      <div className="relative shrink-0">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-violet-200/60 dark:border-violet-700/40 bg-gradient-to-br from-violet-50 to-indigo-100/80 dark:from-violet-950/40 dark:to-indigo-900/20 shadow-sm">
                          <Tag className="h-4.5 w-4.5 text-violet-600 dark:text-violet-400" />
                        </div>
                        {isAcknowledged && (
                          <div className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 ring-2 ring-card">
                            <CheckCircle2 className="h-2.5 w-2.5 text-white" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-foreground text-sm leading-snug truncate">
                          {item.assetNameSnapshot}
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1">
                          <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-[10px] font-mono font-bold text-slate-600 dark:text-slate-300 tracking-tight">
                            <span className="text-slate-400 dark:text-slate-500">#</span>
                            {item.assetTagSnapshot}
                          </span>
                          {item.assetCodeSnapshot && (
                            <span className="inline-flex items-center rounded-md bg-slate-100/60 dark:bg-slate-800/60 px-1.5 py-0.5 text-[10px] font-mono text-slate-500 dark:text-slate-400">
                              {item.assetCodeSnapshot}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* ── Assignee Cell ── */}
                    <div className="flex items-center gap-2.5 md:pr-4">
                      <div
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${avatarGradient} text-[12px] font-black text-white uppercase shadow-sm`}
                      >
                        {item.assigneeNameSnapshot?.charAt(0) ?? "?"}
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-foreground text-sm truncate">
                          {item.assigneeNameSnapshot}
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">Employee</div>
                      </div>
                    </div>

                    {/* ── Condition Cell ── */}
                    <div className="flex items-center md:pr-4">
                      <span
                        className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${condClass}`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            condKey === "EXCELLENT"
                              ? "bg-emerald-400"
                              : condKey === "GOOD"
                              ? "bg-blue-400"
                              : condKey === "FAIR"
                              ? "bg-amber-400"
                              : condKey === "POOR"
                              ? "bg-rose-400"
                              : "bg-red-500"
                          }`}
                        />
                        {item.conditionSnapshot || "GOOD"}
                      </span>
                    </div>

                    {/* ── Date Cell ── */}
                    <div className="flex flex-col justify-center gap-0.5 md:pr-4">
                      <div className="flex items-center gap-1.5">
                        <CalendarDays className="h-3 w-3 text-muted-foreground/50 shrink-0" />
                        <span className="text-sm font-semibold text-foreground">
                          {format(new Date(item.assignedDateSnapshot), "PP")}
                        </span>
                      </div>
                      <span className="ml-4.5 text-[11px] text-muted-foreground">
                        {format(new Date(item.assignedDateSnapshot), "EEEE")}
                      </span>
                    </div>

                    {/* ── Status & Actions Cell ── */}
                    <div className="flex flex-col gap-2.5">
                      {/* Status chip */}
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-wide shadow-sm ${sc.badge}`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${sc.dot} ${
                              isPending ? "animate-pulse" : ""
                            }`}
                          />
                          {sc.label}
                        </span>

                        {isAcknowledged &&
                          (item.acknowledgedByName || item.representativeName) && (
                            <span className="text-[11px] font-medium text-muted-foreground">
                              by{" "}
                              <span className="font-bold text-foreground">
                                {item.acknowledgedByName || item.representativeName}
                              </span>
                            </span>
                          )}
                      </div>

                      {/* Signed-on timestamp */}
                      {isAcknowledged && item.usedAt && (
                        <div className="flex items-center gap-1.5 rounded-lg border border-emerald-200/60 dark:border-emerald-800/30 bg-emerald-50/60 dark:bg-emerald-950/20 px-2.5 py-1.5 w-fit">
                          <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
                          <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
                            Signed {format(new Date(item.usedAt), "PP · p")}
                          </span>
                        </div>
                      )}

                      {/* Awaiting banner */}
                      {isPending && (
                        <div className="flex items-center gap-1.5 rounded-lg border border-amber-200/60 dark:border-amber-800/30 bg-amber-50/60 dark:bg-amber-950/20 px-2.5 py-1.5 w-fit">
                          <Clock className="h-3 w-3 text-amber-500 shrink-0" />
                          <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-300">
                            Awaiting employee sign-off
                          </span>
                        </div>
                      )}

                      {/* Expired banner */}
                      {isExpired && (
                        <div className="flex items-center gap-1.5 rounded-lg border border-rose-200/60 dark:border-rose-800/30 bg-rose-50/60 dark:bg-rose-950/20 px-2.5 py-1.5 w-fit">
                          <AlertCircle className="h-3 w-3 text-rose-500 shrink-0" />
                          <span className="text-[10px] font-semibold text-rose-700 dark:text-rose-300">
                            Link expired — regenerate to re-send
                          </span>
                        </div>
                      )}

                      {/* Action controls */}
                      <AcknowledgementActionsClient
                        assignmentId={item.assignmentId}
                        acknowledgement={{
                          status: item.status,
                          pdfReceiptPath: item.pdfReceiptPath,
                        }}
                      />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        {filteredItems.length > 0 && (
          <div className="flex items-center justify-between border-t border-border/60 bg-muted/10 px-6 py-3">
            <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
              <span>
                <span className="font-bold text-foreground">{filteredItems.length}</span>{" "}
                {filteredItems.length === 1 ? "record" : "records"} shown
              </span>
              {tab === "active" && (
                <>
                  <span className="text-border">·</span>
                  <span className="flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    {acknowledged} signed
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                    {pending} pending
                  </span>
                  {expired > 0 && (
                    <span className="flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
                      {expired} expired
                    </span>
                  )}
                </>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <ShieldCheck className="h-3 w-3 text-violet-500" />
              Audit-grade · immutable record
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
