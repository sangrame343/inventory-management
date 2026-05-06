"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { addStockTransaction } from "@/app/actions/inventory-transaction-actions";

import type { InventoryLocation, InventoryItem, MovementType, MovementDirection } from "@prisma/client";

export function StockMovementModal({
  open,
  onOpenChange,
  locations,
  item,
  direction,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locations: InventoryLocation[];
  item: InventoryItem;
  direction: MovementDirection;
}) {
  const [loading, setLoading] = useState(false);
  const [locationId, setLocationId] = useState(item.defaultLocationId || (locations[0]?.id ?? ""));
  const [movementType, setMovementType] = useState<MovementType | "">(direction === "IN" ? "PURCHASE_RECEIPT" : "MANUAL_STOCK_OUT");
  const [quantity, setQuantity] = useState<string>("1");
  const [unitCost, setUnitCost] = useState<string>("");
  const [notes, setNotes] = useState("");

  const title = direction === "IN" ? "Stock In" : "Stock Out";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!locationId || !movementType || Number(quantity) <= 0) return alert("Invalid inputs");
    
    setLoading(true);
    try {
      await addStockTransaction({
        itemId: item.id,
        locationId,
        direction,
        movementType: movementType as MovementType,
        quantity: Number(quantity),
        unitCost: unitCost ? Number(unitCost) : undefined,
        notes,
      });
      onOpenChange(false);
    } catch (err: any) {
      alert(err.message || "Transaction failed");
    } finally {
      setLoading(false);
    }
  }

  const allowedTypes: MovementType[] = direction === "IN" 
    ? ["OPENING_STOCK", "PURCHASE_RECEIPT", "MANUAL_STOCK_IN", "RETURN_IN", "TRANSFER_IN"]
    : ["MANUAL_STOCK_OUT", "ISSUE_TO_EMPLOYEE", "ISSUE_TO_ASSET", "TRANSFER_OUT", "DAMAGED_OUT", "SCRAP_OUT"];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title} - {item.name}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Location</Label>
              <Select value={locationId} onValueChange={(val) => setLocationId(val || "")}>
                <SelectTrigger>
                  <SelectValue placeholder="Select location">
                    {locations.find(loc => loc.id === locationId)?.name}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {locations.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>
                      {loc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Movement Type</Label>
              <Select value={movementType} onValueChange={(val: any) => setMovementType(val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type">
                    {movementType?.replace(/_/g, " ")}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {allowedTypes.map(t => (
                    <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Quantity</Label>
              <Input 
                type="number" 
                min="1"
                required 
                value={quantity} 
                onChange={(e) => setQuantity(e.target.value)} 
              />
            </div>
            {direction === "IN" && (
              <div className="space-y-2">
                <Label>Unit Cost (Optional)</Label>
                <Input 
                  type="number" 
                  min="0"
                  step="0.01"
                  value={unitCost} 
                  onChange={(e) => setUnitCost(e.target.value)} 
                />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Input 
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Received from Supplier X"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={loading} variant={direction === "OUT" ? "destructive" : "default"}>
              {loading ? "Processing..." : `Confirm ${title}`}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
