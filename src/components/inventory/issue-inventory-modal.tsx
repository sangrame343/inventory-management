"use client";

import { useState } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { issueInventoryToEmployee } from "@/app/actions/inventory-transaction-actions";
import { toast } from "sonner";

import type { InventoryLocation, InventoryItem } from "@prisma/client";

interface Option {
  id: string;
  name: string;
}

interface IssueInventoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: InventoryItem;
  locations: InventoryLocation[];
  employees: Option[];
  categories: Option[];
  departments: Option[];
}

export function IssueInventoryModal({
  open,
  onOpenChange,
  item,
  locations,
  employees,
  categories,
  departments,
}: IssueInventoryModalProps) {
  const [loading, setLoading] = useState(false);
  const [locationId, setLocationId] = useState(item.defaultLocationId || (locations[0]?.id ?? ""));
  const [employeeId, setEmployeeId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [notes, setNotes] = useState("");
  
  const [registerAsAsset, setRegisterAsAsset] = useState(false);
  const [categoryId, setCategoryId] = useState("");
  const [purchasedFromDepartmentId, setPurchasedFromDepartmentId] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!locationId || !employeeId || Number(quantity) <= 0) {
      return toast.error("Please fill all required fields");
    }

    if (registerAsAsset && !categoryId) {
      return toast.error("Please select an asset category");
    }

    setLoading(true);
    try {
      await issueInventoryToEmployee({
        itemId: item.id,
        locationId,
        employeeId,
        quantity: Number(quantity),
        notes,
        registerAsAsset,
        assetData: registerAsAsset ? {
          categoryId,
          purchasedFromDepartmentId: purchasedFromDepartmentId || undefined,
        } : undefined,
      });
      toast.success(`Successfully issued ${quantity} units to employee`);
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Transaction failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Issue to Employee - {item.name}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Source Location</Label>
              <Select value={locationId} onValueChange={setLocationId}>
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
              <Label>Employee</Label>
              <Select value={employeeId} onValueChange={setEmployeeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select employee">
                    {employees.find(emp => emp.id === employeeId)?.name}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Quantity to Issue</Label>
              <Input 
                type="number" 
                min="1"
                required 
                value={quantity} 
                onChange={(e) => setQuantity(e.target.value)} 
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Input 
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Issued for Project Alpha"
            />
          </div>

          <div className="space-y-4 border rounded-lg p-4 bg-muted/30">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="registerAsAsset" 
                checked={registerAsAsset} 
                onCheckedChange={(checked) => setRegisterAsAsset(!!checked)} 
              />
              <Label htmlFor="registerAsAsset" className="cursor-pointer font-semibold">
                Register as trackable asset?
              </Label>
            </div>
            <p className="text-[10px] text-muted-foreground ml-6">
              Only for serial-tracked or high-value items that need individual tracking.
            </p>

            {registerAsAsset && (
              <div className="grid gap-4 pt-2">
                <div className="space-y-2">
                  <Label>Asset Category</Label>
                  <Select value={categoryId} onValueChange={setCategoryId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category">
                        {categories.find(c => c.id === categoryId)?.name}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Purchased From Company</Label>
                  <Select value={purchasedFromDepartmentId} onValueChange={setPurchasedFromDepartmentId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select company">
                        {departments.find(d => d.id === purchasedFromDepartmentId)?.name}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {departments.map((dept) => (
                        <SelectItem key={dept.id} value={dept.id}>
                          {dept.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={loading} variant="default">
              {loading ? "Issuing..." : "Confirm Issue"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
