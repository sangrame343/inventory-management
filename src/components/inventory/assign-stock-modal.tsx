"use client";

import { useState, useMemo, useEffect } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";

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
import { assignInventoryStock } from "@/app/actions/inventory-transaction-actions";

import type { InventoryLocation, InventoryItem, InventoryBalance } from "@prisma/client";
import { SearchableSelector } from "@/components/ui/searchable-selector";

interface EmployeeOption {
  id: string;
  name: string;
  employeeId?: string | null;
  userId?: string | null;
}

interface Option {
  id: string;
  name: string;
}

interface AssignStockModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: InventoryItem & { balances: InventoryBalance[] };
  locations: InventoryLocation[];
  employees: EmployeeOption[];
  departments: Option[];
  currentUserId: string;
  initialType?: "EMPLOYEE" | "DEPARTMENT";
}

export function AssignStockModal({
  open,
  onOpenChange,
  item,
  locations,
  employees,
  departments,
  currentUserId,
  initialType = "EMPLOYEE",
}: AssignStockModalProps) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [loading, setLoading] = useState(false);
  const [targetType, setTargetType] = useState<"EMPLOYEE" | "DEPARTMENT">(initialType);
  const [locationId, setLocationId] = useState(item.defaultLocationId || (locations[0]?.id ?? ""));
  const [quantity, setQuantity] = useState("1");
  const [notes, setNotes] = useState("");

  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [selectedDepartmentId, setSelectedDepartmentId] = useState("");

  const [handoverType, setHandoverType] = useState("NEW_HIRE");

  useEffect(() => {
    if (targetType === "DEPARTMENT") {
      setHandoverType("ASSIGNED_TO_DEPARTMENT");
    } else if (targetType === "EMPLOYEE") {
      setHandoverType("NEW_HIRE");
    }
  }, [targetType]);
  const [physicalCondition, setPhysicalCondition] = useState("BRAND_NEW");
  const [functionalStatus, setFunctionalStatus] = useState("WORKING");
  const [handoverDate, setHandoverDate] = useState(new Date().toISOString().slice(0, 10));
  const [managerUserId, setManagerUserId] = useState("");
  const [issuingOfficerName, setIssuingOfficerName] = useState("");
  const [employeeSignatureName, setEmployeeSignatureName] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Serial numbers per unit
  const [serialNumbers, setSerialNumbers] = useState<string[]>([""]);

  useEffect(() => {
    setTargetType(initialType);
  }, [initialType, open]);

  const selectedLocationBalance = useMemo(() => {
    const bal = item.balances.find((b) => b.locationId === locationId);
    return bal ? bal.availableQty : 0;
  }, [item.balances, locationId]);

  const handleQuantityChange = (newQtyStr: string) => {
    setQuantity(newQtyStr);
    const newQty = Math.max(1, Number(newQtyStr) || 1);
    setSerialNumbers((prev) => {
      const copy = [...prev];
      if (copy.length < newQty) {
        for (let i = copy.length; i < newQty; i++) {
          copy.push("");
        }
      } else if (copy.length > newQty) {
        return copy.slice(0, newQty);
      }
      return copy;
    });
  };

  const updateSerialNumber = (index: number, val: string) => {
    setSerialNumbers((prev) => {
      const copy = [...prev];
      copy[index] = val;
      return copy;
    });
  };

  const mutation = useMutation({
    mutationFn: async () => {
      const parsedQty = Number(quantity) || 1;

      // Front-end validations before submitting
      if (parsedQty <= 0) {
        throw new Error("Quantity must be greater than zero.");
      }
      if (parsedQty > item.availableQuantity) {
        throw new Error(`Cannot assign more than item available stock (${item.availableQuantity}).`);
      }
      if (parsedQty > selectedLocationBalance) {
        throw new Error(`Cannot assign more than location available stock (${selectedLocationBalance}).`);
      }
      if (targetType === "EMPLOYEE" && !selectedEmployeeId) {
        throw new Error("Please select an employee.");
      }
      if (targetType === "DEPARTMENT" && !selectedDepartmentId) {
        throw new Error("Please select a department.");
      }
      if (targetType === "EMPLOYEE" && !termsAccepted) {
        throw new Error("Please accept terms and conditions for employee handover.");
      }

      return await assignInventoryStock({
        itemId: item.id,
        locationId,
        quantity: parsedQty,
        notes: notes.trim() || undefined,
        employeeId: targetType === "EMPLOYEE" ? selectedEmployeeId : null,
        departmentId: targetType === "DEPARTMENT" ? selectedDepartmentId : null,
        handoverType,
        physicalCondition,
        functionalStatus,
        handoverDate,
        managerUserId: targetType === "EMPLOYEE" ? (managerUserId || null) : null,
        issuingOfficerName: targetType === "EMPLOYEE" ? (issuingOfficerName || null) : null,
        employeeSignatureName: targetType === "EMPLOYEE" ? (employeeSignatureName || null) : null,
        termsAccepted: targetType === "EMPLOYEE" ? termsAccepted : false,
        serialNumbers: serialNumbers.map((s) => s.trim()).filter(Boolean),
      });
    },
    onSuccess: () => {
      toast.success("Successfully assigned inventory stock and auto-registered asset(s)");
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      router.refresh();
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to assign inventory stock");
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    mutation.mutate();
  }

  const selectedEmployee = employees.find((emp) => emp.id === selectedEmployeeId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[750px]">
        <DialogHeader>
          <DialogTitle>Assign Stock - {item.name}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Source Location</Label>
              <Select value={locationId} onValueChange={(val) => setLocationId(val ?? "")}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Location">
                    {locations.find(l => l.id === locationId)?.name}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {locations.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground">Available at location: {selectedLocationBalance}</p>
            </div>

            <div className="space-y-2">
              <Label>Quantity to Assign</Label>
              <Input 
                type="number" 
                min="1"
                required 
                value={quantity} 
                onChange={(e) => handleQuantityChange(e.target.value)} 
              />
              <p className="text-[10px] text-muted-foreground">Total available: {item.availableQuantity}</p>
            </div>

            <div className="space-y-2">
              <Label>Assignment Target</Label>
              <Select 
                value={targetType} 
                onValueChange={(val: any) => {
                  setTargetType(val);
                  setSelectedEmployeeId("");
                  setSelectedDepartmentId("");
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Target">
                    {targetType === "EMPLOYEE" ? "Individual Employee" : "Department / Team"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EMPLOYEE">Individual Employee</SelectItem>
                  <SelectItem value="DEPARTMENT">Department / Team</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {targetType === "EMPLOYEE" ? (
              <div className="space-y-2">
                <Label>Select Employee</Label>
                <SearchableSelector
                  options={employees.map((emp) => ({
                    value: emp.id,
                    label: emp.name,
                    description: emp.employeeId ? `ID: ${emp.employeeId}` : undefined,
                  }))}
                  value={selectedEmployeeId}
                  onSelect={(val) => setSelectedEmployeeId(val || "")}
                  placeholder="Select Employee..."
                  searchPlaceholder="Search employee..."
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Select Department</Label>
                <SearchableSelector
                  options={departments.map((d) => ({
                    value: d.id,
                    label: d.name,
                  }))}
                  value={selectedDepartmentId}
                  onSelect={(val) => setSelectedDepartmentId(val || "")}
                  placeholder="Select Department..."
                  searchPlaceholder="Search department..."
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Assignment Date</Label>
              <Input
                type="date"
                value={handoverDate}
                onChange={(e) => setHandoverDate(e.target.value)}
              />
            </div>
          </div>

          {targetType === "EMPLOYEE" && (
            <div className="space-y-4 border rounded-lg p-4 bg-muted/20">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b pb-1">Handover details (Required for Employee)</h4>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-1">
                  <Label className="text-xs">Handover Type</Label>
                  <Select value={handoverType} onValueChange={(val) => setHandoverType(val || "NEW_HIRE")}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NEW_HIRE">New Hire</SelectItem>
                      <SelectItem value="REPLACEMENT">Replacement</SelectItem>
                      <SelectItem value="TEMPORARY_LOAN">Temporary Loan</SelectItem>
                      <SelectItem value="NEW_ASSET_ASSIGN">New Asset Assign</SelectItem>
                      <SelectItem value="ASSET_UPDATE">Asset Update</SelectItem>
                      <SelectItem value="ASSIGNED_TO_DEPARTMENT">Assigned to Department</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Physical Condition</Label>
                  <Select value={physicalCondition} onValueChange={(val) => setPhysicalCondition(val || "BRAND_NEW")}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Condition" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BRAND_NEW">Brand New</SelectItem>
                      <SelectItem value="USED_EXCELLENT">Used - Excellent</SelectItem>
                      <SelectItem value="USED_FAIR">Used - Fair</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Functional Status</Label>
                  <Select value={functionalStatus} onValueChange={(val) => setFunctionalStatus(val || "WORKING")}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="WORKING">Working</SelectItem>
                      <SelectItem value="MINOR_ISSUES">Minor Issues</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-xs">Manager / Supervisor</Label>
                  <Select value={managerUserId} onValueChange={(val) => setManagerUserId(val || "")}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Select Manager" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees
                        .filter((mgr) => !!mgr.userId && mgr.id !== selectedEmployeeId)
                        .map((mgr) => (
                          <SelectItem key={mgr.id} value={mgr.userId!}>
                            {mgr.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Issuing Officer</Label>
                  <Input
                    className="h-9"
                    value={issuingOfficerName}
                    onChange={(e) => setIssuingOfficerName(e.target.value)}
                    placeholder="IT Administrator name"
                  />
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <Label className="text-xs">Employee Signature / Acknowledgment Name</Label>
                <Input
                  className="h-9"
                  value={employeeSignatureName}
                  onChange={(e) => setEmployeeSignatureName(e.target.value)}
                  placeholder="Rahul Sharma (Signature)"
                />
              </div>

              <div className="flex items-start gap-2.5 pt-2">
                <Checkbox 
                  id="termsAccepted" 
                  checked={termsAccepted} 
                  onChange={(e) => setTermsAccepted(e.target.checked)} 
                />
                <Label htmlFor="termsAccepted" className="text-xs text-muted-foreground cursor-pointer">
                  I confirm that the assets have been physically verified, tested, and the employee acknowledges acceptance under the company asset utilization guidelines.
                </Label>
              </div>
            </div>
          )}

          {/* Optional per-unit Serial Numbers */}
          <div className="space-y-3 border rounded-lg p-4 bg-muted/10">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b pb-1">
              Per-Unit Serial Numbers (Optional)
            </h4>
            <div className="grid gap-3 md:grid-cols-2">
              {Array.from({ length: Number(quantity) || 1 }).map((_, idx) => (
                <div key={idx} className="space-y-1">
                  <Label className="text-xs">Unit #{idx + 1} Serial Number</Label>
                  <Input
                    className="h-9"
                    value={serialNumbers[idx] || ""}
                    onChange={(e) => updateSerialNumber(idx, e.target.value)}
                    placeholder={`e.g. SN-00${idx + 1}`}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notes / Handover Comments</Label>
            <Input 
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Reason / special instructions"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Assigning..." : "Assign Stock"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
