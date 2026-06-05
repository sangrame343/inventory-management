"use client";

import { useMemo, useState } from "react";
import { Plus, Package, Layers, AlertTriangle, XCircle, Search, Settings } from "lucide-react";

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

import type { InventoryItem, InventoryBalance, InventoryCategory, InventoryLocation, UnitOfMeasure } from "@prisma/client";

type PopulatedItem = InventoryItem & {
  category: InventoryCategory | null;
  unit: UnitOfMeasure | null;
  defaultLocation: InventoryLocation | null;
  balances: InventoryBalance[];
  purchasedFromDepartment?: { id: string; name: string } | null;
  department?: { id: string; name: string } | null;
};

export function InventoryDashboard({
  initialItems,
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
  categories: { id: string; name: string }[];
  locations: InventoryLocation[];
  units: UnitOfMeasure[];
  employees: { id: string; name: string; employeeId?: string | null; userId?: string | null }[];
  assetCategories: { id: string; name: string }[];
  departments: { id: string; name: string }[];
  vendors: { id: string; name: string }[];
  currentUserId: string;
}) {
  const [searchTerm, setSearchTerm] = useState("");

  const [isAddModalOpen, setAddModalOpen] = useState(false);
  
  // States for row modals
  const [editingItem, setEditingItem] = useState<PopulatedItem | null>(null);
  const [adjustingStockItem, setAdjustingStockItem] = useState<PopulatedItem | null>(null);
  const [movingStockItem, setMovingStockItem] = useState<{item: PopulatedItem, direction: "IN" | "OUT"} | null>(null);
  const [assigningStockItem, setAssigningStockItem] = useState<PopulatedItem | null>(null);
  const [assigningType, setAssigningType] = useState<"EMPLOYEE" | "DEPARTMENT">("EMPLOYEE");

  const filteredItems = useMemo(() => {
    let list = initialItems;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      list = list.filter((i) => i.name.toLowerCase().includes(q) || i.sku.toLowerCase().includes(q));
    }
    return list;
  }, [initialItems, searchTerm]);

  // Derived Stats
  const totalItems = initialItems.length;
  const activeItems = initialItems.filter(i => i.status === "ACTIVE").length;
  
  let lowStockCount = 0;
  let outOfStockCount = 0;
  let totalVolume = 0;

  initialItems.forEach(item => {
    const qty = item.availableQuantity;
    totalVolume += qty;
    
    if (qty <= 0) outOfStockCount++;
    else if (qty <= item.reorderLevel) lowStockCount++;
  });

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
            onChange={(e) => setSearchTerm(e.target.value)}
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
          items={filteredItems}
          onEdit={(i) => setEditingItem(i)}
          onAdjustStock={(i) => setAdjustingStockItem(i)}
          onStockIn={(i) => setMovingStockItem({item: i, direction: "IN"})}
          onStockOut={(i) => setMovingStockItem({item: i, direction: "OUT"})}
          onAssignEmployee={(i) => { setAssigningStockItem(i); setAssigningType("EMPLOYEE"); }}
          onAssignDepartment={(i) => { setAssigningStockItem(i); setAssigningType("DEPARTMENT"); }}
          onDelete={handleDeleteItem}
        />
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
