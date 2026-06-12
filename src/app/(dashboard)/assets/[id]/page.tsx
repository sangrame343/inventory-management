import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { AssetAssignModal } from "@/components/assets/asset-assign-modal";
import { AssetReturnModal } from "@/components/assets/asset-return-modal";
import { AssetDuplicateButton } from "@/components/assets/asset-duplicate-button";
import { PrintAssetButton } from "@/components/assets/print-asset-button";
import { format, differenceInDays, isPast, isWithinInterval, addDays, differenceInMonths, differenceInYears, addYears, addMonths } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TransferHistory } from "@/components/assets/transfer-history";
import {
  Truck,
  Pencil,
  Package,
  Tag,
  Barcode,
  MapPin,
  Building2,
  ShoppingCart,
  Calendar,
  IndianRupee,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  Cpu,
  Wrench,
  Users,
  ExternalLink,
  ImageIcon,
  AlertTriangle,
  Clock,
  CheckCircle2,
  ClipboardList,
  ArrowRight,
} from "lucide-react";

interface AssetDetailPageProps {
  params: Promise<{ id: string }>;
}

// ── Warranty Status Helpers ───────────────────────────────────────────────────

function getWarrantyStatus(warrantyExpiration: Date | null) {
  if (!warrantyExpiration) return null;

  const today = new Date();
  const expiry = new Date(warrantyExpiration);
  const daysLeft = differenceInDays(expiry, today);

  if (isPast(expiry)) {
    return { type: "expired" as const, daysLeft: 0 };
  }
  if (daysLeft <= 30) {
    return { type: "critical" as const, daysLeft };
  }
  if (daysLeft <= 90) {
    return { type: "warning" as const, daysLeft };
  }
  return { type: "ok" as const, daysLeft };
}

function getRemainingTimeText(expiryDate: Date) {
  const today = new Date();
  if (isPast(expiryDate)) {
    return "Expired";
  }

  const years = differenceInYears(expiryDate, today);
  const dateAfterYears = addYears(today, years);
  const months = differenceInMonths(expiryDate, dateAfterYears);
  const dateAfterMonths = addMonths(dateAfterYears, months);
  const days = differenceInDays(expiryDate, dateAfterMonths);

  const parts = [];
  if (years > 0) parts.push(`${years} ${years === 1 ? "year" : "years"}`);
  if (months > 0) parts.push(`${months} ${months === 1 ? "month" : "months"}`);
  if (days > 0 || parts.length === 0) parts.push(`${days} ${days === 1 ? "day" : "days"}`);

  return parts.join(", ") + " remaining";
}

