"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useMemo, useState, useTransition, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Search,
  Trash2,
  X,
  Check,
  ChevronDown,
  RotateCcw,
  UserRound,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Tag,
  MapPin,
  Building2,
  Layers,
  UserCheck,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
import { useDebouncedCallback } from "use-debounce";
import { bulkDeleteAssets } from "@/app/actions/asset-actions";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { confirmDialog } from "@/components/ui/confirm-dialog";
import { cn } from "@/lib/utils";

interface AssetTableToolbarProps {
  selectedIds: string[];
  onClearSelection: () => void;
  categories: { id: string; name: string }[];
  locations: { id: string; name: string }[];
  vendors: { id: string; name: string }[];
  employees: { id: string; name: string }[];
  departments: { id: string; name: string }[];
}

type FilterChip = {
  label: string;
  key: string;
  value: string | null;
  type: "multi" | "single";
};

/* ── Status colour palette ── */
const STATUS_CONFIG: Record<
  string,
  { label: string; bg: string; text: string; dot: string; ring: string }
> = {
  ACTIVE: {
    label: "Active",
    bg: "bg-emerald-500/10",
    text: "text-emerald-600 dark:text-emerald-400",
    dot: "bg-emerald-500",
    ring: "ring-emerald-500/20",
  },
  ASSIGNED: {
    label: "Assigned",
    bg: "bg-sky-500/10",
    text: "text-sky-600 dark:text-sky-400",
    dot: "bg-sky-500",
    ring: "ring-sky-500/20",
  },
  REPAIR: {
    label: "Repair",
    bg: "bg-amber-500/10",
    text: "text-amber-600 dark:text-amber-400",
    dot: "bg-amber-500",
    ring: "ring-amber-500/20",
  },
  DISPOSED: {
    label: "Disposed",
    bg: "bg-rose-500/10",
    text: "text-rose-600 dark:text-rose-400",
    dot: "bg-rose-500",
    ring: "ring-rose-500/20",
  },
  LOST: {
    label: "Lost",
    bg: "bg-zinc-500/10",
    text: "text-zinc-500 dark:text-zinc-400",
    dot: "bg-zinc-400",
    ring: "ring-zinc-400/20",
  },
};

export { STATUS_CONFIG };

