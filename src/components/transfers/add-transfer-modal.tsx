"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TransferType } from "@prisma/client";
import { Loader2, Plus, MapPin, Users, Calendar } from "lucide-react";
import { toast } from "sonner";
import { SearchableSelector } from "@/components/ui/searchable-selector";

export function AddTransferModal({ assets, locations, employees, currentUserId }: any) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    assetId: "",
    transferType: TransferType.LOCATION_TO_LOCATION,
    fromLocationId: "",
    toLocationId: "",
    fromEmployeeId: "",
    toEmployeeId: "",
    reason: "",
    plannedTransferDate: "",
    expectedReceiptDate: "",
  });

  const handleAssetChange = (assetId: string) => {
    const asset = assets.find((a: any) => a.id === assetId);
    setFormData(prev => ({ 
      ...prev, 
      assetId, 
      fromLocationId: asset?.locationId || "",
      fromEmployeeId: asset?.assignments?.find((as: any) => !as.returnedAt)?.employeeId || "",
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to create transfer");
      }

      toast.success("Transfer request created");
      setOpen(false);
      router.refresh();
      // Reset form
      setFormData({
        assetId: "",
        transferType: TransferType.LOCATION_TO_LOCATION,
        fromLocationId: "",
        toLocationId: "",
        fromEmployeeId: "",
        toEmployeeId: "",
        reason: "",
        plannedTransferDate: "",
        expectedReceiptDate: "",
      });
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const isLocationTo = formData.transferType.endsWith("LOCATION");
  const isEmployeeTo = formData.transferType.endsWith("EMPLOYEE");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button>
            <Plus className="mr-2 h-4 w-4" /> Request Transfer
          </Button>
        }
      />
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New Transfer Request</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="assetId">Asset to Move</Label>
            <SearchableSelector
              options={assets.map((asset: any) => ({
                value: asset.id,
                label: asset.name,
                description: `${asset.assetTag} • Status: ${asset.status}`,
              }))}
              value={formData.assetId}
              onSelect={handleAssetChange}
              placeholder="Select asset by name or tag..."
              searchPlaceholder="Search asset name/tag..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="transferType">Movement Type</Label>
            <Select 
              onValueChange={(val: any) => val && setFormData(p => ({ ...p, transferType: val }))} 
              value={formData.transferType}
            >
              <SelectTrigger>
                <SelectValue>
                  {formData.transferType?.replace(/_/g, " ")}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={TransferType.LOCATION_TO_LOCATION}>Location to Location</SelectItem>
                <SelectItem value={TransferType.EMPLOYEE_TO_EMPLOYEE}>Employee to Employee</SelectItem>
                <SelectItem value={TransferType.LOCATION_TO_EMPLOYEE}>Location to Employee</SelectItem>
                <SelectItem value={TransferType.EMPLOYEE_TO_LOCATION}>Employee to Location</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2 text-muted-foreground opacity-70">
              <Label>Source (Current)</Label>
              <div className="h-10 px-3 py-2 text-sm border rounded bg-slate-50 flex items-center gap-2">
                {formData.transferType.startsWith("LOCATION") ? <MapPin className="size-3" /> : <Users className="size-3" />}
                <span className="truncate">Auto-detected</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Destination</Label>
              {isLocationTo ? (
                <SearchableSelector
                  options={locations.map((l: any) => ({
                    value: l.id,
                    label: l.name,
                  }))}
                  value={formData.toLocationId}
                  onSelect={(val) => setFormData(p => ({ ...p, toLocationId: val }))}
                  placeholder="Select location..."
                />
              ) : (
                <SearchableSelector
                  options={employees.map((e: any) => ({
                    value: e.id,
                    label: e.fullName,
                    description: e.employeeCode,
                  }))}
                  value={formData.toEmployeeId}
                  onSelect={(val) => setFormData(p => ({ ...p, toEmployeeId: val }))}
                  placeholder="Select employee..."
                />
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="plannedTransferDate">Planned Date</Label>
              <div className="relative">
                <Calendar className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="plannedTransferDate"
                  type="date"
                  className="pl-9"
                  value={formData.plannedTransferDate}
                  onChange={(e) => setFormData(p => ({ ...p, plannedTransferDate: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="expectedReceiptDate">Exp. Receipt Date</Label>
              <div className="relative">
                <Calendar className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="expectedReceiptDate"
                  type="date"
                  className="pl-9"
                  value={formData.expectedReceiptDate}
                  onChange={(e) => setFormData(p => ({ ...p, expectedReceiptDate: e.target.value }))}
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Reason for Transfer</Label>
            <Input 
              id="reason" 
              placeholder="e.g. Office relocation, new project assignment" 
              value={formData.reason}
              onChange={(e) => setFormData(p => ({ ...p, reason: e.target.value }))}
            />
          </div>

          <DialogFooter className="pt-4">
            <Button type="submit" className="w-full" disabled={loading || !formData.assetId}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit Request
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