function WarrantyBanner({ expiration }: { expiration: Date | null }) {
  const status = getWarrantyStatus(expiration);
  if (!status) return null;

  const remainingText = expiration ? getRemainingTimeText(new Date(expiration)) : "";

  if (status.type === "expired") {
    return (
      <div className="flex items-center gap-4 rounded-xl border border-red-500/30 bg-red-500/5 dark:bg-red-500/10 px-5 py-4 shadow-sm animate-pulse">
        <ShieldX className="h-6 w-6 text-red-500 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-red-600 dark:text-red-400">Warranty / Expiry Alert: EXPIRED</p>
          <p className="text-xs text-red-500/80 mt-0.5">
            This asset expired on <strong>{format(new Date(expiration!), "PPP")}</strong>. Any repair or replacement may incur costs.
          </p>
        </div>
        <Badge variant="destructive" className="shrink-0 font-bold uppercase tracking-wider bg-red-600 hover:bg-red-700">Expired</Badge>
      </div>
    );
  }

  if (status.type === "critical") {
    return (
      <div className="flex items-center gap-4 rounded-xl border border-orange-500/30 bg-orange-500/5 dark:bg-orange-500/10 px-5 py-4 shadow-sm animate-pulse">
        <ShieldAlert className="h-6 w-6 text-orange-500 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-orange-600 dark:text-orange-400">Warranty Expiring Imminently</p>
          <p className="text-xs text-orange-500/80 mt-0.5">
            Expires in <strong>{remainingText}</strong> (on {format(new Date(expiration!), "PPP")}).
          </p>
        </div>
        <Badge className="shrink-0 bg-orange-500 text-white font-bold hover:bg-orange-600">
          {status.daysLeft}d left
        </Badge>
      </div>
    );
  }

  if (status.type === "warning") {
    return (
      <div className="flex items-center gap-4 rounded-xl border border-amber-500/30 bg-amber-500/5 dark:bg-amber-500/10 px-5 py-4 shadow-sm">
        <AlertTriangle className="h-6 w-6 text-amber-500 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-amber-700 dark:text-amber-400 font-semibold">Warranty Ending Soon</p>
          <p className="text-xs text-amber-600/80 mt-0.5">
            Expires in <strong>{remainingText}</strong> — {format(new Date(expiration!), "PPP")}.
          </p>
        </div>
        <Badge className="shrink-0 bg-amber-500 text-white font-bold hover:bg-amber-600">
          {status.daysLeft}d left
        </Badge>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-500/10 px-5 py-4 shadow-sm">
      <ShieldCheck className="h-6 w-6 text-emerald-500 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 font-semibold">Warranty Active & Secure</p>
        <p className="text-xs text-emerald-600/80 mt-0.5">
          Expires in <strong>{remainingText}</strong> — {format(new Date(expiration!), "PPP")}.
        </p>
      </div>
      <Badge className="shrink-0 bg-emerald-600 text-white font-bold hover:bg-emerald-700">
        {status.daysLeft}d left
      </Badge>
    </div>
  );
}

// ── Detail Field ──────────────────────────────────────────────────────────────

function InfoField({ icon, label, value, mono = false }: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-border/40 last:border-0">
      <div className="mt-0.5 shrink-0 text-muted-foreground">{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">{label}</p>
        <div className={`text-sm font-medium ${mono ? "font-mono" : ""}`}>{value}</div>
      </div>
    </div>
  );
}

// ── Status Badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    ACTIVE: { label: "Active", className: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30 dark:text-emerald-400" },
    ASSIGNED: { label: "Assigned", className: "bg-blue-500/15 text-blue-600 border-blue-500/30 dark:text-blue-400" },
    REPAIR: { label: "In Repair", className: "bg-amber-500/15 text-amber-600 border-amber-500/30 dark:text-amber-400" },
    DISPOSED: { label: "Disposed", className: "bg-zinc-500/15 text-zinc-600 border-zinc-500/30 dark:text-zinc-400" },
    LOST: { label: "Lost", className: "bg-red-500/15 text-red-600 border-red-500/30 dark:text-red-400" },
  };
  const config = map[status] ?? { label: status, className: "bg-muted text-muted-foreground border-border" };

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${config.className}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {config.label}
    </span>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default async function AssetDetailPage({ params }: AssetDetailPageProps) {
  const session = await auth();

  if (!session?.user?.activeCompanyId) {
    redirect("/login");
  }

  const { id } = await params;

  const asset = (await db.asset.findFirst({
    where: { id, companyId: session.user.activeCompanyId },
    include: {
      category: true,
      department: true,
      purchasedFromDepartment: true,
      location: true,
      vendor: true,
      company: true,
      assignments: {
        include: {
          user: true,
          employee: true,
          assignedBy: true,
          manager: true,
          department: true,
          location: true,
        },
        orderBy: { assignedAt: "desc" },
      },
      tickets: {
        include: { createdBy: true, assignedTo: true },
        orderBy: { createdAt: "desc" },
      },
    },
  })) as any;

  if (!asset) notFound();

  const currentAssignment = asset.assignments.find((a: any) => !a.returnedAt);
  const warrantyStatus = getWarrantyStatus(asset.warrantyExpiration);

  return (
    <>
      {/* ── Normal Screen View ── */}
      <div className="space-y-6 pb-10 print:hidden">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-card via-card to-muted/20 p-6">
        {/* Decorative blobs */}
        <div className="absolute top-0 right-0 h-48 w-48 rounded-full bg-violet-500/5 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 h-32 w-32 rounded-full bg-fuchsia-500/5 blur-3xl pointer-events-none" />

        <div className="relative flex flex-col gap-5 md:flex-row md:items-start">

          {/* Asset Image */}
          <div className="shrink-0">
            {asset.imageUrl ? (
              <div className="h-28 w-28 rounded-2xl border border-violet-500/20 bg-muted/30 overflow-hidden shadow-md transition-all duration-300 hover:scale-105 hover:shadow-xl hover:border-violet-500/40 relative group bg-background">
                <img
                  src={asset.imageUrl}
                  alt={asset.name}
                  className="h-full w-full object-contain p-2 transition-transform duration-300 group-hover:scale-110"
                  onError={undefined}
                />
              </div>
            ) : (
              <div className="h-28 w-28 rounded-2xl border-2 border-dashed border-border/80 bg-muted/20 flex flex-col items-center justify-center gap-1.5 text-muted-foreground/40 hover:bg-muted/30 hover:border-violet-500/30 transition-all duration-300">
                <ImageIcon className="h-8 w-8 opacity-60" />
                <span className="text-[10px] font-semibold tracking-wider uppercase">No Product Image</span>
              </div>
            )}
          </div>

          {/* Title block */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <StatusBadge status={asset.status} />
              {asset.category && (
                <span className="inline-flex items-center gap-1 rounded-full bg-violet-500/10 border border-violet-500/20 px-2.5 py-0.5 text-[11px] font-medium text-violet-600 dark:text-violet-400">
                  <Tag className="h-3 w-3" /> {asset.category.name}
                </span>
              )}
            </div>

            <h1 className="text-2xl font-black tracking-tight mt-1">{asset.name}</h1>

            <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
              {asset.assetCode && (
                <span className="font-mono bg-muted/60 border border-border/50 px-2 py-0.5 rounded-md">
                  Code: {asset.assetCode}
                </span>
              )}
              <span className="font-mono bg-muted/60 border border-border/50 px-2 py-0.5 rounded-md">
                Tag: {asset.assetTag}
              </span>
              {asset.brand && (
                <span className="font-mono bg-muted/60 border border-border/50 px-2 py-0.5 rounded-md">
                  {asset.brand}{asset.model ? ` • ${asset.model}` : ""}
                </span>
              )}
            </div>

            {/* Purchase link */}
            {asset.purchaseUrl && (
              <a
                href={asset.purchaseUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 mt-3 text-xs font-medium text-primary hover:underline underline-offset-2"
              >
                <ShoppingCart className="h-3.5 w-3.5" />
                View Purchase Listing
                <ExternalLink className="h-3 w-3 opacity-60" />
              </a>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2 shrink-0">
            {currentAssignment ? (
              <AssetReturnModal assetId={asset.id} assetName={asset.name} />
            ) : (
              <AssetAssignModal assetId={asset.id} assetName={asset.name} />
            )}
            <AssetDuplicateButton assetId={asset.id} />
            <PrintAssetButton />
            <Button
              variant="outline"
              size="sm"
              render={
                <Link href={`/assets/${asset.id}/edit`} className="flex items-center gap-1.5">
                  <Pencil className="h-3.5 w-3.5" /> Edit
                </Link>
              }
            />
          </div>
        </div>

        {/* Warranty/Expiration alert banner */}
        {warrantyStatus && (
          <div className="relative mt-4">
            <WarrantyBanner expiration={asset.warrantyExpiration} />
          </div>
        )}
      </div>

      {/* ── Main Grid ──────────────────────────────────────────────────── */}
      <div className="grid gap-5 lg:grid-cols-3">

        {/* ── Asset Details ─────────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-5">

          {/* Core Details */}
          <div className="rounded-2xl border border-border/60 bg-card overflow-hidden">
            <div className="flex items-center gap-3 px-5 pt-5 pb-4 border-b border-border/40">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-violet-500/10">
                <Package className="h-4 w-4 text-violet-500" />
              </div>
              <p className="text-sm font-bold">Asset Information</p>
            </div>

            <div className="px-5 py-2">
              <div className="grid md:grid-cols-2 gap-x-8">
                <div>
                  <InfoField
                    icon={<Cpu className="h-4 w-4" />}
                    label="Brand / Model"
                    value={`${asset.brand || "—"} ${asset.model ? `• ${asset.model}` : ""}`}
                  />
                  <InfoField
                    icon={<Barcode className="h-4 w-4" />}
                    label="Serial Number"
                    value={<span className="font-mono text-xs">{asset.serialNumber || "N/A"}</span>}
                    mono
                  />
                  <InfoField
                    icon={<MapPin className="h-4 w-4" />}
                    label="Location"
                    value={asset.location?.name || "N/A"}
                  />
                  <InfoField
                    icon={<Building2 className="h-4 w-4" />}
                    label="Department"
                    value={asset.department?.name || "N/A"}
                  />
                  <InfoField
                    icon={<Wrench className="h-4 w-4" />}
                    label="Condition"
                    value={asset.condition || "N/A"}
                  />
                </div>

                <div>
                  <InfoField
                    icon={<ShoppingCart className="h-4 w-4" />}
                    label="Purchased From"
                    value={asset.purchasedFromDepartment?.name || asset.vendor?.name || "N/A"}
                  />
                  <InfoField
                    icon={<Calendar className="h-4 w-4" />}
                    label="Purchase Date"
                    value={asset.purchaseDate ? format(new Date(asset.purchaseDate), "PPP") : "N/A"}
                  />
                  <InfoField
                    icon={<IndianRupee className="h-4 w-4" />}
                    label="Purchase Price"
                    value={asset.cost != null ? `₹${asset.cost.toLocaleString("en-IN")}` : "N/A"}
                  />
                  <InfoField
                    icon={<IndianRupee className="h-4 w-4" />}
                    label="Replacement Value"
                    value={asset.estimatedReplacementValue != null ? `₹${asset.estimatedReplacementValue.toLocaleString("en-IN")}` : "N/A"}
                  />
                  {asset.purchaseUrl && (
                    <InfoField
                      icon={<ExternalLink className="h-4 w-4" />}
                      label="Purchase Link"
                      value={
                        <a
                          href={asset.purchaseUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline underline-offset-2 flex items-center gap-1"
                        >
                          View on Ecommerce
                          <ExternalLink className="h-3 w-3 opacity-60" />
                        </a>
                      }
                    />
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Warranty Block */}
          <div className="rounded-2xl border border-border/60 bg-card overflow-hidden">
            <div className="flex items-center gap-3 px-5 pt-5 pb-4 border-b border-border/40">
              <div className={`flex items-center justify-center w-8 h-8 rounded-lg ${
                warrantyStatus?.type === "expired" ? "bg-destructive/10" :
                warrantyStatus?.type === "critical" ? "bg-orange-500/10" :
                warrantyStatus?.type === "warning" ? "bg-yellow-500/10" :
                "bg-emerald-500/10"
              }`}>
                {warrantyStatus?.type === "expired" ? (
                  <ShieldX className="h-4 w-4 text-destructive" />
                ) : warrantyStatus?.type === "critical" || warrantyStatus?.type === "warning" ? (
                  <ShieldAlert className="h-4 w-4 text-amber-500" />
                ) : (
                  <ShieldCheck className="h-4 w-4 text-emerald-500" />
                )}
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold">Warranty</p>
              </div>
              {warrantyStatus && (
                <div>
                  {warrantyStatus.type === "expired" && (
                    <Badge variant="destructive">EXPIRED</Badge>
                  )}
                  {warrantyStatus.type === "critical" && (
                    <Badge className="bg-orange-500 text-white">{warrantyStatus.daysLeft}d left</Badge>
                  )}
                  {warrantyStatus.type === "warning" && (
                    <Badge className="bg-yellow-500 text-white">{warrantyStatus.daysLeft}d left</Badge>
                  )}
                  {warrantyStatus.type === "ok" && (
                    <Badge className="bg-emerald-500 text-white">{warrantyStatus.daysLeft}d left</Badge>
                  )}
                </div>
              )}
            </div>

            <div className="px-5 py-2">
              <div className="grid md:grid-cols-2 gap-x-8">
                <InfoField
                  icon={<ShieldCheck className="h-4 w-4" />}
                  label="Warranty Details"
                  value={asset.warranty || "N/A"}
                />
                <InfoField
                  icon={<Calendar className="h-4 w-4" />}
                  label="Warranty Expiration"
                  value={
                    asset.warrantyExpiration ? (
                      <span className={
                        warrantyStatus?.type === "expired" ? "text-destructive font-semibold" :
                        warrantyStatus?.type === "critical" ? "text-orange-600 font-semibold" :
                        warrantyStatus?.type === "warning" ? "text-yellow-700 font-semibold" : ""
                      }>
                        {format(new Date(asset.warrantyExpiration), "PPP")}
                      </span>
                    ) : "N/A"
                  }
                />
              </div>

              {/* Warranty progress bar if not expired */}
              {asset.purchaseDate && asset.warrantyExpiration && !isPast(new Date(asset.warrantyExpiration)) && (
                <div className="pb-3 mt-1">
                  <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                    <span>Purchased {format(new Date(asset.purchaseDate), "MMM yyyy")}</span>
                    <span>Expires {format(new Date(asset.warrantyExpiration), "MMM yyyy")}</span>
                  </div>
                  {(() => {
                    const start = new Date(asset.purchaseDate).getTime();
                    const end = new Date(asset.warrantyExpiration).getTime();
                    const now = Date.now();
                    const pct = Math.min(100, Math.max(0, ((now - start) / (end - start)) * 100));
                    return (
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            warrantyStatus?.type === "critical" ? "bg-orange-500" :
                            warrantyStatus?.type === "warning" ? "bg-yellow-500" :
                            "bg-emerald-500"
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>

          {/* Specs */}
          {(asset.specifications || asset.accessoriesIncluded?.length > 0) && (
            <div className="rounded-2xl border border-border/60 bg-card overflow-hidden">
              <div className="flex items-center gap-3 px-5 pt-5 pb-4 border-b border-border/40">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-cyan-500/10">
                  <Cpu className="h-4 w-4 text-cyan-500" />
                </div>
                <p className="text-sm font-bold">Specifications & Accessories</p>
              </div>
              <div className="px-5 py-2">
                {asset.specifications && (
                  <InfoField
                    icon={<Cpu className="h-4 w-4" />}
                    label="Specifications"
                    value={asset.specifications}
                  />
                )}
                {asset.accessoriesIncluded?.length > 0 && (
                  <InfoField
                    icon={<Package className="h-4 w-4" />}
                    label="Accessories Included"
                    value={
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {asset.accessoriesIncluded.map((a: string, i: number) => (
                          <span key={i} className="inline-block rounded-full bg-muted border border-border/50 px-2.5 py-0.5 text-[11px] font-medium">
                            {a}
                          </span>
                        ))}
                      </div>
                    }
                  />
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Sidebar ────────────────────────────────────────────────────── */}
        <div className="space-y-5">

          {/* Current Holder */}
          <div className="rounded-2xl border border-border/60 bg-card overflow-hidden">
            <div className="flex items-center gap-3 px-5 pt-5 pb-4 border-b border-border/40">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-500/10">
                <Users className="h-4 w-4 text-blue-500" />
              </div>
              <p className="text-sm font-bold">Current Holder</p>
            </div>

            <div className="px-5 py-3">
              {currentAssignment ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 border border-border/40">
                    <div className="h-9 w-9 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
                      {(currentAssignment.employee?.fullName || currentAssignment.user?.name || "?").charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">
                        {currentAssignment.employee?.fullName ||
                         currentAssignment.department?.name ||
                         currentAssignment.user?.name || "N/A"}
                      </p>
                      {currentAssignment.employee?.employeeCode && (
                        <p className="text-[11px] text-muted-foreground font-mono">
                          {currentAssignment.employee.employeeCode}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2.5 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground text-xs">Assigned On</span>
                      <span className="font-medium text-xs">{format(new Date(currentAssignment.assignedAt), "PPP")}</span>
                    </div>
                    {currentAssignment.location && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground text-xs">Location</span>
                        <span className="font-medium text-xs">{currentAssignment.location.name}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground text-xs">Issued By</span>
                      <span className="font-medium text-xs">
                        {currentAssignment.assignedBy?.name || currentAssignment.assignedBy?.email || "N/A"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground text-xs">TXN ID</span>
                      <span className="font-mono text-[11px] text-muted-foreground">{currentAssignment.transactionId}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-6 text-muted-foreground gap-2">
                  <div className="h-12 w-12 rounded-full bg-muted/50 flex items-center justify-center">
                    <Users className="h-5 w-5 opacity-30" />
                  </div>
                  <p className="text-sm">Currently unassigned</p>
                </div>
              )}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="rounded-2xl border border-border/60 bg-card overflow-hidden">
            <div className="flex items-center gap-3 px-5 pt-5 pb-4 border-b border-border/40">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-fuchsia-500/10">
                <ClipboardList className="h-4 w-4 text-fuchsia-500" />
              </div>
              <p className="text-sm font-bold">Quick Stats</p>
            </div>
            <div className="px-5 py-3 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Total Assignments</span>
                <span className="text-sm font-bold">{asset.assignments.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Maintenance Tickets</span>
                <span className="text-sm font-bold">{asset.tickets.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Added On</span>
                <span className="text-xs font-medium">{format(new Date(asset.createdAt), "PP")}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Handover History ──────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-border/60 bg-card overflow-hidden">
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-border/40">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-500/10">
              <ArrowRight className="h-4 w-4 text-indigo-500" />
            </div>
            <p className="text-sm font-bold">Handover History</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            render={<Link href={`/assets/${asset.id}/history`}>Full Timeline</Link>}
          />
        </div>

        <div className="px-5 py-4">
          {asset.assignments.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No handover history found.</p>
          ) : (
            <div className="space-y-4">
              {asset.assignments.slice(0, 3).map((entry: any) => {
                const handoverTypeLabels: Record<string, string> = {
                  NEW_HIRE: "New Hire",
                  REPLACEMENT: "Replacement",
                  TEMPORARY_LOAN: "Temporary Loan",
                  NEW_ASSET_ASSIGN: "New Asset Assign",
                  ASSET_UPDATE: "Asset Update",
                  ASSIGNED_TO_DEPARTMENT: "Assigned to Department",
                };

                const conditionLabels: Record<string, string> = {
                  BRAND_NEW: "Brand New",
                  USED_EXCELLENT: "Used - Excellent",
                  USED_FAIR: "Used - Fair",
                };

                const functionalStatusLabels: Record<string, string> = {
                  WORKING: "Working",
                  MINOR_ISSUES: "Minor Issues",
                };

                const isEmployee = !entry.departmentId;

                return (
                  <div key={entry.id} className="group relative flex flex-col gap-4 rounded-xl border border-border/60 bg-muted/10 p-5 transition-all duration-300 hover:shadow-md hover:border-violet-500/30">
                    {/* Header: Title and Status */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 shadow-sm ${
                          entry.returnedAt ? "bg-muted text-muted-foreground" : "bg-violet-500/10 text-violet-500"
                        }`}>
                          {isEmployee ? (
                            <Users className="h-5 w-5" />
                          ) : (
                            <Building2 className="h-5 w-5" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-sm font-bold text-foreground flex items-center gap-1.5 flex-wrap">
                            {entry.employee?.fullName || entry.department?.name || entry.user?.name || entry.user?.email || "Unknown"}
                            {entry.employee?.employeeCode && (
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted font-normal text-muted-foreground">
                                {entry.employee.employeeCode}
                              </span>
                            )}
                          </h4>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            {isEmployee ? "Individual Assignment" : `Departmental Unit`}
                          </p>
                        </div>
                      </div>

                      {entry.returnedAt ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-muted border px-2.5 py-0.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                          <CheckCircle2 className="h-3 w-3 text-muted-foreground/60" /> Returned
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider animate-pulse">
                          <Clock className="h-3 w-3 text-emerald-500" /> Active
                        </span>
                      )}
                    </div>

                    {/* Timeline row */}
                    <div className="grid gap-3 sm:grid-cols-2 border-t border-border/40 pt-3.5">
                      <div className="space-y-0.5">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Assigned On</p>
                        <p className="text-xs font-semibold text-foreground">
                          {format(new Date(entry.assignedAt), "PP p")}
                        </p>
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Returned On</p>
                        <p className="text-xs font-semibold text-foreground">
                          {entry.returnedAt ? (
                            <span className="text-destructive">{format(new Date(entry.returnedAt), "PP p")}</span>
                          ) : (
                            <span className="text-emerald-600 font-bold">Present (Active)</span>
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Specs & Conditions grid */}
                    <div className="grid gap-4 grid-cols-2 md:grid-cols-4 bg-muted/20 rounded-lg p-3.5 text-xs border border-border/30">
                      <div>
                        <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">Handover Type</p>
                        <p className="font-semibold text-foreground/90 truncate">
                          {handoverTypeLabels[entry.handoverType] || entry.handoverType || "N/A"}
                        </p>
                      </div>
                      <div>
                        <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">Condition</p>
                        <p className="font-semibold text-foreground/90 truncate">
                          {conditionLabels[entry.physicalCondition] || entry.physicalCondition || "N/A"}
                        </p>
                      </div>
                      <div>
                        <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">Functional Status</p>
                        <p className="font-semibold text-foreground/90 truncate">
                          {functionalStatusLabels[entry.functionalStatus] || entry.functionalStatus || "N/A"}
                        </p>
                      </div>
                      <div>
                        <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">Location</p>
                        <p className="font-semibold text-foreground/90 truncate">
                          {entry.location?.name || "N/A"}
                        </p>
                      </div>
                    </div>

                    {/* Notes Box */}
                    {entry.notes && (
                      <div className="text-xs bg-amber-500/5 border border-amber-500/10 rounded-lg p-3 text-muted-foreground italic">
                        <strong className="text-[10px] not-italic font-bold uppercase tracking-wider text-amber-600 block mb-0.5">Handover Remarks</strong>
                        "{entry.notes}"
                      </div>
                    )}

                    {/* Footer Info */}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/40 pt-3 text-[10px] text-muted-foreground">
                      <div className="flex flex-wrap gap-x-3 gap-y-1">
                        <span>Issued By: <strong className="font-semibold text-foreground/85">{entry.assignedBy?.name || entry.assignedBy?.email || "N/A"}</strong></span>
                        {entry.manager?.fullName && (
                          <span>Supervisor: <strong className="font-semibold text-foreground/85">{entry.manager.fullName}</strong></span>
                        )}
                      </div>
                      <span className="font-mono bg-muted px-1.5 py-0.5 rounded text-[9px] border border-border/50">
                        TXN: {entry.transactionId}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Movement History ──────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-border/60 bg-card overflow-hidden">
        <div className="flex items-center gap-3 px-5 pt-5 pb-4 border-b border-border/40">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-teal-500/10">
            <Truck className="h-4 w-4 text-teal-500" />
          </div>
          <p className="text-sm font-bold">Movement History (Transfers)</p>
        </div>
        <div className="px-5 py-4">
          <TransferHistory assetId={asset.id} />
        </div>
      </div>

      {/* ── Maintenance Logs ──────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-border/60 bg-card overflow-hidden">
        <div className="flex items-center gap-3 px-5 pt-5 pb-4 border-b border-border/40">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-500/10">
            <Wrench className="h-4 w-4 text-amber-500" />
          </div>
          <p className="text-sm font-bold">Maintenance Logs</p>
        </div>

        <div className="px-5 py-4">
          {asset.tickets.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No maintenance logs found.</p>
          ) : (
            <div className="space-y-3">
              {asset.tickets.map((ticket: any) => (
                <div key={ticket.id} className="flex items-start gap-3 rounded-xl border border-border/40 bg-muted/20 p-4">
                  <div className="h-8 w-8 rounded-full bg-amber-500/15 flex items-center justify-center shrink-0">
                    <Wrench className="h-4 w-4 text-amber-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <p className="text-sm font-semibold">{ticket.title}</p>
                      <div className="flex gap-1.5">
                        <Badge variant="outline" className="text-[10px]">{ticket.priority}</Badge>
                        <Badge className="text-[10px]">{ticket.status}</Badge>
                      </div>
                    </div>
                    {ticket.description && (
                      <p className="text-xs text-muted-foreground mt-0.5">{ticket.description}</p>
                    )}
                    <p className="text-[11px] text-muted-foreground mt-1">
                      By {ticket.createdBy?.name || ticket.createdBy?.email || "N/A"}
                      {ticket.assignedTo && ` • Assigned: ${ticket.assignedTo.name || ticket.assignedTo.email}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      </div>

      {/* ── Print/Receipt View ── */}
      <div className="hidden print:block bg-white text-black p-8 font-sans max-w-4xl mx-auto text-sm">
        {/* Receipt Header */}
        <div className="flex justify-between items-start border-b-2 border-gray-900 pb-6 mb-8">
          <div>
            <h1 className="text-2xl font-bold uppercase tracking-wide">{asset.company?.name || "Corporate Asset Management"}</h1>
            <p className="text-xs text-gray-500 mt-1">Enterprise Asset Handover Registry</p>
          </div>
          <div className="text-right">
            <h2 className="text-lg font-black tracking-tight text-gray-700">HANDOVER RECEIPT</h2>
            <p className="text-xs font-mono text-gray-500 mt-1">TXN: {currentAssignment?.transactionId || "N/A"}</p>
          </div>
        </div>

        {/* Declaration */}
        <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <p className="font-semibold text-gray-800">Acknowledgement & Declaration</p>
          <p className="text-xs text-gray-600 mt-1 leading-relaxed">
            I hereby acknowledge receipt of the asset(s) listed below in good physical and working condition. 
            I agree to comply with the organization&apos;s asset usage, maintenance, and security guidelines, 
            and agree to return the asset upon termination of employment or request by management.
          </p>
        </div>

        {/* Handover Details */}
        <div className="grid grid-cols-2 gap-8 mb-8">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 border-b border-gray-200 pb-1 mb-2.5">
              Assigned Employee (Holder)
            </h3>
            <table className="w-full text-xs">
              <tbody>
                <tr className="border-b border-gray-100"><td className="py-1.5 font-medium text-gray-500 w-1/3">Full Name</td><td className="py-1.5 font-semibold text-gray-900">{currentAssignment?.employee?.fullName || currentAssignment?.user?.name || "N/A"}</td></tr>
                <tr className="border-b border-gray-100"><td className="py-1.5 font-medium text-gray-500">Employee Code</td><td className="py-1.5 font-mono text-gray-900">{currentAssignment?.employee?.employeeCode || "N/A"}</td></tr>
                <tr className="border-b border-gray-100"><td className="py-1.5 font-medium text-gray-500">Department</td><td className="py-1.5 text-gray-900">{currentAssignment?.department?.name || currentAssignment?.employee?.department?.name || "N/A"}</td></tr>
                <tr className="border-b border-gray-100"><td className="py-1.5 font-medium text-gray-500">Designation</td><td className="py-1.5 text-gray-900">{currentAssignment?.employee?.designation || "N/A"}</td></tr>
                <tr className="border-b border-gray-100"><td className="py-1.5 font-medium text-gray-500">Location</td><td className="py-1.5 text-gray-900">{currentAssignment?.location?.name || "N/A"}</td></tr>
              </tbody>
            </table>
          </div>

          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 border-b border-gray-200 pb-1 mb-2.5">
              Handover Transaction Info
            </h3>
            <table className="w-full text-xs">
              <tbody>
                <tr className="border-b border-gray-100"><td className="py-1.5 font-medium text-gray-500 w-1/3">Handover Date</td><td className="py-1.5 font-semibold text-gray-900">{currentAssignment?.assignedAt ? format(new Date(currentAssignment.assignedAt), "PPP") : "N/A"}</td></tr>
                <tr className="border-b border-gray-100"><td className="py-1.5 font-medium text-gray-500">Handover Type</td><td className="py-1.5 text-gray-900">{currentAssignment?.handoverType || "N/A"}</td></tr>
                <tr className="border-b border-gray-100"><td className="py-1.5 font-medium text-gray-500">Issued By (Admin)</td><td className="py-1.5 text-gray-900">{currentAssignment?.assignedBy?.name || currentAssignment?.assignedBy?.email || "N/A"}</td></tr>
                <tr className="border-b border-gray-100"><td className="py-1.5 font-medium text-gray-500">Condition</td><td className="py-1.5 text-gray-900">{currentAssignment?.physicalCondition || currentAssignment?.condition || "N/A"}</td></tr>
                <tr className="border-b border-gray-100"><td className="py-1.5 font-medium text-gray-500">Functional Status</td><td className="py-1.5 text-gray-900">{currentAssignment?.functionalStatus || "WORKING"}</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Asset Details */}
        <div className="mb-8">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 border-b border-gray-200 pb-1 mb-3">
            Asset Inventory Details
          </h3>
          <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-xs">
            <div className="flex border-b border-gray-100 py-1.5"><span className="font-medium text-gray-500 w-1/3">Asset Name</span><span className="font-semibold text-gray-900">{asset.name}</span></div>
            <div className="flex border-b border-gray-100 py-1.5"><span className="font-medium text-gray-500 w-1/3">Asset Tag</span><span className="font-mono text-gray-900">{asset.assetTag}</span></div>
            <div className="flex border-b border-gray-100 py-1.5"><span className="font-medium text-gray-500 w-1/3">Asset Code</span><span className="font-mono text-gray-900">{asset.assetCode || "N/A"}</span></div>
            <div className="flex border-b border-gray-100 py-1.5"><span className="font-medium text-gray-500 w-1/3">Category</span><span className="text-gray-900">{asset.category?.name || "N/A"}</span></div>
            <div className="flex border-b border-gray-100 py-1.5"><span className="font-medium text-gray-500 w-1/3">Brand / Model</span><span className="text-gray-900">{asset.brand || "—"} {asset.model ? `/ ${asset.model}` : ""}</span></div>
            <div className="flex border-b border-gray-100 py-1.5"><span className="font-medium text-gray-500 w-1/3">Serial Number</span><span className="font-mono text-gray-900">{asset.serialNumber || "N/A"}</span></div>
          </div>
        </div>

        {/* Specifications & Notes */}
        {(asset.specifications || currentAssignment?.notes) && (
          <div className="mb-10 grid grid-cols-2 gap-8">
            {asset.specifications && (
              <div>
                <h4 className="text-xs font-bold text-gray-500 uppercase mb-1">Specifications</h4>
                <p className="text-xs text-gray-700 bg-gray-50 p-2.5 rounded border border-gray-150 whitespace-pre-wrap">{asset.specifications}</p>
              </div>
            )}
            {currentAssignment?.notes && (
              <div>
                <h4 className="text-xs font-bold text-gray-500 uppercase mb-1">Handover Notes</h4>
                <p className="text-xs text-gray-700 bg-gray-50 p-2.5 rounded border border-gray-150 whitespace-pre-wrap">{currentAssignment.notes}</p>
              </div>
            )}
          </div>
        )}

        {/* Signatures */}
        <div className="mt-16 pt-10 border-t border-gray-200 grid grid-cols-2 gap-16">
          <div className="text-center">
            <div className="h-16 flex items-end justify-center mb-2">
              <span className="text-xs text-gray-400 font-mono italic">[Signature or Digital Acceptance]</span>
            </div>
            <div className="border-t border-gray-400 w-4/5 mx-auto pt-2">
              <p className="text-xs font-bold text-gray-800">Signature of Employee</p>
              <p className="text-[10px] text-gray-500 mt-0.5">Name: {currentAssignment?.employee?.fullName || currentAssignment?.user?.name || "____________________"}</p>
              <p className="text-[10px] text-gray-500">Date: ____________________</p>
            </div>
          </div>

          <div className="text-center">
            <div className="h-16 flex items-end justify-center mb-2">
              <span className="text-xs text-gray-400 font-mono italic">[Authorized Stamp / Signature]</span>
            </div>
            <div className="border-t border-gray-400 w-4/5 mx-auto pt-2">
              <p className="text-xs font-bold text-gray-800">Signature of Issuing Officer</p>
              <p className="text-[10px] text-gray-500 mt-0.5">Name: {currentAssignment?.assignedBy?.name || "____________________"}</p>
              <p className="text-[10px] text-gray-500">Date: ____________________</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
