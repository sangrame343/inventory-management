"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { format } from "date-fns";
import {
  Eye,
  Pencil,
  History,
  Trash2,
  Copy,
  MoreHorizontal,
  ChevronDown,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  PackageOpen,
  SearchX,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { deleteAsset, duplicateAsset } from "@/app/actions/asset-actions";
import { toast } from "sonner";
import { AssetTableToolbar, STATUS_CONFIG } from "./asset-table-toolbar";
import { confirmDialog } from "@/components/ui/confirm-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

interface Asset {
  id: string;
  assetCode: string | null;
  assetTag: string;
  name: string;
  brand: string | null;
  model: string | null;
  serialNumber: string | null;
  status: string;
  location: { name: string } | null;
  category: { name: string } | null;
  vendor: { name: string } | null;
  purchasedFromDepartment: { name: string } | null;
  purchaseDate: Date | null;
  assignments: any[];
  imageUrl: string | null;
  cost: number | null;
}

interface AssetTableClientProps {
  assets: Asset[];
  totalCount: number;
  categories: { id: string; name: string }[];
  locations: { id: string; name: string }[];
  vendors: { id: string; name: string }[];
  employees: { id: string; name: string }[];
  departments: { id: string; name: string }[];
}

/* ── Status Badge ── */
function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status];
  if (!cfg) {
    return (
      <span className="inline-flex items-center rounded-full border border-border px-2 py-0.5 text-[10px] font-semibold text-muted-foreground bg-muted">
        {status}
      </span>
    );
  }
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-[2px] text-[10px] font-semibold tracking-wider uppercase border shadow-2xs",
        cfg.bg,
        cfg.text,
        cfg.ring.replace("ring-", "border-"),
      )}
    >
      <span
        className={cn(
          "h-[5px] w-[5px] rounded-full shadow-2xs",
          cfg.dot,
          (status === "ACTIVE" || status === "ASSIGNED") && "animate-pulse duration-1000",
        )}
      />
      {cfg.label}
    </span>
  );
}

