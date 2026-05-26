"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, RefreshCw, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StockMovementModal } from "./stock-movement-modal";
import { StockAdjustmentModal } from "./stock-adjustment-modal";
import { IssueInventoryModal } from "./issue-inventory-modal";

import type { InventoryItem, InventoryLocation } from "@prisma/client";

interface Option {
  id: string;
  name: string;
}

interface InventoryItemActionsProps {
  item: any;
  locations: InventoryLocation[];
  employees: Option[];
  categories: Option[];
  departments: Option[];
}

export function InventoryItemActions({
  item,
  locations,
  employees,
  categories,
  departments,
}: InventoryItemActionsProps) {
  const [movingStock, setMovingStock] = useState<{ direction: "IN" | "OUT" } | null>(null);
  const [adjustingStock, setAdjustingStock] = useState(false);
  const [issuingStock, setIssuingStock] = useState(false);

  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" size="sm" onClick={() => setMovingStock({ direction: "IN" })}>
        <ArrowDown className="mr-2 h-4 w-4 text-green-600" /> Stock In
      </Button>
      <Button variant="outline" size="sm" onClick={() => setMovingStock({ direction: "OUT" })}>
        <ArrowUp className="mr-2 h-4 w-4 text-red-600" /> Stock Out
      </Button>
      <Button variant="outline" size="sm" onClick={() => setIssuingStock(true)}>
        <UserPlus className="mr-2 h-4 w-4 text-blue-600" /> Issue to Employee
      </Button>
      <Button variant="outline" size="sm" onClick={() => setAdjustingStock(true)}>
        <RefreshCw className="mr-2 h-4 w-4 text-orange-600" /> Adjust Stock
      </Button>

      {movingStock && (
        <StockMovementModal
          open={!!movingStock}
          onOpenChange={(o) => { if (!o) setMovingStock(null); }}
          item={item}
          direction={movingStock.direction}
          locations={locations}
        />
      )}

      {adjustingStock && (
        <StockAdjustmentModal
          open={adjustingStock}
          onOpenChange={setAdjustingStock}
          item={item}
          locations={locations}
        />
      )}

      {issuingStock && (
        <IssueInventoryModal
          open={issuingStock}
          onOpenChange={setIssuingStock}
          item={item}
          locations={locations}
          employees={employees}
          categories={categories}
          departments={departments}
        />
      )}
    </div>
  );
}
