"use client";

import { useMemo, useState } from "react";
import { Plus, Package, Layers, AlertTriangle, XCircle, Search, Settings, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useDebouncedCallback } from "use-debounce";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

import { InventoryTable } from "./inventory-table";
import { AddItemModal } from "./add-item-modal";
import { StockAdjustmentModal } from "./stock-adjustment-modal";
import { StockMovementModal } from "./stock-movement-modal";
import { AssignStockModal } from "./assign-stock-modal";
import { InventoryImportButton } from "./inventory-import-button";
import { deleteInventoryItem } from "@/app/actions/inventory-item-actions";
import { toast } from "sonner";
import { confirmDialog } from "@/components/ui/confirm-dialog";

import type { InventoryItem, InventoryBalance, AssetCategory, InventoryLocation, UnitOfMeasure, Location } from "@prisma/client";

type PopulatedItem = InventoryItem & {
  category: AssetCategory | null;
  unit: UnitOfMeasure | null;
  defaultLocation: InventoryLocation | null;
  balances: InventoryBalance[];
  purchasedFromDepartment?: { id: string; name: string } | null;
  department?: { id: string; name: string } | null;
};

export function InventoryDashboard({
  initialItems,
  totalCount,
  stats,
  categories,
  locations,
  units,
  employees,
  assetCategories,
  departments,
  vendors,
  currentUserId,
}: {
  initialItems: PopulatedItem[];
  totalCount: number;
  stats: {
    totalItems: number;
    activeItems: number;
    totalVolume: number;
    lowStockCount: number;
    outOfStockCount: number;
  };
  categories: { id: string; name: string }[];
  locations: Location[];
  units: UnitOfMeasure[];
  employees: { id: string; name: string; employeeId?: string | null; userId?: string | null }[];
  assetCategories: { id: string; name: string }[];
  departments: { id: string; name: string }[];
  vendors: { id: string; name: string }[];
  currentUserId: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentSortBy = searchParams.get("sortBy") || "createdAt";
  const currentOrder = searchParams.get("order") || "desc";
  const currentPage = Number(searchParams.get("page")) || 1;
  const currentLimit = Number(searchParams.get("limit")) || 10;

  const [searchTerm, setSearchTerm] = useState(searchParams.get("query") || "");

  const debouncedSearch = useDebouncedCallback((val: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (val.trim()) {
      params.set("query", val.trim())
    } else {
      params.delete("query")
    }
    params.set("page", "1")
    router.push(`/inventory?${params.toString()}`)
  }, 300)

  const handleSearchChange = (val: string) => {
    setSearchTerm(val)
    debouncedSearch(val)
  }

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("page", newPage.toString())
    router.push(`/inventory?${params.toString()}`)
  }

  const handlePageSizeChange = (newSize: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("limit", newSize.toString())
    params.set("page", "1")
    router.push(`/inventory?${params.toString()}`)
  }

  const totalPages = Math.ceil(totalCount / currentLimit) || 1;

  const [isAddModalOpen, setAddModalOpen] = useState(false);
  
  // States for row modals
  const [editingItem, setEditingItem] = useState<PopulatedItem | null>(null);
  const [adjustingStockItem, setAdjustingStockItem] = useState<PopulatedItem | null>(null);
  const [movingStockItem, setMovingStockItem] = useState<{item: PopulatedItem, direction: "IN" | "OUT"} | null>(null);
  const [assigningStockItem, setAssigningStockItem] = useState<PopulatedItem | null>(null);
  const [assigningType, setAssigningType] = useState<"EMPLOYEE" | "DEPARTMENT">("EMPLOYEE");

  // Stats
  const { totalItems, activeItems, totalVolume, lowStockCount, outOfStockCount } = stats;

  const handleDeleteItem = async (item: PopulatedItem) => {
    const ok = await confirmDialog({
      title: `Delete "${item.name}"?`,
      description: "This will permanently delete all associated stock levels and transactions. This action cannot be undone.",
      confirmLabel: "Delete Item",
      variant: "danger",
    });
    if (!ok) return;
    try {
      await deleteInventoryItem(item.id);
      toast.success(`Successfully deleted "${item.name}"`);
    } catch (err: any) {
      toast.error(err.message || "Failed to delete item");
    }
  };

  return (
    <div className="space-y-6">
      {/* Dynamic Grid Layout with Subtle Background Gradients */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Items Card */}
        <Card className="relative overflow-hidden border border-muted/60 bg-gradient-to-br from-background via-background to-indigo-50/10 transition-all duration-300 hover:shadow-lg hover:scale-[1.01] hover:border-indigo-500/30">
          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
            <Package className="h-24 w-24 text-indigo-600" />
          </div>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-semibold text-muted-foreground">Total SKU Catalog</CardTitle>
            <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-600 dark:text-indigo-400">
              <Package className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold tracking-tight">{totalItems}</div>
            <p className="text-xs text-muted-foreground mt-1.5 font-medium flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-indigo-500"></span>
              {activeItems} active items registered
            </p>
          </CardContent>
        </Card>

        {/* Total Quantity Card */}
        <Card className="relative overflow-hidden border border-muted/60 bg-gradient-to-br from-background via-background to-emerald-50/10 transition-all duration-300 hover:shadow-lg hover:scale-[1.01] hover:border-emerald-500/30">
          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
            <Layers className="h-24 w-24 text-emerald-600" />
          </div>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-semibold text-muted-foreground">Total Quantity</CardTitle>
            <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-600 dark:text-emerald-400">
              <Layers className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold tracking-tight">{totalVolume}</div>
            <p className="text-xs text-muted-foreground mt-1.5 font-medium flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
              units across all locations
            </p>
          </CardContent>
        </Card>

        {/* Low Stock Card */}
        <Card className="relative overflow-hidden border border-muted/60 bg-gradient-to-br from-background via-background to-amber-50/15 transition-all duration-300 hover:shadow-lg hover:scale-[1.01] hover:border-amber-500/40">
          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
            <AlertTriangle className="h-24 w-24 text-amber-600" />
          </div>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-semibold text-muted-foreground">Low Stock Alert</CardTitle>
            <div className="p-2 bg-amber-500/10 rounded-xl text-amber-600 dark:text-amber-500">
              <AlertTriangle className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold tracking-tight text-amber-600 dark:text-amber-500">{lowStockCount}</div>
            <p className="text-xs text-muted-foreground mt-1.5 font-medium flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-amber-500"></span>
              at or below reorder limit
            </p>
          </CardContent>
        </Card>

        {/* Out of Stock Card */}
        <Card className="relative overflow-hidden border border-muted/60 bg-gradient-to-br from-background via-background to-rose-50/15 transition-all duration-300 hover:shadow-lg hover:scale-[1.01] hover:border-rose-500/40">
          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
            <XCircle className="h-24 w-24 text-rose-600" />
          </div>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-semibold text-muted-foreground">Out of Stock</CardTitle>
            <div className="p-2 bg-rose-500/10 rounded-xl text-rose-600 dark:text-rose-500">
              <XCircle className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold tracking-tight text-rose-600 dark:text-rose-500">{outOfStockCount}</div>
            <p className="text-xs text-muted-foreground mt-1.5 font-medium flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-rose-500"></span>
              0 quantity remaining on hand
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Header Search and Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-accent/20 p-4 rounded-2xl border border-muted/50 backdrop-blur-sm">
        <div className="relative flex-1 max-w-md w-full">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input 
            placeholder="Search items by SKU or Name..." 
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9 w-full bg-background/70 shadow-sm border-muted/60 focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/10 transition-all duration-200" 
          />
        </div>
        <div className="flex items-center gap-3 self-end sm:self-auto">
          <InventoryImportButton />
          <Button 
            onClick={() => setAddModalOpen(true)}
            className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white shadow-md hover:shadow-lg transition-all duration-300 font-medium rounded-xl"
          >
            <Plus className="mr-2 h-4 w-4" /> Add Inventory Stock
          </Button>
        </div>
      </div>

      {/* Table Section with modern border container */}
      <div className="rounded-2xl border border-muted/60 bg-card overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300">
        <InventoryTable 
          items={initialItems}
          onEdit={(i) => setEditingItem(i)}
          onAdjustStock={(i) => setAdjustingStockItem(i)}
          onStockIn={(i) => setMovingStockItem({item: i, direction: "IN"})}
          onStockOut={(i) => setMovingStockItem({item: i, direction: "OUT"})}
          onAssignEmployee={(i) => { setAssigningStockItem(i); setAssigningType("EMPLOYEE"); }}
          onAssignDepartment={(i) => { setAssigningStockItem(i); setAssigningType("DEPARTMENT"); }}
          onDelete={handleDeleteItem}
        />
        
        {/* Table footer summary with Pagination controls */}
        {totalCount > 0 && (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-4 py-3 border-t border-muted/20 bg-muted/10">
            <div className="flex flex-wrap items-center gap-2 order-2 sm:order-1">
              <span className="text-[11px] text-muted-foreground/60">
                Showing{" "}
                <span className="font-semibold text-foreground/70 tabular-nums">
                  {totalCount === 0 ? 0 : (currentPage - 1) * currentLimit + 1}
                  –
                  {Math.min(currentPage * currentLimit, totalCount)}
                </span>
                {" "}of{" "}
                <span className="font-semibold text-foreground/70 tabular-nums">{totalCount}</span>
                {" "}items
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-4 order-1 sm:order-2">
              {/* Rows per page selector */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-muted-foreground">Rows per page</span>
                <select
                  value={currentLimit}
                  onChange={(e) => {
                    handlePageSizeChange(Number(e.target.value))
                  }}
                  className="h-7 rounded-lg border border-border/40 bg-card px-2 py-0.5 text-xs shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors cursor-pointer"
                >
                  {[10, 25, 50, 100].map((ps) => (
                    <option key={ps} value={ps}>
                      {ps}
                    </option>
                  ))}
                </select>
              </div>

              {/* Page navigation */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-muted-foreground min-w-[50px] text-center tabular-nums">
                  {currentPage} / {totalPages}
                </span>
                <div className="flex items-center gap-0.5 bg-muted/30 rounded-lg p-0.5 border border-border/40 shadow-3xs">
                  {[
                    { icon: ChevronsLeft, label: "First", onClick: () => handlePageChange(1), disabled: currentPage <= 1 },
                    { icon: ChevronLeft, label: "Previous", onClick: () => handlePageChange(currentPage - 1), disabled: currentPage <= 1 },
                    { icon: ChevronRight, label: "Next", onClick: () => handlePageChange(currentPage + 1), disabled: currentPage >= totalPages },
                    { icon: ChevronsRight, label: "Last", onClick: () => handlePageChange(totalPages), disabled: currentPage >= totalPages },
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
        )}
      </div>

      {/* Modals */}
      <AddItemModal 
        open={isAddModalOpen || !!editingItem} 
        onOpenChange={(open) => {
          setAddModalOpen(open);
          if (!open) setEditingItem(null);
        }} 
        categories={categories}
        locations={locations}
        units={units}
        vendors={vendors}
        departments={departments}
        editingItem={editingItem}
      />

      {adjustingStockItem && (
        <StockAdjustmentModal 
          open={!!adjustingStockItem}
          onOpenChange={(o) => {if(!o) setAdjustingStockItem(null)}}
          item={adjustingStockItem}
          locations={locations}
        />
      )}

      {movingStockItem && (
        <StockMovementModal 
          open={!!movingStockItem}
          onOpenChange={(o) => {if(!o) setMovingStockItem(null)}}
          item={movingStockItem.item}
          direction={movingStockItem.direction}
          locations={locations}
        />
      )}

      {assigningStockItem && (
        <AssignStockModal 
          open={!!assigningStockItem}
          onOpenChange={(o) => {if(!o) setAssigningStockItem(null)}}
          item={assigningStockItem}
          locations={locations}
          employees={employees}
          departments={departments}
          currentUserId={currentUserId}
          initialType={assigningType}
        />
      )}
    </div>
  );
}