export function AssetTableToolbar({
  selectedIds,
  onClearSelection,
  categories,
  locations,
  vendors,
  employees,
  departments,
}: AssetTableToolbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [searchTerm, setSearchTerm] = useState(searchParams.get("query") || "");
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [locationSearch, setLocationSearch] = useState("");
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const filtersRef = useRef<HTMLDivElement>(null);

  const activeStatus =
    searchParams.get("status")?.split(",").filter(Boolean) || [];
  const activeCategories =
    searchParams.get("categoryId")?.split(",").filter(Boolean) || [];
  const activeLocations =
    searchParams.get("locationId")?.split(",").filter(Boolean) || [];
  const activeVendor = searchParams.get("vendorId");
  const activeEmployee = searchParams.get("employeeId");
  const activePurchasedFromDepartment = searchParams.get("purchasedFromDepartmentId");
  const activeAssignment = searchParams.get("assignmentStatus");
  const activeQuickFilter = searchParams.get("quickFilter");
  const activeSortBy = searchParams.get("sortBy") || "createdAt";
  const activeOrder = searchParams.get("order") || "desc";

  const totalActiveFilters =
    activeStatus.length +
    activeCategories.length +
    activeLocations.length +
    (activeVendor ? 1 : 0) +
    (activeEmployee ? 1 : 0) +
    (activePurchasedFromDepartment ? 1 : 0) +
    (activeAssignment ? 1 : 0);

  // Auto-expand filters when any are active
  useEffect(() => {
    if (totalActiveFilters > 0) setFiltersExpanded(true);
  }, [totalActiveFilters]);

  /* ── URL helpers ── */
  const updateFilters = (updates: Record<string, string | string[] | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === "" || (Array.isArray(value) && value.length === 0)) {
        params.delete(key);
      } else if (Array.isArray(value)) {
        params.set(key, value.join(","));
      } else {
        params.set(key, value);
      }
    });
    params.set("page", "1");
    router.push(`${pathname}?${params.toString()}`);
  };

  const clearAllFilters = () => {
    const params = new URLSearchParams();
    const sortBy = searchParams.get("sortBy");
    const order = searchParams.get("order");
    const limit = searchParams.get("limit");
    if (sortBy) params.set("sortBy", sortBy);
    if (order) params.set("order", order);
    if (limit) params.set("limit", limit);
    setSearchTerm("");
    setEmployeeSearch("");
    setLocationSearch("");
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleSearch = useDebouncedCallback((term: string) => {
    updateFilters({ query: term || null });
  }, 300);

  const onSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    handleSearch(value);
  };

  const clearSearch = () => {
    setSearchTerm("");
    handleSearch("");
  };

  const toggleFilter = (key: string, value: string, current: string[]) => {
    const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
    updateFilters({ [key]: next });
  };

  const handleBulkDelete = async () => {
    if (!selectedIds.length) return;
    const ok = await confirmDialog({
      title: `Delete ${selectedIds.length} assets?`,
      description: "This will permanently delete all selected assets and their associated records. This action cannot be undone.",
      confirmLabel: `Delete ${selectedIds.length} Assets`,
      variant: "danger",
    });
    if (!ok) return;
    startTransition(async () => {
      try {
        await bulkDeleteAssets(selectedIds);
        toast.success(`Successfully deleted ${selectedIds.length} assets`);
        onClearSelection();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to delete assets");
      }
    });
  };

  /* ── Options ── */
  const statusOptions = Object.entries(STATUS_CONFIG).map(([value, cfg]) => ({
    label: cfg.label,
    value,
  }));

  const sortOptions = [
    { label: "Latest Added", value: "createdAt", order: "desc", icon: ArrowDown },
    { label: "Oldest Added", value: "createdAt", order: "asc", icon: ArrowUp },
    { label: "Latest Assigned", value: "assignedAt", order: "desc", icon: ArrowDown },
    { label: "Name A → Z", value: "name", order: "asc", icon: ArrowUp },
    { label: "Name Z → A", value: "name", order: "desc", icon: ArrowDown },
    { label: "Status ↑", value: "status", order: "asc", icon: ArrowUp },
    { label: "Status ↓", value: "status", order: "desc", icon: ArrowDown },
    { label: "Purchase Date ↓", value: "purchaseDate", order: "desc", icon: ArrowDown },
    { label: "Purchase Date ↑", value: "purchaseDate", order: "asc", icon: ArrowUp },
    { label: "Purchased From A → Z", value: "purchasedFromDepartment", order: "asc", icon: ArrowUp },
    { label: "Purchased From Z → A", value: "purchasedFromDepartment", order: "desc", icon: ArrowDown },
  ];

  const quickFilters = [
    { label: "All Assets", value: null, icon: Sparkles },
    { label: "Assigned", value: "assigned", icon: UserCheck },
    { label: "Unassigned", value: "unassigned", icon: Layers },
    { label: "In Repair", value: "in_repair", icon: RotateCcw },
    { label: "Recently Added", value: "recently_added", icon: Sparkles },
  ];

  const activeSortOption = sortOptions.find(
    (s) => s.value === activeSortBy && s.order === activeOrder,
  );

  const filteredEmployees = useMemo(
    () => employees.filter((e) => e.name.toLowerCase().includes(employeeSearch.toLowerCase())),
    [employees, employeeSearch],
  );

  const filteredLocations = useMemo(
    () => locations.filter((l) => l.name.toLowerCase().includes(locationSearch.toLowerCase())),
    [locations, locationSearch],
  );

  const activeEmployeeLabel = employees.find((e) => e.id === activeEmployee)?.name || null;
  const activeLocationLabel =
    activeLocations.length === 1
      ? locations.find((l) => l.id === activeLocations[0])?.name || null
      : null;

  /* ── Filter chips ── */
  const getFilterChips = (): FilterChip[] => {
    const chips: FilterChip[] = [];
    activeStatus.forEach((v) => {
      chips.push({ label: STATUS_CONFIG[v]?.label || v, key: "status", value: v, type: "multi" });
    });
    activeCategories.forEach((v) => {
      const l = categories.find((o) => o.id === v)?.name || v;
      chips.push({ label: l, key: "categoryId", value: v, type: "multi" });
    });
    activeLocations.forEach((v) => {
      const l = locations.find((o) => o.id === v)?.name || v;
      chips.push({ label: l, key: "locationId", value: v, type: "multi" });
    });
    if (activeVendor) {
      chips.push({ label: vendors.find((o) => o.id === activeVendor)?.name || activeVendor, key: "vendorId", value: null, type: "single" });
    }
    if (activePurchasedFromDepartment) {
      chips.push({ label: departments.find((o) => o.id === activePurchasedFromDepartment)?.name || activePurchasedFromDepartment, key: "purchasedFromDepartmentId", value: null, type: "single" });
    }
    if (activeEmployee) {
      chips.push({ label: employees.find((o) => o.id === activeEmployee)?.name || activeEmployee, key: "employeeId", value: null, type: "single" });
    }
    if (activeAssignment) {
      chips.push({ label: activeAssignment === "assigned" ? "Assigned" : "Unassigned", key: "assignmentStatus", value: null, type: "single" });
    }
    return chips;
  };

  const filterChips = getFilterChips();

  /* ── Shared trigger styles ── */
  const triggerCls = (active: boolean) =>
    cn(
      "inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs font-semibold uppercase tracking-wider",
      "border shadow-2xs cursor-pointer select-none",
      "transition-all duration-300 ease-out",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      "hover:shadow-xs hover:border-muted-foreground/30",
      active
        ? "border-primary/20 bg-primary/8 text-primary shadow-xs"
        : "border-border/60 bg-card text-muted-foreground/80 hover:text-foreground hover:bg-muted/30",
    );

  const countBubble = (n: number) =>
    n > 0 ? (
      <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground leading-none px-1 shadow-sm">
        {n}
      </span>
    ) : null;

  const menuLabel = (text: string) => (
    <p className="px-2 pb-1 pt-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground/70">
      {text}
    </p>
  );

  return (
    <div className="space-y-0">
      {/* ╔══════════════════════════════════════════════════════════════════╗
         ║  Search Row                                                     ║
         ╚══════════════════════════════════════════════════════════════════╝ */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between py-4 pb-3">
        {/* Search Input */}
        <div className="relative flex-1 max-w-sm group/search">
          <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-focus-within/search:opacity-100 transition-opacity duration-300 -m-0.5 pointer-events-none" />
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60 pointer-events-none transition-colors group-focus-within/search:text-primary" />
          <Input
            placeholder="Search by name, tag, code, serial…"
            className="pl-10 pr-10 h-10 rounded-xl border-border/60 bg-card shadow-sm text-sm focus-visible:border-primary/40 focus-visible:ring-2 focus-visible:ring-primary/10 transition-all duration-200"
            value={searchTerm}
            onChange={onSearchChange}
          />
          {searchTerm && (
            <button
              type="button"
              onClick={clearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground/60 hover:text-foreground hover:bg-muted/80 transition-all duration-150"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Quick Filter Tabs */}
        <div className="flex items-center gap-0.5 rounded-xl bg-muted/40 p-0.5 border border-border/40 shadow-3xs overflow-x-auto no-scrollbar">
          {quickFilters.map((q) => {
            const Icon = q.icon;
            const isActive =
              activeQuickFilter === q.value ||
              (q.value === null && !activeQuickFilter && !activeAssignment && activeStatus.length === 0);

            return (
              <button
                key={q.label}
                onClick={() =>
                  updateFilters({
                    quickFilter: q.value,
                    assignmentStatus: null,
                    status: q.value === "in_repair" ? ["REPAIR"] : null,
                  })
                }
                className={cn(
                  "relative inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider whitespace-nowrap",
                  "transition-all duration-200 ease-out",
                  isActive
                    ? "bg-background text-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-background/40",
                )}
              >
                <Icon className={cn("h-3 w-3", isActive ? "text-primary scale-110" : "text-muted-foreground/80")} />
                {q.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ╔══════════════════════════════════════════════════════════════════╗
         ║  Advanced Filters Bar                                           ║
         ╚══════════════════════════════════════════════════════════════════╝ */}
      <div className="space-y-2">
        {/* Toggle + Sort row */}
        <div className="flex items-center justify-between gap-2">
          <button
            onClick={() => setFiltersExpanded((v) => !v)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold uppercase tracking-wider",
              "border border-border/60 bg-card shadow-2xs cursor-pointer",
              "transition-all duration-200 hover:shadow-xs hover:border-muted-foreground/30",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              filtersExpanded && "bg-primary/8 border-primary/20 text-primary",
            )}
          >
            <SlidersHorizontal className={cn("h-3 w-3", filtersExpanded ? "text-primary scale-110" : "text-muted-foreground/80")} />
            Filters
            {totalActiveFilters > 0 && (
              <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground leading-none px-1">
                {totalActiveFilters}
              </span>
            )}
            <ChevronDown
              className={cn(
                "h-3 w-3 opacity-50 transition-transform duration-200",
                filtersExpanded && "rotate-180",
              )}
            />
          </button>

          <div className="flex items-center gap-2">
            {/* Sort */}
            <DropdownMenu>
              <DropdownMenuTrigger className={triggerCls(!!activeSortOption)}>
                <ArrowUpDown className="h-3.5 w-3.5" />
                <span className="hidden sm:inline max-w-[120px] truncate">
                  {activeSortOption?.label || "Sort"}
                </span>
                <ChevronDown className="h-3 w-3 opacity-40" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[230px] p-1.5">
                {menuLabel("Sort By")}
                <DropdownMenuSeparator className="my-1 opacity-50" />
                {sortOptions.map((opt) => {
                  const isActive = activeSortBy === opt.value && activeOrder === opt.order;
                  const Icon = opt.icon;
                  return (
                    <DropdownMenuItem
                      key={`${opt.value}-${opt.order}`}
                      className={cn(
                        "rounded-lg flex items-center gap-2 py-2 px-2.5 cursor-pointer",
                        isActive && "bg-primary/[0.07] text-primary",
                      )}
                      onClick={() => updateFilters({ sortBy: opt.value, order: opt.order })}
                    >
                      <Icon className="h-3.5 w-3.5 shrink-0 opacity-50" />
                      <span className="flex-1 text-[13px]">{opt.label}</span>
                      {isActive && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Bulk selection */}
            {selectedIds.length > 0 && (
              <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-3 duration-200 rounded-xl border border-destructive/20 bg-destructive/[0.04] px-3 py-1.5 shadow-sm">
                <span className="text-xs font-bold text-destructive tabular-nums">
                  {selectedIds.length}
                </span>
                <span className="text-xs text-destructive/70">selected</span>
                <div className="h-3.5 w-px bg-destructive/15" />
                <Button
                  variant="destructive"
                  size="sm"
                  className="h-6 text-[11px] px-2 rounded-md shadow-sm"
                  loading={isPending}
                  onClick={handleBulkDelete}
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Delete
                </Button>
                <button
                  onClick={onClearSelection}
                  className="text-[11px] text-muted-foreground hover:text-foreground transition-colors px-1"
                >
                  Clear
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Expandable filter panel */}
        <div
          ref={filtersRef}
          className={cn(
            "grid transition-all duration-300 ease-[cubic-bezier(.4,0,.2,1)]",
            filtersExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
          )}
        >
          <div className="overflow-hidden">
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/50 bg-muted/20 p-3 backdrop-blur-sm shadow-inner">
              {/* Status */}
              <DropdownMenu>
                <DropdownMenuTrigger className={triggerCls(activeStatus.length > 0)}>
                  <Tag className="h-3.5 w-3.5" />
                  Status
                  {countBubble(activeStatus.length)}
                  <ChevronDown className="h-3 w-3 opacity-40" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-[210px] p-1.5">
                  {menuLabel("Filter by Status")}
                  <DropdownMenuSeparator className="my-1 opacity-50" />
                  {statusOptions.map((opt) => {
                    const cfg = STATUS_CONFIG[opt.value];
                    return (
                      <DropdownMenuCheckboxItem
                        key={opt.value}
                        checked={activeStatus.includes(opt.value)}
                        onCheckedChange={() => toggleFilter("status", opt.value, activeStatus)}
                        className="rounded-lg py-2 px-2 cursor-pointer"
                      >
                        <span className={cn("inline-flex items-center gap-2 text-[13px] font-medium", cfg.text)}>
                          <span className={cn("h-2 w-2 rounded-full ring-2 shadow-sm", cfg.dot, cfg.ring)} />
                          {opt.label}
                        </span>
                      </DropdownMenuCheckboxItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Category */}
              <DropdownMenu>
                <DropdownMenuTrigger className={triggerCls(activeCategories.length > 0)}>
                  <Layers className="h-3.5 w-3.5" />
                  Category
                  {countBubble(activeCategories.length)}
                  <ChevronDown className="h-3 w-3 opacity-40" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-[220px] max-h-[280px] overflow-y-auto p-1.5">
                  {menuLabel("Filter by Category")}
                  <DropdownMenuSeparator className="my-1 opacity-50" />
                  {categories.map((opt) => (
                    <DropdownMenuCheckboxItem
                      key={opt.id}
                      checked={activeCategories.includes(opt.id)}
                      onCheckedChange={() => toggleFilter("categoryId", opt.id, activeCategories)}
                      className="rounded-lg py-1.5 cursor-pointer"
                    >
                      {opt.name}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Location */}
              <DropdownMenu onOpenChange={(open) => !open && setLocationSearch("")}>
                <DropdownMenuTrigger className={triggerCls(activeLocations.length > 0)}>
                  <MapPin className="h-3.5 w-3.5" />
                  {activeLocationLabel || "Location"}
                  {activeLocations.length > 1 && countBubble(activeLocations.length)}
                  <ChevronDown className="h-3 w-3 opacity-40" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-[240px] p-0">
                  <div className="p-2.5 border-b border-border/40">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" />
                      <input
                        className="w-full rounded-lg border border-input bg-background pl-8 pr-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 placeholder:text-muted-foreground/50 transition-all"
                        placeholder="Search locations…"
                        value={locationSearch}
                        onChange={(e) => setLocationSearch(e.target.value)}
                        autoFocus
                      />
                    </div>
                  </div>
                  <div className="max-h-[220px] overflow-y-auto p-1.5 space-y-0.5">
                    {filteredLocations.length === 0 ? (
                      <div className="px-3 py-8 text-center text-sm text-muted-foreground/60">
                        No locations found
                      </div>
                    ) : (
                      filteredLocations.map((opt) => (
                        <DropdownMenuCheckboxItem
                          key={opt.id}
                          checked={activeLocations.includes(opt.id)}
                          onCheckedChange={() => toggleFilter("locationId", opt.id, activeLocations)}
                          className="rounded-lg py-1.5 cursor-pointer"
                        >
                          {opt.name}
                        </DropdownMenuCheckboxItem>
                      ))
                    )}
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Vendor */}
              <DropdownMenu>
                <DropdownMenuTrigger className={triggerCls(!!activeVendor)}>
                  <Building2 className="h-3.5 w-3.5" />
                  Vendor
                  {activeVendor && <span className="h-1.5 w-1.5 rounded-full bg-primary animate-in zoom-in duration-200" />}
                  <ChevronDown className="h-3 w-3 opacity-40" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-[220px] max-h-[280px] overflow-y-auto p-1.5">
                  {menuLabel("Filter by Vendor")}
                  <DropdownMenuSeparator className="my-1 opacity-50" />
                  <DropdownMenuItem
                    onClick={() => updateFilters({ vendorId: null })}
                    className="rounded-lg flex items-center justify-between py-1.5 cursor-pointer"
                  >
                    All Vendors
                    {!activeVendor && <Check className="h-3.5 w-3.5 text-primary" />}
                  </DropdownMenuItem>
                  {vendors.map((opt) => (
                    <DropdownMenuItem
                      key={opt.id}
                      className="rounded-lg flex items-center justify-between py-1.5 cursor-pointer"
                      onClick={() => updateFilters({ vendorId: opt.id })}
                    >
                      {opt.name}
                      {activeVendor === opt.id && <Check className="h-3.5 w-3.5 text-primary" />}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Purchased From */}
              <DropdownMenu>
                <DropdownMenuTrigger className={triggerCls(!!activePurchasedFromDepartment)}>
                  <Building2 className="h-3.5 w-3.5" />
                  Purchased From
                  {activePurchasedFromDepartment && <span className="h-1.5 w-1.5 rounded-full bg-primary animate-in zoom-in duration-200" />}
                  <ChevronDown className="h-3 w-3 opacity-40" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-[220px] max-h-[280px] overflow-y-auto p-1.5">
                  {menuLabel("Purchased From")}
                  <DropdownMenuSeparator className="my-1 opacity-50" />
                  <DropdownMenuItem
                    onClick={() => updateFilters({ purchasedFromDepartmentId: null })}
                    className="rounded-lg flex items-center justify-between py-1.5 cursor-pointer"
                  >
                    All Companies
                    {!activePurchasedFromDepartment && <Check className="h-3.5 w-3.5 text-primary" />}
                  </DropdownMenuItem>
                  {departments.map((opt) => (
                    <DropdownMenuItem
                      key={opt.id}
                      className="rounded-lg flex items-center justify-between py-1.5 cursor-pointer"
                      onClick={() => updateFilters({ purchasedFromDepartmentId: opt.id })}
                    >
                      {opt.name}
                      {activePurchasedFromDepartment === opt.id && <Check className="h-3.5 w-3.5 text-primary" />}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Assignment */}
              <DropdownMenu>
                <DropdownMenuTrigger className={triggerCls(!!activeAssignment)}>
                  <UserCheck className="h-3.5 w-3.5" />
                  Assignment
                  {activeAssignment && <span className="h-1.5 w-1.5 rounded-full bg-primary animate-in zoom-in duration-200" />}
                  <ChevronDown className="h-3 w-3 opacity-40" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-[180px] p-1.5">
                  {menuLabel("Assignment Status")}
                  <DropdownMenuSeparator className="my-1 opacity-50" />
                  {[
                    { label: "All", value: null },
                    { label: "Assigned", value: "assigned" },
                    { label: "Unassigned", value: "unassigned" },
                  ].map((opt) => (
                    <DropdownMenuItem
                      key={opt.label}
                      className="rounded-lg flex items-center justify-between py-1.5 cursor-pointer"
                      onClick={() => updateFilters({ assignmentStatus: opt.value })}
                    >
                      {opt.label}
                      {(activeAssignment === opt.value || (!activeAssignment && opt.value === null)) && (
                        <Check className="h-3.5 w-3.5 text-primary" />
                      )}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Employee */}
              <DropdownMenu onOpenChange={(open) => !open && setEmployeeSearch("")}>
                <DropdownMenuTrigger className={triggerCls(!!activeEmployee)}>
                  <UserRound className="h-3.5 w-3.5" />
                  {activeEmployeeLabel || "Assigned To"}
                  {activeEmployee && <span className="h-1.5 w-1.5 rounded-full bg-primary animate-in zoom-in duration-200" />}
                  <ChevronDown className="h-3 w-3 opacity-40" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-[240px] p-0">
                  <div className="p-2.5 border-b border-border/40">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" />
                      <input
                        className="w-full rounded-lg border border-input bg-background pl-8 pr-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 placeholder:text-muted-foreground/50 transition-all"
                        placeholder="Search employees…"
                        value={employeeSearch}
                        onChange={(e) => setEmployeeSearch(e.target.value)}
                        autoFocus
                      />
                    </div>
                  </div>
                  <div className="max-h-[220px] overflow-y-auto p-1.5 space-y-0.5">
                    <DropdownMenuItem
                      className="rounded-lg flex items-center justify-between py-1.5 cursor-pointer"
                      onClick={() => updateFilters({ employeeId: null })}
                    >
                      All Employees
                      {!activeEmployee && <Check className="h-3.5 w-3.5 text-primary" />}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    {filteredEmployees.length === 0 ? (
                      <div className="px-3 py-8 text-center text-sm text-muted-foreground/60">
                        No employees found
                      </div>
                    ) : (
                      filteredEmployees.map((emp) => (
                        <DropdownMenuItem
                          key={emp.id}
                          className="rounded-lg flex items-center justify-between py-1.5 cursor-pointer"
                          onClick={() => updateFilters({ employeeId: emp.id })}
                        >
                          <span className="truncate">{emp.name}</span>
                          {activeEmployee === emp.id && <Check className="ml-2 h-3.5 w-3.5 shrink-0 text-primary" />}
                        </DropdownMenuItem>
                      ))
                    )}
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Clear all (inside panel) */}
              {totalActiveFilters > 0 && (
                <>
                  <div className="h-5 w-px bg-border/40 mx-1" />
                  <button
                    onClick={clearAllFilters}
                    className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-medium text-muted-foreground hover:text-foreground hover:bg-background/80 transition-all duration-150"
                  >
                    <RotateCcw className="h-3 w-3" />
                    Clear all
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ╔══════════════════════════════════════════════════════════════════╗
         ║  Active Filter Chips                                            ║
         ╚══════════════════════════════════════════════════════════════════╝ */}
      {(filterChips.length > 0 || searchTerm) && (
        <div className="flex flex-wrap items-center gap-1.5 pt-3 animate-in fade-in slide-in-from-top-2 duration-300">
          <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground/50 mr-1">
            Showing
          </span>

          {searchTerm && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-card border border-border/60 px-2.5 py-1 text-xs font-medium shadow-sm transition-all hover:shadow-md group">
              <Search className="h-3 w-3 text-muted-foreground/60" />
              <span className="max-w-[140px] truncate">&ldquo;{searchTerm}&rdquo;</span>
              <button
                type="button"
                onClick={clearSearch}
                className="rounded-full p-0.5 text-muted-foreground/40 hover:text-foreground hover:bg-muted transition-all"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}

          {filterChips.map((chip, i) => {
            const chipKey = chip.key as keyof typeof CHIP_ICONS;
            const ChipIcon = CHIP_ICONS[chipKey] || Tag;
            return (
              <span
                key={i}
                className="inline-flex items-center gap-1.5 rounded-full border border-primary/15 bg-primary/[0.04] px-2.5 py-1 text-xs font-medium text-primary shadow-sm transition-all hover:shadow-md hover:bg-primary/[0.08] animate-in fade-in zoom-in-95 duration-200"
                style={{ animationDelay: `${i * 40}ms` }}
              >
                <ChipIcon className="h-3 w-3 opacity-50" />
                {chip.label}
                <button
                  type="button"
                  onClick={() => {
                    if (chip.type === "multi" && chip.value) {
                      toggleFilter(chip.key, chip.value, searchParams.get(chip.key)?.split(",").filter(Boolean) || []);
                    } else {
                      updateFilters({ [chip.key]: null });
                    }
                  }}
                  className="rounded-full p-0.5 text-primary/40 hover:text-primary hover:bg-primary/10 transition-all"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* Icon mapping for filter chips */
const CHIP_ICONS: Record<string, React.ElementType> = {
  status: Tag,
  categoryId: Layers,
  locationId: MapPin,
  vendorId: Building2,
  purchasedFromDepartmentId: Building2,
  employeeId: UserRound,
  assignmentStatus: UserCheck,
};
