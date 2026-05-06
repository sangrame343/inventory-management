"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Search,
  Trash2,
  X,
  Filter,
  Check,
  ChevronDown,
  RotateCcw,
  UserRound,
  CalendarClock,
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
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface AssetTableToolbarProps {
  selectedIds: string[];
  onClearSelection: () => void;
  categories: { id: string; name: string }[];
  locations: { id: string; name: string }[];
  vendors: { id: string; name: string }[];
  employees: { id: string; name: string }[];
}

type FilterChip = {
  label: string;
  key: string;
  value: string | null;
  type: "multi" | "single";
};

function MenuLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
      {children}
    </div>
  );
}

export function AssetTableToolbar({
  selectedIds,
  onClearSelection,
  categories,
  locations,
  vendors,
  employees,
}: AssetTableToolbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [searchTerm, setSearchTerm] = useState(searchParams.get("query") || "");
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [locationSearch, setLocationSearch] = useState("");

  const activeStatus =
    searchParams.get("status")?.split(",").filter(Boolean) || [];
  const activeCategories =
    searchParams.get("categoryId")?.split(",").filter(Boolean) || [];
  const activeLocations =
    searchParams.get("locationId")?.split(",").filter(Boolean) || [];
  const activeVendor = searchParams.get("vendorId");
  const activeEmployee = searchParams.get("employeeId");
  const activeAssignment = searchParams.get("assignmentStatus");
  const activeQuickFilter = searchParams.get("quickFilter");
  const activeSortBy = searchParams.get("sortBy") || "createdAt";
  const activeOrder = searchParams.get("order") || "desc";

  const updateFilters = (updates: Record<string, string | string[] | null>) => {
    const params = new URLSearchParams(searchParams.toString());

    Object.entries(updates).forEach(([key, value]) => {
      if (
        value === null ||
        value === "" ||
        (Array.isArray(value) && value.length === 0)
      ) {
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
    const next =
      current.includes(value) ?
        current.filter((v) => v !== value)
      : [...current, value];

    updateFilters({ [key]: next });
  };

  const handleBulkDelete = async () => {
    if (!selectedIds.length) return;

    if (
      !confirm(`Are you sure you want to delete ${selectedIds.length} assets?`)
    ) {
      return;
    }

    startTransition(async () => {
      try {
        await bulkDeleteAssets(selectedIds);
        toast.success(`Successfully deleted ${selectedIds.length} assets`);
        onClearSelection();
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to delete assets",
        );
      }
    });
  };

  const statusOptions = [
    { label: "Active", value: "ACTIVE" },
    { label: "Assigned", value: "ASSIGNED" },
    { label: "Repair", value: "REPAIR" },
    { label: "Disposed", value: "DISPOSED" },
    { label: "Lost", value: "LOST" },
  ];

  const sortOptions = [
    { label: "Latest Added", value: "createdAt", order: "desc" },
    { label: "Oldest Added", value: "createdAt", order: "asc" },
    { label: "Latest Assigned", value: "assignedAt", order: "desc" },
    { label: "Name (A-Z)", value: "name", order: "asc" },
    { label: "Name (Z-A)", value: "name", order: "desc" },
    { label: "Purchase Date (Newest)", value: "purchaseDate", order: "desc" },
    { label: "Purchase Date (Oldest)", value: "purchaseDate", order: "asc" },
  ];

  const quickFilters = [
    { label: "All", value: null },
    { label: "Assigned", value: "assigned" },
    { label: "Unassigned", value: "unassigned" },
    { label: "In Repair", value: "in_repair" },
    { label: "Recently Added", value: "recently_added" },
  ];

  const activeSortOption = sortOptions.find(
    (s) => s.value === activeSortBy && s.order === activeOrder,
  );

  const filteredEmployees = useMemo(
    () =>
      employees.filter((e) =>
        e.name.toLowerCase().includes(employeeSearch.toLowerCase()),
      ),
    [employees, employeeSearch],
  );

  const filteredLocations = useMemo(
    () =>
      locations.filter((l) =>
        l.name.toLowerCase().includes(locationSearch.toLowerCase()),
      ),
    [locations, locationSearch],
  );

  const activeEmployeeLabel =
    employees.find((e) => e.id === activeEmployee)?.name || "Assigned To";

  const activeLocationLabel =
    activeLocations.length === 1 ?
      locations.find((l) => l.id === activeLocations[0])?.name || "Location"
    : "Location";

  const getFilterChips = (): FilterChip[] => {
    const chips: FilterChip[] = [];

    activeStatus.forEach((v) => {
      const label = statusOptions.find((o) => o.value === v)?.label || v;
      chips.push({
        label: `Status: ${label}`,
        key: "status",
        value: v,
        type: "multi",
      });
    });

    activeCategories.forEach((v) => {
      const label = categories.find((o) => o.id === v)?.name || v;
      chips.push({
        label: `Category: ${label}`,
        key: "categoryId",
        value: v,
        type: "multi",
      });
    });

    activeLocations.forEach((v) => {
      const label = locations.find((o) => o.id === v)?.name || v;
      chips.push({
        label: `Location: ${label}`,
        key: "locationId",
        value: v,
        type: "multi",
      });
    });

    if (activeVendor) {
      const label =
        vendors.find((o) => o.id === activeVendor)?.name || activeVendor;
      chips.push({
        label: `Vendor: ${label}`,
        key: "vendorId",
        value: null,
        type: "single",
      });
    }

    if (activeEmployee) {
      const label =
        employees.find((o) => o.id === activeEmployee)?.name || activeEmployee;
      chips.push({
        label: `Assigned To: ${label}`,
        key: "employeeId",
        value: null,
        type: "single",
      });
    }

    if (activeAssignment) {
      chips.push({
        label: `Assignment: ${activeAssignment}`,
        key: "assignmentStatus",
        value: null,
        type: "single",
      });
    }

    return chips;
  };

  const filterChips = getFilterChips();

  return (
    <div className="space-y-4 py-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 items-center gap-2 max-w-md relative">
          <div className="relative w-full">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search assets (name, tag, code, S/N)..."
              className="pl-9 pr-9"
              value={searchTerm}
              onChange={onSearchChange}
            />
            {searchTerm && (
              <button
                type="button"
                onClick={clearSearch}
                className="absolute right-2.5 top-2.5 hover:text-foreground text-muted-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {quickFilters.map((q) => {
            const isActive =
              activeQuickFilter === q.value ||
              (q.value === null &&
                !activeQuickFilter &&
                !activeAssignment &&
                activeStatus.length === 0);

            return (
              <Button
                key={q.label}
                variant={isActive ? "default" : "outline"}
                size="sm"
                className="h-8 whitespace-nowrap"
                onClick={() =>
                  updateFilters({
                    quickFilter: q.value,
                    assignmentStatus: null,
                    status: q.value === "in_repair" ? ["REPAIR"] : null,
                  })
                }
              >
                {q.label}
              </Button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "h-8 border-dashed",
            )}
          >
            <Filter className="mr-2 h-4 w-4" />
            Status
            {activeStatus.length > 0 && (
              <Badge
                variant="secondary"
                className="ml-2 px-1 text-[10px] h-4 min-w-4"
              >
                {activeStatus.length}
              </Badge>
            )}
          </DropdownMenuTrigger>

          <DropdownMenuContent align="start" className="w-[180px]">
            <MenuLabel>Filter by Status</MenuLabel>
            <DropdownMenuSeparator />
            {statusOptions.map((opt) => (
              <DropdownMenuCheckboxItem
                key={opt.value}
                checked={activeStatus.includes(opt.value)}
                onCheckedChange={() =>
                  toggleFilter("status", opt.value, activeStatus)
                }
              >
                {opt.label}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "h-8 border-dashed",
            )}
          >
            <Filter className="mr-2 h-4 w-4" />
            Category
            {activeCategories.length > 0 && (
              <Badge
                variant="secondary"
                className="ml-2 px-1 text-[10px] h-4 min-w-4"
              >
                {activeCategories.length}
              </Badge>
            )}
          </DropdownMenuTrigger>

          <DropdownMenuContent
            align="start"
            className="w-[200px] max-h-[300px] overflow-y-auto"
          >
            <MenuLabel>Filter by Category</MenuLabel>
            <DropdownMenuSeparator />
            {categories.map((opt) => (
              <DropdownMenuCheckboxItem
                key={opt.id}
                checked={activeCategories.includes(opt.id)}
                onCheckedChange={() =>
                  toggleFilter("categoryId", opt.id, activeCategories)
                }
              >
                {opt.name}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu onOpenChange={(open) => !open && setLocationSearch("")}>
          <DropdownMenuTrigger
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "h-8 border-dashed",
            )}
          >
            <Filter className="mr-2 h-4 w-4" />
            {activeLocationLabel}
            {activeLocations.length > 1 && (
              <Badge
                variant="secondary"
                className="ml-2 px-1 text-[10px] h-4 min-w-4"
              >
                {activeLocations.length}
              </Badge>
            )}
          </DropdownMenuTrigger>

          <DropdownMenuContent align="start" className="w-[220px] p-0">
            <div className="p-2 border-b">
              <input
                className="w-full px-2 py-1 text-sm rounded-md border border-input bg-background outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground"
                placeholder="Search location..."
                value={locationSearch}
                onChange={(e) => setLocationSearch(e.target.value)}
                autoFocus
              />
            </div>

            <div className="max-h-[240px] overflow-y-auto py-1">
              {filteredLocations.length === 0 ?
                <div className="px-3 py-4 text-center text-sm text-muted-foreground">
                  No locations found
                </div>
              : filteredLocations.map((opt) => (
                  <DropdownMenuCheckboxItem
                    key={opt.id}
                    checked={activeLocations.includes(opt.id)}
                    onCheckedChange={() =>
                      toggleFilter("locationId", opt.id, activeLocations)
                    }
                  >
                    {opt.name}
                  </DropdownMenuCheckboxItem>
                ))
              }
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "h-8 border-dashed",
            )}
          >
            <Filter className="mr-2 h-4 w-4" />
            Vendor
            {activeVendor && <Check className="ml-2 h-3 w-3 text-primary" />}
          </DropdownMenuTrigger>

          <DropdownMenuContent
            align="start"
            className="w-[200px] max-h-[300px] overflow-y-auto"
          >
            <MenuLabel>Filter by Vendor</MenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => updateFilters({ vendorId: null })}>
              All Vendors
            </DropdownMenuItem>
            {vendors.map((opt) => (
              <DropdownMenuItem
                key={opt.id}
                className="flex items-center justify-between"
                onClick={() => updateFilters({ vendorId: opt.id })}
              >
                {opt.name}
                {activeVendor === opt.id && <Check className="h-4 w-4" />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "h-8 border-dashed",
            )}
          >
            <Filter className="mr-2 h-4 w-4" />
            Assignment
            {activeAssignment && (
              <Check className="ml-2 h-3 w-3 text-primary" />
            )}
          </DropdownMenuTrigger>

          <DropdownMenuContent align="start" className="w-[180px]">
            <MenuLabel>Assignment Status</MenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => updateFilters({ assignmentStatus: null })}
            >
              All
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => updateFilters({ assignmentStatus: "assigned" })}
            >
              Assigned
              {activeAssignment === "assigned" && (
                <Check className="ml-auto h-4 w-4" />
              )}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => updateFilters({ assignmentStatus: "unassigned" })}
            >
              Unassigned
              {activeAssignment === "unassigned" && (
                <Check className="ml-auto h-4 w-4" />
              )}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu onOpenChange={(open) => !open && setEmployeeSearch("")}>
          <DropdownMenuTrigger
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "h-8 border-dashed",
            )}
          >
            <UserRound className="mr-2 h-4 w-4" />
            {activeEmployeeLabel}
            {activeEmployee && <Check className="ml-2 h-3 w-3 text-primary" />}
          </DropdownMenuTrigger>

          <DropdownMenuContent align="start" className="w-[220px] p-0">
            <div className="p-2 border-b">
              <input
                className="w-full px-2 py-1 text-sm rounded-md border border-input bg-background outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground"
                placeholder="Search employee..."
                value={employeeSearch}
                onChange={(e) => setEmployeeSearch(e.target.value)}
                autoFocus
              />
            </div>

            <div className="max-h-[220px] overflow-y-auto py-1">
              <DropdownMenuItem
                className="flex items-center justify-between"
                onClick={() => updateFilters({ employeeId: null })}
              >
                All Employees
                {!activeEmployee && <Check className="h-4 w-4" />}
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              {filteredEmployees.length === 0 ?
                <div className="px-3 py-4 text-center text-sm text-muted-foreground">
                  No employees found
                </div>
              : filteredEmployees.map((emp) => (
                  <DropdownMenuItem
                    key={emp.id}
                    className="flex items-center justify-between"
                    onClick={() => updateFilters({ employeeId: emp.id })}
                  >
                    <span className="truncate">{emp.name}</span>
                    {activeEmployee === emp.id && (
                      <Check className="ml-2 h-4 w-4 shrink-0" />
                    )}
                  </DropdownMenuItem>
                ))
              }
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "h-8",
            )}
          >
            <CalendarClock className="mr-2 h-4 w-4" />
            {activeSortOption?.label || "Sort"}
            <ChevronDown className="ml-2 h-3 w-3 opacity-60" />
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-[200px]">
            <MenuLabel>Sort By</MenuLabel>
            <DropdownMenuSeparator />
            {sortOptions.map((opt) => (
              <DropdownMenuItem
                key={`${opt.value}-${opt.order}`}
                className="flex items-center justify-between"
                onClick={() =>
                  updateFilters({ sortBy: opt.value, order: opt.order })
                }
              >
                {opt.label}
                {activeSortBy === opt.value && activeOrder === opt.order && (
                  <Check className="ml-auto h-4 w-4" />
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="ml-auto flex items-center gap-2">
          {selectedIds.length > 0 && (
            <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-4 bg-muted/50 px-2 py-1 rounded-md">
              <span className="text-xs font-medium text-muted-foreground mr-1">
                {selectedIds.length} selected
              </span>
              <Button
                variant="destructive"
                size="sm"
                className="h-7 text-[10px] px-2"
                loading={isPending}
                onClick={handleBulkDelete}
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Delete
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-[10px] px-2"
                onClick={onClearSelection}
              >
                Clear
              </Button>
            </div>
          )}
        </div>
      </div>

      {(filterChips.length > 0 || searchTerm) && (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {searchTerm && (
            <Badge
              variant="secondary"
              className="h-6 gap-1 pr-1 font-normal opacity-80"
            >
              <span className="text-muted-foreground">Search:</span>{" "}
              {searchTerm}
              <button
                type="button"
                onClick={clearSearch}
                className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 hover:bg-muted-foreground/20"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}

          {filterChips.map((chip, i) => (
            <Badge
              key={i}
              variant="secondary"
              className="h-6 gap-1 pr-1 font-normal"
            >
              {chip.label}
              <button
                type="button"
                onClick={() => {
                  if (chip.type === "multi" && chip.value) {
                    toggleFilter(
                      chip.key,
                      chip.value,
                      searchParams.get(chip.key)?.split(",").filter(Boolean) ||
                        [],
                    );
                  } else {
                    updateFilters({ [chip.key]: null });
                  }
                }}
                className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 hover:bg-muted-foreground/20"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}

          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            className="h-6 px-2 text-[10px] text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="mr-1 h-3 w-3" />
            Clear all
          </Button>
        </div>
      )}
    </div>
  );
}
