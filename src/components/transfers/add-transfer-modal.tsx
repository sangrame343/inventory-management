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

  // Resolve auto-detected source details
  const currentAsset = assets?.find((a: any) => a.id === formData.assetId);
  const isLocationSource = formData.transferType.startsWith("LOCATION");
  
  let sourceName = "Select asset to detect source";
  if (formData.assetId && currentAsset) {
    if (isLocationSource) {
      const loc = locations?.find((l: any) => l.id === formData.fromLocationId);
      sourceName = loc ? `${loc.name} (${loc.code || "No Code"})` : "No location set";
    } else {
      const emp = employees?.find((e: any) => e.id === formData.fromEmployeeId);
      sourceName = emp ? `${emp.fullName} (${emp.employeeCode || "No Code"})` : "Not assigned to employee";
    }
  }

  const isLocationTo = formData.transferType.endsWith("LOCATION");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-medium rounded-xl shadow-md hover:shadow-lg transition-all duration-300">
            <Plus className="mr-2 h-4 w-4" /> Request Transfer
          </Button>
        }
      />
      <DialogContent className="max-w-md rounded-2xl border border-muted/60 bg-background/95 backdrop-blur-md shadow-2xl p-6">
        <DialogHeader>
          <DialogTitle className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-indigo-600 bg-clip-text text-transparent">
            New Transfer Request
          </DialogTitle>
          <p className="text-xs text-muted-foreground font-medium">
            Initiate a stock movement between locations or assignees. Requests require admin approval.
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-4 min-w-0 overflow-hidden w-full">
          <div className="space-y-1.5 min-w-0 w-full">
            <Label htmlFor="assetId" className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Asset to Move</Label>
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

          <div className="space-y-1.5 min-w-0 w-full">
            <Label htmlFor="transferType" className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Movement Type</Label>
            <Select 
              onValueChange={(val: any) => val && setFormData(p => ({ ...p, transferType: val }))} 
              value={formData.transferType}
            >
              <SelectTrigger className="rounded-xl border-muted/60 focus:border-indigo-500/55 focus:ring-2 focus:ring-indigo-500/10">
                <SelectValue>
                  {formData.transferType?.replace(/_/g, " ")}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value={TransferType.LOCATION_TO_LOCATION}>Location to Location</SelectItem>
                <SelectItem value={TransferType.EMPLOYEE_TO_EMPLOYEE}>Employee to Employee</SelectItem>
                <SelectItem value={TransferType.LOCATION_TO_EMPLOYEE}>Location to Employee</SelectItem>
                <SelectItem value={TransferType.EMPLOYEE_TO_LOCATION}>Employee to Location</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4 min-w-0 w-full">
            <div className="space-y-1.5 min-w-0 w-full">
              <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Source (Current)</Label>
              <div className="h-10 px-3 py-2 text-sm border border-muted/70 bg-muted/40 rounded-xl flex items-center gap-2 font-medium text-muted-foreground shadow-sm min-w-0 w-full overflow-hidden">
                {isLocationSource ? <MapPin className="h-4 w-4 text-indigo-500 flex-shrink-0" /> : <Users className="h-4 w-4 text-violet-500 flex-shrink-0" />}
                <span className="truncate text-xs flex-1 min-w-0" title={sourceName}>{sourceName}</span>
              </div>
            </div>

            <div className="space-y-1.5 min-w-0 w-full">
              <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Destination</Label>
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
            <div className="space-y-1.5">
              <Label htmlFor="plannedTransferDate" className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Planned Date</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="plannedTransferDate"
                  type="date"
                  className="pl-10 rounded-xl border-muted/60 focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/10"
                  value={formData.plannedTransferDate}
                  onChange={(e) => setFormData(p => ({ ...p, plannedTransferDate: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="expectedReceiptDate" className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Expected Receipt</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="expectedReceiptDate"
                  type="date"
                  className="pl-10 rounded-xl border-muted/60 focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/10"
                  value={formData.expectedReceiptDate}
                  onChange={(e) => setFormData(p => ({ ...p, expectedReceiptDate: e.target.value }))}
                />
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="reason" className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Reason for Transfer</Label>
            <Input 
              id="reason" 
              placeholder="e.g. Office relocation, replacement" 
              value={formData.reason}
              onChange={(e) => setFormData(p => ({ ...p, reason: e.target.value }))}
              className="rounded-xl border-muted/60 focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/10"
            />
          </div>

          <DialogFooter className="pt-4">
            <Button 
              type="submit" 
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl py-2.5 shadow-md hover:shadow-lg transition-all duration-300" 
              disabled={loading || !formData.assetId}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit Request
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
