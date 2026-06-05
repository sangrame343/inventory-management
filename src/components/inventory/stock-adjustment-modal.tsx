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
import { adjustStock } from "@/app/actions/inventory-transaction-actions";

import { toast } from "sonner";
import type { InventoryLocation, InventoryItem, InventoryBalance } from "@prisma/client";

type PopulatedItem = InventoryItem & {
  balances: InventoryBalance[];
};

export function StockAdjustmentModal({
  open,
  onOpenChange,
  locations,
  item,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locations: InventoryLocation[];
  item: PopulatedItem;
}) {
  const [loading, setLoading] = useState(false);
  const [locationId, setLocationId] = useState(item.defaultLocationId || (locations[0]?.id ?? ""));
  const [actualQty, setActualQty] = useState<string>("0");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");

  const systemQty = useMemo(() => {
    return item.balances.find((b) => b.locationId === locationId)?.quantityOnHand || 0;
  }, [item.balances, locationId]);

  const diff = Number(actualQty) - systemQty;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!locationId || !reason) {
      toast.warning("Location and Reason required");
      return;
    }
    
    setLoading(true);
    try {
      await adjustStock({
        itemId: item.id,
        locationId,
        actualQty: Number(actualQty),
        reason,
        notes,
      });
      toast.success("Stock adjusted successfully");
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Adjustment failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adjust Physical Stock</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Item</Label>
            <Input value={`[${item.sku}] ${item.name}`} disabled />
          </div>

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

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>System Qty</Label>
              <Input value={systemQty} disabled />
            </div>
            <div className="space-y-2">
              <Label>Actual Qty</Label>
              <Input 
                type="number" 
                min="0"
                required 
                value={actualQty} 
                onChange={(e) => setActualQty(e.target.value)} 
              />
            </div>
            <div className="space-y-2">
              <Label>Difference</Label>
              <Input 
                value={diff > 0 ? `+${diff}` : diff} 
                disabled 
                className={diff < 0 ? "text-red-500 font-bold" : diff > 0 ? "text-green-500 font-bold" : ""}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Reason for Adjustment</Label>
            <Input 
              placeholder="e.g. Audit Count, Found items" 
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Additional Notes</Label>
            <Input 
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={loading || Number.isNaN(diff) || diff === 0}>
              {loading ? "Processing..." : "Confirm Adjustment"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
