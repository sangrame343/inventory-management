"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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

interface AddAssetModalProps {
  categories: Option[];
  departments: Option[];
  locations: Option[];
  vendors: Option[];
  employees: EmployeeOption[];
  currentUserId: string;
}

export function AddAssetModal({
  categories,
  departments,
  locations,
  vendors,
  employees,
  currentUserId,
}: AddAssetModalProps) {
  const [open, setOpen] = useState(false);

  // Asset details
  const [assetCode, setAssetCode] = useState("");
  const [assetTag, setAssetTag] = useState("");
  const [assetName, setAssetName] = useState("");
  const [brand, setBrand] = useState("");
  const [assetModel, setAssetModel] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [specifications, setSpecifications] = useState("");
  const [accessoriesIncluded, setAccessoriesIncluded] = useState("");
  const [replacementValue, setReplacementValue] = useState("");
  const [assetPrice, setAssetPrice] = useState("");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [warranty, setWarranty] = useState("");
  const [warrantyExpiration, setWarrantyExpiration] = useState("");
  const [condition, setCondition] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState("");

  // Relations
  const [categoryId, setCategoryId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [vendorId, setVendorId] = useState("");

  // Handover details
  const [handoverDate, setHandoverDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [handoverTargetType, setHandoverTargetType] = useState<"NONE" | "EMPLOYEE" | "DEPARTMENT">("NONE");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [selectedDepartmentAssignmentId, setSelectedDepartmentAssignmentId] = useState("");
  const [managerUserId, setManagerUserId] = useState("");
  const [handoverType, setHandoverType] = useState("NEW_HIRE");

  // Condition / verification
  const [physicalCondition, setPhysicalCondition] = useState("BRAND_NEW");
  const [functionalStatus, setFunctionalStatus] = useState("WORKING");
  const [employeeSignatureName, setEmployeeSignatureName] = useState("");
  const [issuingOfficerName, setIssuingOfficerName] = useState("");
  const [handoverNotes, setHandoverNotes] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);

  const queryClient = useQueryClient();
  const router = useRouter();

  const managerOptions = useMemo(() => employees, [employees]);

  const selectedEmployee = useMemo(
    () => employees.find((emp) => emp.id === selectedEmployeeId),
    [employees, selectedEmployeeId],
  );

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = {
        assetCode: assetCode.trim() || null,
        assetTag: assetTag.trim(),
        name: assetName.trim(),
        brand: brand.trim() || null,
        model: assetModel.trim() || null,
        serialNumber: serialNumber.trim() || null,
        specifications: specifications.trim() || null,
        accessoriesIncluded: accessoriesIncluded
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        estimatedReplacementValue:
          replacementValue === "" ? null : Number(replacementValue),
        cost: assetPrice === "" ? null : Number(assetPrice),
        attachmentUrl: attachmentUrl.trim() || null,
        purchaseDate: purchaseDate || null,
        warranty: warranty.trim() || null,
        warrantyExpiration: warrantyExpiration || null,
        condition: condition.trim() || null,

        categoryId,
        departmentId: departmentId || null,
        locationId: locationId || null,
        vendorId: vendorId || null,

        handover:
          handoverTargetType !== "NONE" ?
            {
              handoverDate,
              employeeId: handoverTargetType === "EMPLOYEE" ? selectedEmployeeId : null,
              departmentId: handoverTargetType === "DEPARTMENT" ? selectedDepartmentAssignmentId : null,
              employeeUserId: handoverTargetType === "EMPLOYEE" ? (selectedEmployee?.userId || null) : null,
              managerUserId: handoverTargetType === "EMPLOYEE" ? (managerUserId || null) : null,
              handoverType,
              physicalCondition,
              functionalStatus,
              attachmentUrl: attachmentUrl.trim() || null,
              employeeSignatureName: employeeSignatureName.trim() || null,
              issuingOfficerName: issuingOfficerName.trim() || null,
              notes: handoverNotes.trim() || null,
              termsAccepted,
              assignedById: currentUserId,
              condition: condition.trim() || null,
            }
          : null,
      };

      const res = await fetch("/api/assets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      let responseData: any = null;
      try {
        responseData = await res.json();
      } catch {
        responseData = null;
      }

      if (!res.ok) {
        throw new Error(responseData?.error || "Failed to create asset");
      }

      return responseData;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["assets"] });
      router.refresh();

      setOpen(false);

      setAssetCode("");
      setAssetTag("");
      setAssetName("");
      setBrand("");
      setAssetModel("");
      setSerialNumber("");
      setSpecifications("");
      setAccessoriesIncluded("");
      setReplacementValue("");
      setAssetPrice("");
      setPurchaseDate("");
      setWarranty("");
      setWarrantyExpiration("");
      setCondition("");
      setAttachmentUrl("");

      setCategoryId("");
      setDepartmentId("");
      setLocationId("");
      setVendorId("");

      setHandoverDate(new Date().toISOString().slice(0, 10));
      setHandoverTargetType("NONE");
      setSelectedEmployeeId("");
      setSelectedDepartmentAssignmentId("");
      setManagerUserId("");
      setHandoverType("NEW_HIRE");

      setPhysicalCondition("BRAND_NEW");
      setFunctionalStatus("WORKING");
      setEmployeeSignatureName("");
      setIssuingOfficerName("");
      setHandoverNotes("");
      setTermsAccepted(false);
    },
    onError: (error: Error) => {
      alert(error.message);
    },
  });

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (handoverTargetType !== "NONE" && !termsAccepted) {
      alert("Please accept the company IT policy / terms and conditions.");
      return;
    }

    mutation.mutate();
  }

  console.log("employees", employees);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button type="button">
            <Plus className="mr-2 h-4 w-4" />
            Add Asset
          </Button>
        }
      />

      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[900px]">
        <DialogHeader>
          <DialogTitle>Add Asset & Handover Details</DialogTitle>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-6">
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">
              A. Employee & Administrative Details
            </h3>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="grid gap-2">
                <Label>Transaction ID</Label>
                <Input value="Auto-generated on save" disabled />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="handoverDate">Handover Date</Label>
                <Input
                  id="handoverDate"
                  type="date"
                  value={handoverDate}
                  onChange={(e) => setHandoverDate(e.target.value)}
                  disabled={!selectedEmployeeId}
                />
              </div>

              <div className="grid gap-2">
                <Label>Handover Type</Label>
                <Select
                  value={handoverType}
                  onValueChange={(val) => setHandoverType(val || "NEW_HIRE")}
                  disabled={!selectedEmployeeId}                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select handover type">
                      {handoverType === "NEW_HIRE" ? "New Hire" : 
                       handoverType === "REPLACEMENT" ? "Replacement" : 
                       handoverType === "TEMPORARY_LOAN" ? "Temporary Loan" : null}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NEW_HIRE">New Hire</SelectItem>
                    <SelectItem value="REPLACEMENT">Replacement</SelectItem>
                    <SelectItem value="TEMPORARY_LOAN">
                      Temporary Loan
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="grid gap-2">
                <Label>Initial Assignment To</Label>
                <Select
                  value={handoverTargetType}
                  onValueChange={(val: any) => {
                    setHandoverTargetType(val);
                    setSelectedEmployeeId("");
                    setSelectedDepartmentAssignmentId("");
                    setManagerUserId("");
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select target type">
                      {handoverTargetType === "NONE" ? "No Initial Assignment" : 
                       handoverTargetType === "EMPLOYEE" ? "Individual Employee" : 
                       handoverTargetType === "DEPARTMENT" ? "Department/Team" : null}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">No Initial Assignment</SelectItem>
                    <SelectItem value="EMPLOYEE">Individual Employee</SelectItem>
                    <SelectItem value="DEPARTMENT">Department/Team</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {handoverTargetType === "EMPLOYEE" && (
                <div className="grid gap-2">
                  <Label>Employee</Label>
                  <Select
                    value={selectedEmployeeId}
                    onValueChange={(val) => {
                      setSelectedEmployeeId(val || "");
                      setManagerUserId("");
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select employee">
                        {employees.find(e => e.id === selectedEmployeeId)?.name}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map((emp) => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.name}
                          {emp.employeeId ? ` (${emp.employeeId})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {handoverTargetType === "DEPARTMENT" && (
                <div className="grid gap-2">
                  <Label>Assign to Department</Label>
                  <Select
                    value={selectedDepartmentAssignmentId}
                    onValueChange={(val) => {
                      setSelectedDepartmentAssignmentId(val || "");
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select department">
                        {departments.find(d => d.id === selectedDepartmentAssignmentId)?.name}
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
              )}

              {handoverTargetType === "EMPLOYEE" && (
                <div className="grid gap-2">
                  <Label>Employee ID</Label>
                  <Input value={selectedEmployee?.employeeId || ""} disabled />
                </div>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-1">
              <div className="grid gap-2">
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
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label>Manager / Supervisor</Label>
                <Select
                  value={managerUserId}
                  onValueChange={(val) => setManagerUserId(val || "")}
                  disabled={!selectedEmployeeId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select manager">
                      {managerOptions.find(m => m.userId === managerUserId)?.name}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {managerOptions
                      .filter((mgr) => !!mgr.userId && mgr.id !== selectedEmployeeId)
                      .map((mgr) => (
                        <SelectItem key={mgr.id} value={mgr.userId!}>
                          {mgr.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>Issuing Officer</Label>
                <Input
                  value={issuingOfficerName}
                   onChange={(e) => setIssuingOfficerName(e.target.value)}
                  placeholder="IT Admin / HR name"
                  disabled={!selectedEmployeeId}
                />
              </div>
            </div>
          </div>
          

          <div className="space-y-3">
            <h3 className="text-sm font-semibold">B. Asset Specifics</h3>

            <div className="grid gap-4 md:grid-cols-4">
              <div className="grid gap-2">
                <Label>Asset Category</Label>
                <Select value={categoryId} onValueChange={(val) => setCategoryId(val || "")}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category">
                      {categories.find(c => c.id === categoryId)?.name}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="assetCode">Asset Code</Label>
                <Input
                  id="assetCode"
                  value={assetCode}
                  onChange={(e) => setAssetCode(e.target.value)}
                  placeholder="AST-CODE-001"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="assetTag">Company Asset Tag ID</Label>
                <Input
                  id="assetTag"
                  value={assetTag}
                  onChange={(e) => setAssetTag(e.target.value)}
                  placeholder="BARCODE / TAG ID"
                  required
                />
              </div>

              <div className="grid gap-2">
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
            </div>

            <div className="grid gap-4 md:grid-cols-4">
              <div className="grid gap-2 md:col-span-2">
                <Label htmlFor="assetName">Asset Name / Model</Label>
                <Input
                  id="assetName"
                  value={assetName}
                  onChange={(e) => setAssetName(e.target.value)}
                  placeholder="MacBook Pro M3, 14-inch"
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="brand">Brand</Label>
                <Input
                  id="brand"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  placeholder="Apple / Dell / HP"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="assetModel">Model</Label>
                <Input
                  id="assetModel"
                  value={assetModel}
                  onChange={(e) => setAssetModel(e.target.value)}
                  placeholder="Latitude 5440 / iPhone 15 / etc."
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
              <div className="grid gap-2">
                <Label htmlFor="serialNumber">
                  Serial Number / Service Tag
                </Label>
                <Input
                  id="serialNumber"
                  value={serialNumber}
                  onChange={(e) => setSerialNumber(e.target.value)}
                  placeholder="Serial / service tag"
                />
              </div>

              <div className="grid gap-2">
                <Label>Location</Label>
                <Select value={locationId} onValueChange={(val) => setLocationId(val || "")}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select location">
                      {locations.find(l => l.id === locationId)?.name}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map((location) => (
                      <SelectItem key={location.id} value={location.id}>
                        {location.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="assetPrice">Asset Price (INR)</Label>
                <Input
                  id="assetPrice"
                  type="number"
                  min="0"
                  step="0.01"
                  value={assetPrice}
                  onChange={(e) => setAssetPrice(e.target.value)}
                  placeholder="0.00"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="replacementValue">
                  Estimated Replacement Value
                </Label>
                <Input
                  id="replacementValue"
                  type="number"
                  min="0"
                  step="0.01"
                  value={replacementValue}
                  onChange={(e) => setReplacementValue(e.target.value)}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
              <div className="grid gap-2">
                <Label htmlFor="purchaseDate">Purchase Date</Label>
                <Input
                  id="purchaseDate"
                  type="date"
                  value={purchaseDate}
                  onChange={(e) => setPurchaseDate(e.target.value)}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="warranty">Warranty Details</Label>
                <Input
                  id="warranty"
                  value={warranty}
                  onChange={(e) => setWarranty(e.target.value)}
                  placeholder="e.g. 1 Year Limited"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="warrantyExpiration">Warranty Expiration</Label>
                <Input
                  id="warrantyExpiration"
                  type="date"
                  value={warrantyExpiration}
                  onChange={(e) => setWarrantyExpiration(e.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="grid gap-2 md:col-span-2">
                <Label htmlFor="specifications">Specifications</Label>
                <Input
                  id="specifications"
                  value={specifications}
                  onChange={(e) => setSpecifications(e.target.value)}
                  placeholder="16GB RAM, 512GB SSD, i7, etc."
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="accessoriesIncluded">
                  Accessories Included
                </Label>
                <Input
                  id="accessoriesIncluded"
                  value={accessoriesIncluded}
                  onChange={(e) => setAccessoriesIncluded(e.target.value)}
                  placeholder="Charger, Bag, Mouse, HDMI Cable"
                />
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold">
              C. Condition & Verification
            </h3>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="grid gap-2">
                <Label>Physical Condition</Label>
                <Select
                  value={physicalCondition}
                  onValueChange={(val) => setPhysicalCondition(val || "BRAND_NEW")}
                  disabled={!selectedEmployeeId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select condition">
                      {physicalCondition === "BRAND_NEW" ? "Brand New" : 
                       physicalCondition === "USED_EXCELLENT" ? "Used - Excellent" : 
                       physicalCondition === "USED_FAIR" ? "Used - Fair" : null}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BRAND_NEW">Brand New</SelectItem>
                    <SelectItem value="USED_EXCELLENT">
                      Used - Excellent
                    </SelectItem>
                    <SelectItem value="USED_FAIR">Used - Fair</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>Functional Status</Label>
                <Select
                  value={functionalStatus}
                  onValueChange={(val) => setFunctionalStatus(val || "WORKING")}
                  disabled={!selectedEmployeeId}                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select functional status">
                      {functionalStatus === "WORKING" ? "Working" : 
                       functionalStatus === "MINOR_ISSUES" ? "Minor Issues" : null}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="WORKING">Working</SelectItem>
                    <SelectItem value="MINOR_ISSUES">Minor Issues</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="condition">General Condition</Label>
                <Input
                  id="condition"
                  value={condition}
                  onChange={(e) => setCondition(e.target.value)}
                  placeholder="Good / New / Scratch on lid"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="attachmentUrl">Photos / Attachments URL</Label>
                <Input
                  id="attachmentUrl"
                  value={attachmentUrl}
                  onChange={(e) => setAttachmentUrl(e.target.value)}
                  placeholder="Upload link / file URL"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="employeeSignatureName">
                  Employee Signature / Name
                </Label>
                <Input
                  id="employeeSignatureName"
                  value={employeeSignatureName}
                   onChange={(e) => setEmployeeSignatureName(e.target.value)}
                  placeholder="Employee acknowledgment name"
                  disabled={!selectedEmployeeId}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="handoverNotes">Notes</Label>
              <Input
                id="handoverNotes"
                value={handoverNotes}
                 onChange={(e) => setHandoverNotes(e.target.value)}
                placeholder="Reason / remarks for handover"
                disabled={!selectedEmployeeId}
              />
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold">
              D. Acknowledgement & Sign-off
            </h3>

            <label className="flex items-start gap-3 rounded-md border p-3 text-sm">
              <input
                 type="checkbox"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                className="mt-1"
                disabled={!selectedEmployeeId}
              />
              <span>
                I confirm that the asset has been handed over, verified, and the
                employee agrees to the company IT / asset usage policy.
              </span>
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                mutation.isPending ||
                !assetTag ||
                !assetName ||
                !categoryId ||
                (handoverTargetType !== "NONE" && !termsAccepted)              }
            >
              {mutation.isPending ? "Saving..." : "Save Asset"}
            </Button>
          </div>
        </form>
        
      </DialogContent>
    </Dialog>
  );
}
