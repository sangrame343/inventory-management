"use client";

import { useState, useEffect } from "react";
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
import { SearchableSelector } from "@/components/ui/searchable-selector";

interface Option {
  id: string;
  name: string;
}

interface EmployeeOption {
  id: string;
  name: string;
  employeeId?: string | null;
  userId?: string | null;
}

interface IssueInventoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: InventoryItem;
  locations: InventoryLocation[];
  employees: EmployeeOption[];
  categories: Option[];
  departments: Option[];
  vendors: Option[];
  currentUserId: string;
}

export function IssueInventoryModal({
  open,
  onOpenChange,
  item,
  locations,
  employees,
  categories,
  departments,
  vendors,
  currentUserId,
}: IssueInventoryModalProps) {
  const [loading, setLoading] = useState(false);
  const [locationId, setLocationId] = useState(item.defaultLocationId || (locations[0]?.id ?? ""));
  const [quantity, setQuantity] = useState("1");
  const [notes, setNotes] = useState("");

  // Assignment targets
  const [assignmentType, setAssignmentType] = useState<"NONE" | "EMPLOYEE" | "DEPARTMENT" | "LOCATION">("EMPLOYEE");
  const [targetEmployeeId, setTargetEmployeeId] = useState("");
  const [targetDepartmentId, setTargetDepartmentId] = useState("");
  const [targetLocationId, setTargetLocationId] = useState("");

  // Asset registration details
  const [registerAsAsset, setRegisterAsAsset] = useState(false);
  const [categoryId, setCategoryId] = useState("");
  const [purchasedFromDepartmentId, setPurchasedFromDepartmentId] = useState("");
  const [cost, setCost] = useState("");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [warranty, setWarranty] = useState("");
  const [warrantyExpiration, setWarrantyExpiration] = useState("");

  // Additional general asset/handover fields:
  const [handoverDate, setHandoverDate] = useState(new Date().toISOString().slice(0, 10));
  const [handoverType, setHandoverType] = useState("NEW_HIRE");

  useEffect(() => {
    if (assignmentType === "DEPARTMENT") {
      setHandoverType("ASSIGNED_TO_DEPARTMENT");
    } else if (assignmentType === "EMPLOYEE") {
      setHandoverType("NEW_HIRE");
    }
  }, [assignmentType]);
  const [managerUserId, setManagerUserId] = useState("");
  const [issuingOfficerName, setIssuingOfficerName] = useState("");
  const [employeeSignatureName, setEmployeeSignatureName] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [departmentId, setDepartmentId] = useState(""); // Asset Department / Team
  const [vendorId, setVendorId] = useState("");
  const [assetLocationId, setAssetLocationId] = useState(""); // Asset location specifically
  const [specifications, setSpecifications] = useState("");
  const [accessoriesIncluded, setAccessoriesIncluded] = useState("");
  const [replacementValue, setReplacementValue] = useState("");

  // Per-piece details state
  const [pieces, setPieces] = useState<any[]>([
    {
      serialNumber: "",
      assetTag: "",
      assetCode: "",
      brand: "",
      model: "",
      condition: "New",
      physicalCondition: "BRAND_NEW",
      functionalStatus: "WORKING",
      specifications: "",
      accessoriesIncluded: "",
      attachmentUrl: "",
      notes: ""
    }
  ]);

  const selectedEmployee = employees.find((emp) => emp.id === targetEmployeeId);

  const handleQuantityChange = (newQtyStr: string) => {
    setQuantity(newQtyStr);
    const newQty = Number(newQtyStr) || 0;
    setPieces(prev => {
      const copy = [...prev];
      if (copy.length < newQty) {
        for (let i = copy.length; i < newQty; i++) {
          copy.push({
            serialNumber: "",
            assetTag: "",
            assetCode: "",
            brand: "",
            model: "",
            condition: "New",
            physicalCondition: "BRAND_NEW",
            functionalStatus: "WORKING",
            specifications: "",
            accessoriesIncluded: "",
            attachmentUrl: "",
            notes: ""
          });
        }
      } else if (copy.length > newQty) {
        return copy.slice(0, newQty);
      }
      return copy;
    });
  };

  const updatePieceField = (index: number, field: string, value: string) => {
    setPieces(prev => {
      const copy = [...prev];
      if (!copy[index]) {
        copy[index] = {
          serialNumber: "",
          assetTag: "",
          assetCode: "",
          brand: "",
          model: "",
          condition: "New",
          physicalCondition: "BRAND_NEW",
          functionalStatus: "WORKING",
          specifications: "",
          accessoriesIncluded: "",
          attachmentUrl: "",
          notes: ""
        };
      }
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!locationId || Number(quantity) <= 0) {
      return toast.error("Please fill all required fields");
    }

    if (assignmentType === "EMPLOYEE" && !targetEmployeeId) {
      return toast.error("Please select an employee");
    }
    if (assignmentType === "DEPARTMENT" && !targetDepartmentId) {
      return toast.error("Please select a department");
    }
    if (assignmentType === "LOCATION" && !targetLocationId) {
      return toast.error("Please select a physical location");
    }

    if (registerAsAsset) {
      if (!categoryId) {
        return toast.error("Please select an asset category");
      }
      if (assignmentType === "EMPLOYEE" && !termsAccepted) {
        return toast.error("Please accept the company IT policy / terms and conditions.");
      }
    }

    setLoading(true);
    try {
      await issueInventoryToEmployee({
        itemId: item.id,
        locationId,
        quantity: Number(quantity),
        notes,
        registerAsAsset,
        assignmentType,
        targetEmployeeId: assignmentType === "EMPLOYEE" ? targetEmployeeId : null,
        targetDepartmentId: assignmentType === "DEPARTMENT" ? targetDepartmentId : null,
        targetLocationId: assignmentType === "LOCATION" ? targetLocationId : null,
        assetData: registerAsAsset ? {
          categoryId,
          departmentId: departmentId || null,
          purchasedFromDepartmentId: purchasedFromDepartmentId || null,
          vendorId: vendorId || null,
          locationId: assetLocationId || null,
          handoverDate,
          handoverType,
          managerUserId: managerUserId || null,
          issuingOfficerName: issuingOfficerName || null,
          employeeSignatureName: employeeSignatureName || null,
          termsAccepted,
          cost: cost ? Number(cost) : null,
          purchaseDate: purchaseDate || null,
          warranty: warranty || null,
          warrantyExpiration: warrantyExpiration || null,
          specifications: specifications || null,
          accessoriesIncluded: accessoriesIncluded || null,
          estimatedReplacementValue: replacementValue ? Number(replacementValue) : null,
        } : undefined,
        pieces: registerAsAsset ? pieces : undefined,
      });
      toast.success(`Successfully issued ${quantity} units`);
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Transaction failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>Issue Stock - {item.name}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Source Location</Label>
              <Select value={locationId} onValueChange={(val) => setLocationId(val ?? "")}>
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
              <Label>Quantity to Issue</Label>
              <Input 
                type="number" 
                min="1"
                required 
                value={quantity} 
                onChange={(e) => handleQuantityChange(e.target.value)} 
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Assignment Target</Label>
              <Select value={assignmentType} onValueChange={(val: any) => setAssignmentType(val || "NONE")}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Assignment Target">
                    {assignmentType === "NONE" ? "No Assignment (Stock Out only)" :
                     assignmentType === "EMPLOYEE" ? "Individual Employee" :
                     assignmentType === "DEPARTMENT" ? "Department / Team" :
                     assignmentType === "LOCATION" ? "Physical Location" : null}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">No Assignment (Stock Out only)</SelectItem>
                  <SelectItem value="EMPLOYEE">Individual Employee</SelectItem>
                  <SelectItem value="DEPARTMENT">Department / Team</SelectItem>
                  <SelectItem value="LOCATION">Physical Location</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {assignmentType === "EMPLOYEE" && (
              <div className="space-y-2">
                <Label>Employee</Label>
                <SearchableSelector
                  options={employees.map((emp) => ({
                    value: emp.id,
                    label: emp.name,
                    description: emp.employeeId ? `ID: ${emp.employeeId}` : undefined,
                  }))}
                  value={targetEmployeeId}
                  onSelect={(val) => setTargetEmployeeId(val ?? "")}
                  placeholder="Select employee..."
                  searchPlaceholder="Search employee..."
                />
              </div>
            )}

            {assignmentType === "DEPARTMENT" && (
              <div className="space-y-2">
                <Label>Department</Label>
                <SearchableSelector
                  options={departments.map((dept) => ({
                    value: dept.id,
                    label: dept.name,
                  }))}
                  value={targetDepartmentId}
                  onSelect={(val) => setTargetDepartmentId(val ?? "")}
                  placeholder="Select department..."
                  searchPlaceholder="Search department..."
                />
              </div>
            )}

            {assignmentType === "LOCATION" && (
              <div className="space-y-2">
                <Label>Physical Location</Label>
                <Select value={targetLocationId} onValueChange={(val) => setTargetLocationId(val ?? "")}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select location">
                      {locations.find(loc => loc.id === targetLocationId)?.name}
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
            )}
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Input 
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Reason for issuance"
            />
          </div>

          <div className="space-y-4 border rounded-lg p-4 bg-muted/30">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="registerAsAsset" 
                checked={registerAsAsset} 
                onChange={(e) => setRegisterAsAsset(e.target.checked)} 
              />
              <Label htmlFor="registerAsAsset" className="cursor-pointer font-semibold">
                Register as trackable asset?
              </Label>
            </div>
            <p className="text-[10px] text-muted-foreground ml-6">
              Only for serial-tracked or high-value items that need individual tracking.
            </p>

            {registerAsAsset && (
              <div className="space-y-6 pt-2 border-t mt-4">
                {/* A. Employee & Administrative Details */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold border-b pb-1">
                    A. Administrative & Handover Details
                  </h3>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Handover Date</Label>
                      <Input
                        type="date"
                        value={handoverDate}
                        onChange={(e) => setHandoverDate(e.target.value)}
                        disabled={assignmentType !== "EMPLOYEE"}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Handover Type</Label>
                      <Select
                        value={handoverType}
                        onValueChange={(val) => setHandoverType(val || "NEW_HIRE")}
                        disabled={assignmentType !== "EMPLOYEE"}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select handover type">
                            {handoverType === "NEW_HIRE" ? "New Hire" : 
                             handoverType === "REPLACEMENT" ? "Replacement" : 
                             handoverType === "TEMPORARY_LOAN" ? "Temporary Loan" : 
                             handoverType === "NEW_ASSET_ASSIGN" ? "New Asset Assign" :
                             handoverType === "ASSET_UPDATE" ? "Asset Update" :
                             handoverType === "ASSIGNED_TO_DEPARTMENT" ? "Assigned to Department" : null}
                          </SelectValue>
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
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Manager / Supervisor</Label>
                      <Select
                        value={managerUserId}
                        onValueChange={(val) => setManagerUserId(val || "")}
                        disabled={assignmentType !== "EMPLOYEE"}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select manager">
                            {employees.find(m => m.userId === managerUserId)?.name}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {employees
                            .filter((mgr) => !!mgr.userId && mgr.id !== targetEmployeeId)
                            .map((mgr) => (
                              <SelectItem key={mgr.id} value={mgr.userId!}>
                                {mgr.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Issuing Officer</Label>
                      <Input
                        value={issuingOfficerName}
                        onChange={(e) => setIssuingOfficerName(e.target.value)}
                        placeholder="IT Admin / HR name"
                        disabled={assignmentType !== "EMPLOYEE"}
                      />
                    </div>
                  </div>

                  {assignmentType === "EMPLOYEE" && selectedEmployee?.employeeId && (
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Employee ID</Label>
                        <Input value={selectedEmployee.employeeId} disabled />
                      </div>
                    </div>
                  )}

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Asset Department / Team</Label>
                      <Select value={departmentId} onValueChange={(val) => setDepartmentId(val || "")}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select department">
                            {departments.find(d => d.id === departmentId)?.name}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {departments.map((dept) => (
                            <SelectItem key={dept.id} value={dept.id}>
                              {dept.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Purchased From Company</Label>
                      <Select value={purchasedFromDepartmentId} onValueChange={(val) => setPurchasedFromDepartmentId(val || "")}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select company">
                            {departments.find(d => d.id === purchasedFromDepartmentId)?.name}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {departments.map((dept) => (
                            <SelectItem key={dept.id} value={dept.id}>
                              {dept.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-[9px] text-muted-foreground">Used for Asset Code/Tag generation</p>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Vendor</Label>
                      <Select value={vendorId} onValueChange={(val) => setVendorId(val || "")}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select vendor">
                            {vendors.find(v => v.id === vendorId)?.name}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {vendors.map((vendor) => (
                            <SelectItem key={vendor.id} value={vendor.id}>
                              {vendor.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Asset Location</Label>
                      <Select value={assetLocationId} onValueChange={(val) => setAssetLocationId(val || "")}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select location">
                            {locations.find(loc => loc.id === assetLocationId)?.name}
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
                  </div>
                </div>

                {/* B. Asset Specifics */}
                <div className="space-y-3 pt-2">
                  <h3 className="text-sm font-semibold border-b pb-1">
                    B. Asset Specifics
                  </h3>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Asset Category <span className="text-red-500">*</span></Label>
                      <Select value={categoryId} onValueChange={(val) => setCategoryId(val ?? "")}>
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
                      <Label>Cost per unit (INR)</Label>
                      <Input 
                        type="number" 
                        placeholder="e.g. 50000" 
                        value={cost} 
                        onChange={(e) => setCost(e.target.value)} 
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                      <Label>Purchase Date</Label>
                      <Input 
                        type="date" 
                        value={purchaseDate} 
                        onChange={(e) => setPurchaseDate(e.target.value)} 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Warranty Details</Label>
                      <Input 
                        placeholder="e.g. 1 year" 
                        value={warranty} 
                        onChange={(e) => setWarranty(e.target.value)} 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Warranty Expiration</Label>
                      <Input 
                        type="date" 
                        value={warrantyExpiration} 
                        onChange={(e) => setWarrantyExpiration(e.target.value)} 
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-2 md:col-span-2">
                      <Label>Specifications</Label>
                      <Input 
                        placeholder="16GB RAM, 512GB SSD, i7, etc." 
                        value={specifications} 
                        onChange={(e) => setSpecifications(e.target.value)} 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Replacement Value</Label>
                      <Input 
                        type="number"
                        placeholder="Estimated value" 
                        value={replacementValue} 
                        onChange={(e) => setReplacementValue(e.target.value)} 
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Accessories Included</Label>
                    <Input 
                      placeholder="Charger, Bag, Mouse, HDMI Cable" 
                      value={accessoriesIncluded} 
                      onChange={(e) => setAccessoriesIncluded(e.target.value)} 
                    />
                  </div>
                </div>

                {/* C. Individual Item Details */}
                <div className="space-y-4 pt-2">
                  <h3 className="text-sm font-semibold border-b pb-1">
                    C. Individual Item Details ({pieces.length} {pieces.length === 1 ? "unit" : "units"})
                  </h3>
                  
                  {pieces.map((piece, idx) => (
                    <div key={idx} className="border p-4 rounded-md space-y-4 bg-background">
                      <p className="text-xs font-semibold text-muted-foreground">Item #{idx + 1}</p>
                      
                      <div className="grid gap-4 md:grid-cols-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Serial Number</Label>
                          <Input 
                            value={piece.serialNumber || ""} 
                            onChange={(e) => updatePieceField(idx, "serialNumber", e.target.value)} 
                            placeholder="Serial No." 
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Asset Tag ID</Label>
                          <Input 
                            value={piece.assetTag || ""} 
                            onChange={(e) => updatePieceField(idx, "assetTag", e.target.value)} 
                            placeholder="Asset Tag ID" 
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Asset Code</Label>
                          <Input 
                            value={piece.assetCode || ""} 
                            onChange={(e) => updatePieceField(idx, "assetCode", e.target.value)} 
                            placeholder="Asset Code" 
                          />
                        </div>
                      </div>

                      <div className="grid gap-4 md:grid-cols-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Brand</Label>
                          <Input 
                            value={piece.brand || ""} 
                            onChange={(e) => updatePieceField(idx, "brand", e.target.value)} 
                            placeholder="Brand" 
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Model</Label>
                          <Input 
                            value={piece.model || ""} 
                            onChange={(e) => updatePieceField(idx, "model", e.target.value)} 
                            placeholder="Model" 
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">General Condition</Label>
                          <Input 
                            value={piece.condition || ""} 
                            onChange={(e) => updatePieceField(idx, "condition", e.target.value)} 
                            placeholder="Good / Scratch on lid" 
                          />
                        </div>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-1">
                          <Label className="text-xs">Physical Condition</Label>
                          <Select 
                            value={piece.physicalCondition || "BRAND_NEW"} 
                            onValueChange={(val) => updatePieceField(idx, "physicalCondition", val)}
                          >
                            <SelectTrigger className="h-9">
                              <SelectValue placeholder="Physical Condition" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="BRAND_NEW">Brand New</SelectItem>
                              <SelectItem value="USED_EXCELLENT">Used - Excellent</SelectItem>
                              <SelectItem value="USED_FAIR">Used - Fair</SelectItem>
                              <SelectItem value="POOR">Poor</SelectItem>
                              <SelectItem value="DAMAGED">Damaged</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1">
                          <Label className="text-xs">Functional Status</Label>
                          <Select 
                            value={piece.functionalStatus || "WORKING"} 
                            onValueChange={(val) => updatePieceField(idx, "functionalStatus", val)}
                          >
                            <SelectTrigger className="h-9">
                              <SelectValue placeholder="Functional Status" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="WORKING">Working</SelectItem>
                              <SelectItem value="MINOR_ISSUES">Minor Issues</SelectItem>
                              <SelectItem value="NOT_WORKING">Not Working</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-1">
                          <Label className="text-xs">Specifications (Override)</Label>
                          <Input 
                            value={piece.specifications || ""} 
                            onChange={(e) => updatePieceField(idx, "specifications", e.target.value)} 
                            placeholder="e.g. 32GB RAM override" 
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Accessories Included (Override)</Label>
                          <Input 
                            value={piece.accessoriesIncluded || ""} 
                            onChange={(e) => updatePieceField(idx, "accessoriesIncluded", e.target.value)} 
                            placeholder="e.g. Charger, Mouse" 
                          />
                        </div>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-1">
                          <Label className="text-xs">Photos / Attachments URL</Label>
                          <Input 
                            value={piece.attachmentUrl || ""} 
                            onChange={(e) => updatePieceField(idx, "attachmentUrl", e.target.value)} 
                            placeholder="Upload link / file URL" 
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Handover Remarks / Notes</Label>
                          <Input 
                            value={piece.notes || ""} 
                            onChange={(e) => updatePieceField(idx, "notes", e.target.value)} 
                            placeholder="Remarks for this piece" 
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* D. Acknowledgement & Sign-off */}
                {assignmentType === "EMPLOYEE" && (
                  <div className="space-y-3 pt-2 border-t">
                    <h3 className="text-sm font-semibold">
                      D. Acknowledgement & Sign-off
                    </h3>

                    <div className="space-y-2">
                      <Label>Employee Signature / Name</Label>
                      <Input
                        value={employeeSignatureName}
                        onChange={(e) => setEmployeeSignatureName(e.target.value)}
                        placeholder="Employee acknowledgment signature name"
                      />
                    </div>

                    <label className="flex items-start gap-3 rounded-md border p-3 text-xs bg-muted/20">
                      <input
                        type="checkbox"
                        checked={termsAccepted}
                        onChange={(e) => setTermsAccepted(e.target.checked)}
                        className="mt-1 h-4 w-4 cursor-pointer"
                      />
                      <span>
                        I confirm that the asset has been handed over, verified, and the
                        employee agrees to the company IT / asset usage policy.
                      </span>
                    </label>
                  </div>
                )}
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