export function AssetTableClient({
  assets,
  totalCount,
  categories,
  locations,
  vendors,
  employees,
  departments,
}: AssetTableClientProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentSortBy = searchParams.get("sortBy") || "purchaseDate";
  const currentOrder = searchParams.get("order") || "desc";
  const currentPage = Number(searchParams.get("page")) || 1;
  const currentLimit = Number(searchParams.get("limit")) || 10;

  /* ── Selection ── */
  const toggleSelectAll = () => {
    setSelectedIds(selectedIds.length === assets.length ? [] : assets.map((a) => a.id));
  };
  const toggleSelect = (id: string) => {
    setSelectedIds((prev: string[]) =>
      prev.includes(id) ? prev.filter((i: string) => i !== id) : [...prev, id],
    );
  };

  /* ── Sort ── */
  const handleSort = (field: string) => {
    const params = new URLSearchParams(searchParams.toString());
    const defaultDescFields = ["createdAt", "purchaseDate", "assignedAt"];
    if (currentSortBy === field) {
      params.set("order", currentOrder === "asc" ? "desc" : "asc");
    } else {
      params.set("sortBy", field);
      params.set("order", defaultDescFields.includes(field) ? "desc" : "asc");
    }
    params.set("page", "1");
    router.push(`/assets?${params.toString()}`);
  };

  /* ── Pagination ── */
  const updatePageSize = (newLimit: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("limit", newLimit);
    params.set("page", "1");
    router.push(`/assets?${params.toString()}`);
  };
  const updatePage = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", newPage.toString());
    router.push(`/assets?${params.toString()}`);
  };

  /* ── Sort icon ── */
  const SortIcon = ({ field }: { field: string }) => {
    if (currentSortBy !== field)
      return <ArrowUpDown className="ml-1.5 h-3 w-3 opacity-0 group-hover/th:opacity-40 transition-opacity" />;
    return currentOrder === "asc" ? (
      <ArrowUp className="ml-1.5 h-3 w-3 text-primary" />
    ) : (
      <ArrowDown className="ml-1.5 h-3 w-3 text-primary" />
    );
  };

  /* ── CRUD ── */
  const handleDelete = async (id: string, name: string) => {
    const ok = await confirmDialog({
      title: `Delete "${name}"?`,
      description: "This will permanently remove this asset and all associated records. This action cannot be undone.",
      confirmLabel: "Delete Asset",
      variant: "danger",
    });
    if (!ok) return;
    startTransition(async () => {
      try {
        await deleteAsset(id);
        toast.success(`Asset "${name}" deleted`);
        setSelectedIds((prev: string[]) => prev.filter((i: string) => i !== id));
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to delete asset");
      }
    });
  };
  const handleDuplicate = async (id: string, name: string) => {
    startTransition(async () => {
      try {
        const res = await duplicateAsset(id);
        if (res && "id" in res) {
          toast.success(`Asset "${name}" duplicated`);
          router.push(`/assets/${res.id}`);
        } else if (res && "message" in res) {
          toast.success(res.message);
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to duplicate asset");
      }
    });
  };

  const totalPages = Math.ceil(totalCount / currentLimit) || 1;
  const rangeStart = (currentPage - 1) * currentLimit + 1;
  const rangeEnd = Math.min(currentPage * currentLimit, totalCount);
  const allSelected = assets.length > 0 && selectedIds.length === assets.length;
  const someSelected = selectedIds.length > 0 && !allSelected;

  /* ── Selected asset metadata for bulk-assign modal ── */
  const selectedAssets = assets
    .filter((a) => selectedIds.includes(a.id))
    .map((a) => ({ id: a.id, name: a.name, assetCode: a.assetCode }));

  /* ── Sortable header helper ── */
  const sortableHead = (label: string, field: string) => (
    <TableHead
      className={cn(
        "cursor-pointer select-none whitespace-nowrap group/th text-[10px] font-bold tracking-wider uppercase text-muted-foreground/80",
        "transition-colors duration-150 hover:text-foreground",
        currentSortBy === field ? "text-primary font-bold" : "text-muted-foreground/80",
      )}
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-1">
        {label}
        <SortIcon field={field} />
      </div>
    </TableHead>
  );

  return (
    <div className="space-y-4">
      <AssetTableToolbar
        selectedIds={selectedIds}
        onClearSelection={() => setSelectedIds([])}
        categories={categories}
        locations={locations}
        vendors={vendors}
        employees={employees}
        departments={departments}
        selectedAssets={selectedAssets}
      />

      {/* ╔══════════════════════════════════════════════════════════════════╗
         ║  Table                                                          ║
         ╚══════════════════════════════════════════════════════════════════╝ */}
      <div className="rounded-xl border border-border/50 bg-card overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/15 border-b border-border/40 hover:bg-muted/15">
                <TableHead className="w-[44px] pl-4">
                  <Checkbox
                    checked={allSelected || someSelected}
                    onChange={toggleSelectAll}
                  />
                </TableHead>
                {sortableHead("Asset Code", "assetCode")}
                {sortableHead("Name", "name")}
                {sortableHead("Category", "category")}
                <TableHead className="whitespace-nowrap text-muted-foreground/80 text-[10px] font-bold tracking-wider uppercase">Status</TableHead>
                {sortableHead("Location", "location")}
                <TableHead className="whitespace-nowrap text-muted-foreground/80 text-[10px] font-bold tracking-wider uppercase">Assigned To</TableHead>
                {sortableHead("Purchase Price", "cost")}
                {sortableHead("Purchased From", "purchasedFromDepartment")}
                {sortableHead("Purchase Date", "purchaseDate")}
                <TableHead className="sticky right-0 bg-muted/15 z-20 text-right border-l border-border/40 pr-4 text-muted-foreground/80 text-[10px] font-bold tracking-wider uppercase">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {assets.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={11} className="h-60">
                    <div className="flex flex-col items-center justify-center gap-4 py-8">
                      <div className="relative">
                        <div className="rounded-2xl border border-border/50 bg-muted/20 p-5 shadow-inner">
                          <PackageOpen className="h-10 w-10 text-muted-foreground/30" />
                        </div>
                        <div className="absolute -top-1 -right-1 rounded-full bg-card border border-border/50 p-1 shadow-sm">
                          <SearchX className="h-3.5 w-3.5 text-muted-foreground/40" />
                        </div>
                      </div>
                      <div className="text-center space-y-1">
                        <p className="text-sm font-semibold text-foreground/70">
                          No assets found
                        </p>
                        <p className="text-xs text-muted-foreground/60 max-w-[260px]">
                          Try adjusting your search or filters, or add a new asset to get started.
                        </p>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                assets.map((asset, idx) => {
                  const assignment = asset.assignments[0];
                  const isSelected = selectedIds.includes(asset.id);

                  return (
                    <TableRow
                      key={asset.id}
                      className={cn(
                        "cursor-pointer border-b border-border/30 group/row",
                        "transition-all duration-150 ease-out",
                        "hover:bg-primary/[0.02] hover:shadow-[inset_3px_0_0_0] hover:shadow-primary/40",
                        isSelected && "bg-primary/[0.04] shadow-[inset_3px_0_0_0] shadow-primary/50",
                      )}
                      style={{ animationDelay: `${idx * 20}ms` }}
                      onClick={(e) => {
                        if (
                          (e.target as HTMLElement).closest(
                            'button, a, input, [role="menuitem"], [role="checkbox"], [role="button"]',
                          )
                        )
                          return;
                        router.push(`/assets/${asset.id}`);
                      }}
                    >
                      {/* Checkbox */}
                      <TableCell className="pl-4">
                        <Checkbox
                          checked={isSelected}
                          onChange={() => toggleSelect(asset.id)}
                        />
                      </TableCell>

                      {/* Asset Code */}
                      <TableCell>
                        <code className="rounded-md bg-muted/60 px-1.5 py-0.5 text-[11px] font-mono font-semibold tracking-tight text-muted-foreground/80">
                          {asset.assetCode || "—"}
                        </code>
                      </TableCell>

                      {/* Name */}
                      <TableCell className="max-w-[230px]">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger
                              render={<div className="cursor-default truncate" />}
                            >
                              <DropdownMenu>
                                <DropdownMenuTrigger
                                  render={
                                    <button className="flex items-center gap-2.5 cursor-pointer hover:bg-muted/50 p-1.5 -m-1.5 rounded-lg transition-all duration-150 group/name text-left w-full" />
                                  }
                                >
                                  {/* Thumbnail */}
                                  {asset.imageUrl ? (
                                    <img
                                      src={asset.imageUrl}
                                      alt={asset.name}
                                      className="h-9 w-9 rounded-lg object-contain border border-border/50 bg-background shrink-0 shadow-sm"
                                    />
                                  ) : (
                                    <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center border border-primary/10 shrink-0 text-[11px] font-bold text-primary/60">
                                      {asset.name.substring(0, 2).toUpperCase()}
                                    </div>
                                  )}

                                  {/* Name + meta */}
                                  <div className="flex flex-col min-w-0 flex-1 gap-0.5">
                                    <div className="flex items-center gap-1">
                                      <span className="font-semibold text-[13px] truncate text-foreground/90 group-hover/name:text-foreground transition-colors">
                                        {asset.name.length > 22
                                          ? `${asset.name.substring(0, 22)}…`
                                          : asset.name}
                                      </span>
                                      <ChevronDown className="h-3 w-3 text-muted-foreground/30 opacity-0 group-hover/name:opacity-100 transition-opacity shrink-0" />
                                    </div>
                                    <span className="text-[10px] text-muted-foreground/60 uppercase tracking-wider truncate leading-none">
                                      {asset.brand || "Generic"} • {asset.serialNumber || "No S/N"}
                                    </span>
                                  </div>
                                </DropdownMenuTrigger>

                                {/* Detail card */}
                                <DropdownMenuContent
                                  align="start"
                                  className="w-[300px] p-0 overflow-hidden rounded-xl shadow-xl border-border/50"
                                >
                                  {asset.imageUrl && (
                                    <div className="w-full h-28 bg-gradient-to-b from-muted/40 to-muted/10 border-b border-border/30 flex items-center justify-center p-3">
                                      <img
                                        src={asset.imageUrl}
                                        alt={asset.name}
                                        className="h-full max-w-full object-contain drop-shadow-sm"
                                      />
                                    </div>
                                  )}
                                  <div className="bg-gradient-to-r from-primary/[0.06] to-transparent px-4 py-3 border-b border-border/30">
                                    <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-primary/50 mb-0.5">
                                      Asset Name
                                    </p>
                                    <p className="text-sm font-semibold">{asset.name}</p>
                                  </div>
                                  <div className="p-4 space-y-3">
                                    <div className="grid grid-cols-2 gap-3">
                                      {[
                                        { label: "Brand", value: asset.brand },
                                        { label: "Model", value: asset.model },
                                      ].map(({ label, value }) => (
                                        <div key={label}>
                                          <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-muted-foreground/50 mb-0.5">
                                            {label}
                                          </p>
                                          <p className="text-sm">{value || "—"}</p>
                                        </div>
                                      ))}
                                    </div>
                                    <div>
                                      <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-muted-foreground/50 mb-1">
                                        Serial Number
                                      </p>
                                      <code className="text-xs bg-muted/60 px-2 py-0.5 rounded-md font-mono block w-fit">
                                        {asset.serialNumber || "N/A"}
                                      </code>
                                    </div>
                                    <DropdownMenuSeparator className="opacity-40" />
                                    <div className="flex justify-between pt-0.5">
                                      <Link
                                        href={`/assets/${asset.id}`}
                                        className="text-xs text-primary hover:underline flex items-center gap-1 font-semibold"
                                      >
                                        <Eye className="h-3 w-3" />
                                        View Details
                                      </Link>
                                      <Link
                                        href={`/assets/${asset.id}/edit`}
                                        className="text-xs text-muted-foreground hover:text-foreground hover:underline flex items-center gap-1"
                                      >
                                        <Pencil className="h-3 w-3" />
                                        Edit
                                      </Link>
                                    </div>
                                  </div>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="text-xs">
                              {asset.name}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>

                      {/* Category */}
                      <TableCell className="text-[13px] text-muted-foreground">
                        {asset.category?.name || <span className="opacity-30">—</span>}
                      </TableCell>

                      {/* Status */}
                      <TableCell>
                        <StatusBadge status={asset.status} />
                      </TableCell>

                      {/* Location */}
                      <TableCell className="text-[13px] text-muted-foreground">
                        {asset.location?.name || <span className="opacity-30">—</span>}
                      </TableCell>

                      {/* Assigned To */}
                      <TableCell className="text-[13px]">
                        {assignment?.employee?.fullName ||
                        assignment?.user?.name ||
                        assignment?.user?.email ||
                        assignment?.department?.name ? (
                          <span className="font-medium text-foreground/80">
                            {assignment?.employee?.fullName ||
                              assignment?.user?.name ||
                              assignment?.user?.email ||
                              assignment?.department?.name}
                          </span>
                        ) : (
                          <span className="text-[12px] text-muted-foreground/40 italic">
                            Unassigned
                          </span>
                        )}
                      </TableCell>

                      {/* Cost */}
                      <TableCell className="text-[13px] tabular-nums font-medium text-foreground/80">
                        {asset.cost != null ? (
                          `₹${asset.cost.toLocaleString("en-IN")}`
                        ) : (
                          <span className="text-muted-foreground/30 font-normal">—</span>
                        )}
                      </TableCell>

                      {/* Purchased From */}
                      <TableCell className="text-[13px] text-muted-foreground">
                        {asset.purchasedFromDepartment?.name || (
                          <span className="opacity-30">—</span>
                        )}
                      </TableCell>

                      {/* Purchase Date */}
                      <TableCell className="text-[13px] text-muted-foreground whitespace-nowrap">
                        {asset.purchaseDate ? (
                          format(new Date(asset.purchaseDate), "dd MMM yyyy")
                        ) : (
                          <span className="opacity-30">—</span>
                        )}
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="sticky right-0 bg-card z-10 text-right border-l border-border/30 pr-3 shadow-[-4px_0_12px_-4px_rgba(0,0,0,0.04)]">
                        <div className="flex justify-end items-center gap-0.5 opacity-60 group-hover/row:opacity-100 transition-opacity duration-150">
                          <Link
                            href={`/assets/${asset.id}`}
                            title="View"
                            className={cn(
                              buttonVariants({ variant: "ghost", size: "icon-sm" }),
                              "h-7 w-7 rounded-lg text-muted-foreground hover:text-primary",
                            )}
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Link>
                          <Link
                            href={`/assets/${asset.id}/edit`}
                            title="Edit"
                            className={cn(
                              buttonVariants({ variant: "ghost", size: "icon-sm" }),
                              "h-7 w-7 rounded-lg text-muted-foreground hover:text-primary",
                            )}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Link>
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              className={cn(
                                buttonVariants({ variant: "ghost", size: "icon-sm" }),
                                "h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground",
                              )}
                            >
                              <MoreHorizontal className="h-3.5 w-3.5" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40 p-1">
                              <DropdownMenuItem
                                render={
                                  <Link href={`/assets/${asset.id}/history`}>
                                    <History className="mr-2 h-3.5 w-3.5" />
                                    <span>History</span>
                                  </Link>
                                }
                                className="rounded-lg text-sm cursor-pointer"
                              />
                              <DropdownMenuItem
                                onClick={() => handleDuplicate(asset.id, asset.name)}
                                className="rounded-lg text-sm cursor-pointer"
                              >
                                <Copy className="mr-2 h-3.5 w-3.5" />
                                <span>Duplicate</span>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator className="opacity-40" />
                              <DropdownMenuItem
                                className="rounded-lg text-sm text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer"
                                onClick={() => handleDelete(asset.id, asset.name)}
                              >
                                <Trash2 className="mr-2 h-3.5 w-3.5" />
                                <span>Delete</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* ╔══════════════════════════════════════════════════════════════════╗
         ║  Pagination                                                     ║
         ╚══════════════════════════════════════════════════════════════════╝ */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-2">
        <p className="text-xs text-muted-foreground order-2 sm:order-1">
          Showing{" "}
          <span className="font-semibold text-foreground/80 tabular-nums">
            {totalCount === 0 ? 0 : rangeStart}–{rangeEnd}
          </span>{" "}
          of{" "}
          <span className="font-semibold text-foreground/80 tabular-nums">
            {totalCount}
          </span>{" "}
          assets
        </p>

        <div className="flex flex-wrap items-center gap-4 order-1 sm:order-2">
          {/* Rows */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-muted-foreground">Rows per page</span>
            <select
              value={currentLimit}
              onChange={(e) => updatePageSize(e.target.value)}
              className="h-8 rounded-lg border border-border/40 bg-card px-2 py-1 text-xs shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors cursor-pointer"
            >
              {[10, 25, 50, 100].map((ps) => (
                <option key={ps} value={ps}>
                  {ps}
                </option>
              ))}
            </select>
          </div>

          {/* Page nav */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-muted-foreground min-w-[70px] text-center tabular-nums">
              {currentPage} / {totalPages}
            </span>
            <div className="flex items-center gap-0.5 bg-muted/30 rounded-lg p-0.5 border border-border/40 shadow-3xs">
              {[
                { icon: ChevronsLeft, label: "First", onClick: () => updatePage(1), disabled: currentPage <= 1 },
                { icon: ChevronLeft, label: "Previous", onClick: () => updatePage(currentPage - 1), disabled: currentPage <= 1 },
                { icon: ChevronRight, label: "Next", onClick: () => updatePage(currentPage + 1), disabled: currentPage >= totalPages },
                { icon: ChevronsRight, label: "Last", onClick: () => updatePage(totalPages), disabled: currentPage >= totalPages },
              ].map(({ icon: Icon, label, onClick, disabled }) => (
                <button
                  key={label}
                  onClick={onClick}
                  disabled={disabled}
                  title={label}
                  className={cn(
                    "h-6.5 w-6.5 inline-flex items-center justify-center rounded-md",
                    "text-xs transition-all duration-150",
                    disabled
                      ? "cursor-not-allowed opacity-30"
                      : "hover:bg-background hover:shadow-2xs text-muted-foreground hover:text-foreground",
                  )}
                >
                  <span className="sr-only">{label}</span>
                  <Icon className="h-3.5 w-3.5" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
