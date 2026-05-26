"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

import { InventoryTable } from "./inventory-table";
import { AddItemModal } from "./add-item-modal";
import { StockAdjustmentModal } from "./stock-adjustment-modal";
import { StockMovementModal } from "./stock-movement-modal";
import { IssueInventoryModal } from "./issue-inventory-modal";
import { InventoryImportButton } from "./inventory-import-button";

import type { InventoryItem, InventoryBalance, InventoryCategory, InventoryLocation, UnitOfMeasure } from "@prisma/client";

type PopulatedItem = InventoryItem & {
  category: InventoryCategory | null;
  unit: UnitOfMeasure | null;
  defaultLocation: InventoryLocation | null;
  balances: InventoryBalance[];
};

export function InventoryDashboard({
  initialItems,
  categories,
  locations,
  units,
}: {
  initialItems: PopulatedItem[];
  categories: InventoryCategory[];
  locations: InventoryLocation[];
  units: UnitOfMeasure[];
  employees: { id: string; name: string }[];
  assetCategories: { id: string; name: string }[];
  departments: { id: string; name: string }[];
}) {
  const [searchTerm, setSearchTerm] = useState("");

  const [isAddModalOpen, setAddModalOpen] = useState(false);
  
  // States for row modals
  const [editingItem, setEditingItem] = useState<PopulatedItem | null>(null);
  const [adjustingStockItem, setAdjustingStockItem] = useState<PopulatedItem | null>(null);
  const [movingStockItem, setMovingStockItem] = useState<{item: PopulatedItem, direction: "IN" | "OUT"} | null>(null);
  const [issuingStockItem, setIssuingStockItem] = useState<PopulatedItem | null>(null);

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
    const qty = item.balances.reduce((acc, b) => acc + b.quantityOnHand, 0);
    totalVolume += qty;
    
    if (qty <= 0) outOfStockCount++;
    else if (qty <= item.reorderLevel) lowStockCount++;
  });

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalItems}</div>
            <p className="text-xs text-muted-foreground">{activeItems} active</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Quantity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalVolume}</div>
            <p className="text-xs text-muted-foreground">units across all locations</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{lowStockCount}</div>
            <p className="text-xs text-muted-foreground">at or below reorder level</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Out of Stock</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{outOfStockCount}</div>
            <p className="text-xs text-muted-foreground">0 quantity on hand</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center justify-between">
        <Input 
          placeholder="Search items by SKU or Name..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm" 
        />
        <div className="flex items-center gap-2">
          <InventoryImportButton />
          <Button onClick={() => setAddModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Add Item
          </Button>
        </div>
      </div>

      <div className="rounded-md border bg-card">
        <InventoryTable 
          items={filteredItems}
          onEdit={(i) => setEditingItem(i)}
          onAdjustStock={(i) => setAdjustingStockItem(i)}
          onStockIn={(i) => setMovingStockItem({item: i, direction: "IN"})}
          onStockOut={(i) => setMovingStockItem({item: i, direction: "OUT"})}
          onIssue={(i) => setIssuingStockItem(i)}
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

      {issuingStockItem && (
        <IssueInventoryModal 
          open={!!issuingStockItem}
          onOpenChange={(o) => {if(!o) setIssuingStockItem(null)}}
          item={issuingStockItem}
          locations={locations}
          employees={employees}
          categories={assetCategories}
          departments={departments}
        />
      )}
    </div>
  );
}
