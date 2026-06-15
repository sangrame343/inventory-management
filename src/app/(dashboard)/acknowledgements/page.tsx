import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AcknowledgementRow } from "@/components/assets/acknowledgement-row";
import type { AcknowledgementRowItem } from "@/components/assets/acknowledgement-row";
import {
  FileCheck2,
  Clock,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Archive,
  Trash2,
  Tag,
  CalendarDays,
  User2,
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
  const acknowledged = activeItems.filter((i) => i.status === "ACKNOWLEDGED").length;
  const expired = activeItems.filter((i) => i.status === "EXPIRED").length;
  const archivedCount = allItems.filter((i) => i.status === "ARCHIVED").length;
  const deletedCount = allItems.filter((i) => i.status === "DELETED").length;

  let filteredItems = activeItems;
  if (tab === "archived") {
    filteredItems = allItems.filter((i) => i.status === "ARCHIVED");
  } else if (tab === "deleted") {
    filteredItems = allItems.filter((i) => i.status === "DELETED");
  }

  const acknowledgedPct =
    total > 0 ? Math.round((acknowledged / total) * 100) : 0;

  // Serialise to plain objects for the client component
  const rowItems: AcknowledgementRowItem[] = filteredItems.map((item) => ({
    id: item.id,
    assignmentId: item.assignmentId,
    status: item.status as AcknowledgementRowItem["status"],
    assetNameSnapshot: item.assetNameSnapshot,
    assetTagSnapshot: item.assetTagSnapshot,
    assetCodeSnapshot: item.assetCodeSnapshot,
    conditionSnapshot: item.conditionSnapshot,
    assigneeNameSnapshot: item.assigneeNameSnapshot,
    assignedDateSnapshot: item.assignedDateSnapshot.toISOString(),
    acknowledgedByName: item.acknowledgedByName,
    representativeName: item.representativeName,
    usedAt: item.usedAt?.toISOString() ?? null,
    pdfReceiptPath: item.pdfReceiptPath,
    createdAt: item.createdAt.toISOString(),
    departmentName: item.assignment?.department?.name ?? null,
    // Derive assignee type: if departmentId is set → department, else → employee
    assigneeType: item.assignment?.departmentId ? "department" : "employee",
  }));

  return (
    <div className="space-y-7 pb-14">
      {/* ── Hero Header ─────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl border border-violet-200/60 dark:border-violet-500/20 bg-gradient-to-br from-violet-50 via-white to-indigo-50/40 dark:from-violet-950/40 dark:via-card dark:to-indigo-950/20 p-7 shadow-sm">
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
            <p className="mt-1 text-[11px] text-muted-foreground">Active in ledger</p>
          </CardContent>
        </Card>

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
                style={{ width: total > 0 ? `${(acknowledged / total) * 100}%` : "0%" }}
              />
            </div>
          </CardContent>
        </Card>

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
            { key: "active",   label: "Active Handovers", count: total,         icon: FileCheck2 },
            { key: "archived", label: "Archived",          count: archivedCount, icon: Archive    },
            { key: "deleted",  label: "Deleted",           count: deletedCount,  icon: Trash2     },
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
                {tab === "active"   && "Active Handovers Audit Ledger"}
                {tab === "archived" && "Archived Handovers Ledger"}
                {tab === "deleted"  && "Deleted Handovers — Purged after 30 days"}
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Click any row to view full details &amp; actions
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

        {/* Column headers — visible md+ only */}
        <div className="hidden md:grid grid-cols-[minmax(0,2.2fr)_minmax(0,1.5fr)_minmax(0,110px)_minmax(0,140px)_minmax(0,140px)] gap-x-4 items-center border-b border-border/50 bg-muted/10 px-5 py-2.5 pl-7">
          {[
            { label: "Asset",         icon: Tag          },
            { label: "Assignee",      icon: User2        },
            { label: "Condition",     icon: null         },
            { label: "Handover Date", icon: CalendarDays },
            { label: "Status",        icon: null         },
          ].map(({ label, icon: Icon }, i) => (
            <div
              key={i}
              className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60"
            >
              {Icon && <Icon className="h-3 w-3" />}
              {label}
            </div>
          ))}
        </div>

        {/* Rows */}
        <div className="divide-y divide-border/40">
          {rowItems.length === 0 ? (
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
            rowItems.map((item, idx) => (
              <AcknowledgementRow key={item.id} item={item} index={idx} />
            ))
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
