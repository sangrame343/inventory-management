"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { 
  Sparkles, 
  Loader2, 
  Package, 
  FileText, 
  Calendar, 
  DollarSign, 
  ShieldCheck, 
  MapPin, 
  Building, 
  Image as ImageIcon, 
  Link as LinkIcon, 
  ArrowLeft,
  Check,
  Tag,
  Wrench,
  Activity,
  Layers,
  ShoppingBag
} from "lucide-react";

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
import { updateAsset } from "@/app/actions/asset-actions";

interface Option {
  id: string;
  name: string;
}

interface Asset {
  id: string;
  assetCode: string | null;
  assetTag: string;
  name: string;
  brand: string | null;
  model: string | null;
  serialNumber: string | null;
  specifications: string | null;
  accessoriesIncluded: string[];
  estimatedReplacementValue: number | null;
  attachmentUrl: string | null;
  imageUrl: string | null;
  purchaseUrl: string | null;
  purchaseDate: Date | null;
  cost: number | null;
  warranty: string | null;
  warrantyExpiration: Date | null;
  condition: string | null;
  categoryId: string;
  departmentId: string | null;
  purchasedFromDepartmentId: string | null;
  locationId: string | null;
  vendorId: string | null;
  status: string;
}

interface EditAssetFormProps {
  asset: Asset;
  categories: Option[];
  departments: Option[];
  locations: Option[];
  vendors: Option[];
}

export function EditAssetForm({
  asset,
  categories,
  departments,
  locations,
  vendors,
}: EditAssetFormProps) {
  const router = useRouter();

  // Form state initialized with asset data
  const [assetCode, setAssetCode] = useState(asset.assetCode || "");
  const [assetTag, setAssetTag] = useState(asset.assetTag);
  const [assetName, setAssetName] = useState(asset.name);
  const [brand, setBrand] = useState(asset.brand || "");
  const [assetModel, setAssetModel] = useState(asset.model || "");
  const [serialNumber, setSerialNumber] = useState(asset.serialNumber || "");
  const [specifications, setSpecifications] = useState(asset.specifications || "");
  const [accessoriesIncluded, setAccessoriesIncluded] = useState(
    asset.accessoriesIncluded.join(", ")
  );
  const [replacementValue, setReplacementValue] = useState(
    asset.estimatedReplacementValue?.toString() || ""
  );
  const [purchaseDate, setPurchaseDate] = useState(
    asset.purchaseDate ? new Date(asset.purchaseDate).toISOString().slice(0, 10) : ""
  );
  const [assetPrice, setAssetPrice] = useState(asset.cost?.toString() || "");
  const [warranty, setWarranty] = useState(asset.warranty || "");
  const [warrantyExpiration, setWarrantyExpiration] = useState(
    asset.warrantyExpiration ? new Date(asset.warrantyExpiration).toISOString().slice(0, 10) : ""
  );

  const updateWarrantyExpiration = (warrantyText: string, pDate: string) => {
    if (!pDate) return;
    const baseDate = new Date(pDate);
    if (isNaN(baseDate.getTime())) return;

    const trimmed = warrantyText.trim();
    if (!trimmed) return;

    const match = trimmed.match(/^(\d+(?:\.\d+)?)\s*(year|month|day|week|yr|mo|d|wk|s)?s?$/i);
    if (match) {
      const value = parseFloat(match[1]);
      const unit = (match[2] || "year").toLowerCase();

      if (unit.startsWith("y")) {
        baseDate.setFullYear(baseDate.getFullYear() + value);
      } else if (unit.startsWith("m")) {
        baseDate.setMonth(baseDate.getMonth() + value);
      } else if (unit.startsWith("w")) {
        baseDate.setDate(baseDate.getDate() + value * 7);
      } else if (unit.startsWith("d")) {
        baseDate.setDate(baseDate.getDate() + value);
      }
      setWarrantyExpiration(baseDate.toISOString().slice(0, 10));
      return;
    }

    const justNumber = trimmed.match(/^(\d+(?:\.\d+)?)$/);
    if (justNumber) {
      const value = parseFloat(justNumber[1]);
      baseDate.setFullYear(baseDate.getFullYear() + value);
      setWarrantyExpiration(baseDate.toISOString().slice(0, 10));
    }
  };

  const handlePurchaseDateChange = (val: string) => {
    setPurchaseDate(val);
    if (val) {
      const currentWarranty = warranty.trim() || "1 Year";
      if (!warranty.trim()) {
        setWarranty("1 Year");
      }
      updateWarrantyExpiration(currentWarranty, val);
    }
  };
  const [condition, setCondition] = useState(asset.condition || "");
  const [attachmentUrl, setAttachmentUrl] = useState(asset.attachmentUrl || "");
  const [imageUrl, setImageUrl] = useState(asset.imageUrl || "");
  const [purchaseUrl, setPurchaseUrl] = useState(asset.purchaseUrl || "");
  const [status, setStatus] = useState(asset.status || "ACTIVE");

  const [isFetchingImage, setIsFetchingImage] = useState(false);

  const handleFetchImage = async () => {
    if (!purchaseUrl.trim()) {
      toast.error("Please enter a Purchase Link URL first");
      return;
    }
    setIsFetchingImage(true);
    try {
      const response = await fetch("/api/scrape-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: purchaseUrl.trim() }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch product details");
      }
      
      let autofilledFields = [];
      if (data.imageUrl) {
        setImageUrl(data.imageUrl);
        autofilledFields.push("Image");
      }
      if (data.title && (!assetName || !assetName.trim())) {
        setAssetName(data.title);
        autofilledFields.push("Asset Name");
      }
      if (data.brand && (!brand || !brand.trim())) {
        setBrand(data.brand);
        autofilledFields.push("Brand");
      }
      if (data.price && (!assetPrice || !assetPrice.trim())) {
        setAssetPrice(data.price);
        autofilledFields.push("Cost");
      }
      if (data.description && (!specifications || !specifications.trim())) {
        const cleanDesc = data.description.length > 150 ? data.description.slice(0, 147) + "..." : data.description;
        setSpecifications(cleanDesc);
        autofilledFields.push("Specifications");
      }

      if (autofilledFields.length > 0) {
        toast.success(`Autofilled: ${autofilledFields.join(", ")}`);
      } else {
        toast.success("Fetched details successfully, but no fields were empty/updated.");
      }
    } catch (err: any) {
      toast.error(err.message || "Error fetching product details");
    } finally {
      setIsFetchingImage(false);
    }
  };

  // Relations
  const [categoryId, setCategoryId] = useState(asset.categoryId);
  const [departmentId, setDepartmentId] = useState(asset.departmentId || "none");
  const [purchasedFromDepartmentId, setPurchasedFromDepartmentId] = useState(asset.purchasedFromDepartmentId || "none");
  const [locationId, setLocationId] = useState(asset.locationId || "none");
  const [vendorId, setVendorId] = useState(asset.vendorId || "none");

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = {
        assetCode,
        assetTag,
        name: assetName,
        brand,
        model: assetModel,
        serialNumber,
        specifications,
        accessoriesIncluded,
        estimatedReplacementValue: replacementValue === "" ? null : Number(replacementValue),
        cost: assetPrice === "" ? null : Number(assetPrice),
        attachmentUrl,
        imageUrl,
        purchaseUrl,
        purchaseDate,
        warranty,
        warrantyExpiration,
        condition,
        categoryId,
        departmentId: departmentId === "none" ? null : departmentId,
        purchasedFromDepartmentId: purchasedFromDepartmentId === "none" ? null : purchasedFromDepartmentId,
        locationId: locationId === "none" ? null : locationId,
        vendorId: vendorId === "none" ? null : vendorId,
        status,
      };

      return await updateAsset(asset.id, payload);
    },
    onSuccess: () => {
      toast.success("Asset updated successfully");
      router.push(`/assets/${asset.id}`);
      router.refresh();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate();
  };

  return (
    <form onSubmit={onSubmit} className="space-y-8 max-w-5xl">
      {/* SECTION 1: CORE DETAILS */}
      <div className="group rounded-xl border bg-card p-6 shadow-sm hover:border-primary/20 hover:shadow-md transition-all duration-300 space-y-6">
        <div className="flex items-center gap-3 border-b pb-4">
          <div className="p-2.5 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
            <Package className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-semibold tracking-tight text-foreground">Core Asset Details</h3>
            <p className="text-xs text-muted-foreground">General identification and classifications for the asset.</p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <div className="grid gap-2">
            <Label htmlFor="assetName" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Asset Name / Model *
            </Label>
            <Input
              id="assetName"
              value={assetName}
              onChange={(e) => setAssetName(e.target.value)}
              placeholder="e.g. MacBook Pro M3"
              className="bg-muted/10 focus:bg-background transition-colors duration-200"
              required
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="assetCategory" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Asset Category *
            </Label>
            <Select value={categoryId} onValueChange={(val) => setCategoryId(val || "")}>
              <SelectTrigger id="assetCategory" className="bg-muted/10 focus:bg-background transition-colors duration-200">
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
            <Label htmlFor="assetTag" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Company Asset Tag ID *
            </Label>
            <Input
              id="assetTag"
              value={assetTag}
              onChange={(e) => setAssetTag(e.target.value)}
              placeholder="BARCODE / TAG ID"
              className="bg-muted/10 focus:bg-background transition-colors duration-200 font-mono"
              required
            />
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <div className="grid gap-2">
            <Label htmlFor="brand" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Brand
            </Label>
            <Input
              id="brand"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              placeholder="e.g. Apple"
              className="bg-muted/10 focus:bg-background transition-colors duration-200"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="assetModel" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Model Number
            </Label>
            <Input
              id="assetModel"
              value={assetModel}
              onChange={(e) => setAssetModel(e.target.value)}
              placeholder="e.g. A2941"
              className="bg-muted/10 focus:bg-background transition-colors duration-200"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="serialNumber" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Serial Number
            </Label>
            <Input
              id="serialNumber"
              value={serialNumber}
              onChange={(e) => setSerialNumber(e.target.value)}
              placeholder="Serial or service tag"
              className="bg-muted/10 focus:bg-background transition-colors duration-200 font-mono"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="assetCode" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Internal Asset Code
            </Label>
            <Input
              id="assetCode"
              value={assetCode}
              onChange={(e) => setAssetCode(e.target.value)}
              placeholder="AST-CODE-001"
              className="bg-muted/10 focus:bg-background transition-colors duration-200 font-mono"
            />
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="status" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Asset Status
            </Label>
            <Select value={status} onValueChange={(val) => setStatus(val || "ACTIVE")}>
              <SelectTrigger id="status" className="bg-muted/10 focus:bg-background transition-colors duration-200">
                <SelectValue placeholder="Select status">
                  {status}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ACTIVE">ACTIVE</SelectItem>
                <SelectItem value="ASSIGNED">ASSIGNED</SelectItem>
                <SelectItem value="REPAIR">REPAIR</SelectItem>
                <SelectItem value="DISPOSED">DISPOSED</SelectItem>
                <SelectItem value="LOST">LOST</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="condition" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Physical Condition
            </Label>
            <Input
              id="condition"
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
              placeholder="e.g. Excellent / Good / Needs Repair"
              className="bg-muted/10 focus:bg-background transition-colors duration-200"
            />
          </div>
        </div>
      </div>

      {/* SECTION 2: LOGISTICS & ASSIGNMENT */}
      <div className="group rounded-xl border bg-card p-6 shadow-sm hover:border-primary/20 hover:shadow-md transition-all duration-300 space-y-6">
        <div className="flex items-center gap-3 border-b pb-4">
          <div className="p-2.5 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400">
            <MapPin className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-semibold tracking-tight text-foreground">Logistics & Assignment</h3>
            <p className="text-xs text-muted-foreground">Track location, owning departments, and custodianship.</p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <div className="grid gap-2">
            <Label htmlFor="locationId" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Location
            </Label>
            <Select value={locationId} onValueChange={(val) => setLocationId(val || "none")}>
              <SelectTrigger id="locationId" className="bg-muted/10 focus:bg-background transition-colors duration-200">
                <SelectValue placeholder="Select location">
                  {locations.find(l => l.id === locationId)?.name || (locationId === "none" ? "None" : null)}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {locations.map((location) => (
                  <SelectItem key={location.id} value={location.id}>
                    {location.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="departmentId" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Assigned Department
            </Label>
            <Select value={departmentId} onValueChange={(val) => setDepartmentId(val || "none")}>
              <SelectTrigger id="departmentId" className="bg-muted/10 focus:bg-background transition-colors duration-200">
                <SelectValue placeholder="Select department">
                  {departments.find(d => d.id === departmentId)?.name || (departmentId === "none" ? "None" : null)}
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

          <div className="grid gap-2">
            <Label htmlFor="purchasedFromDepartmentId" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Purchasing Department / Entity
            </Label>
            <Select value={purchasedFromDepartmentId} onValueChange={(val) => setPurchasedFromDepartmentId(val || "none")}>
              <SelectTrigger id="purchasedFromDepartmentId" className="bg-muted/10 focus:bg-background transition-colors duration-200">
                <SelectValue placeholder="Select department">
                  {departments.find(d => d.id === purchasedFromDepartmentId)?.name || (purchasedFromDepartmentId === "none" ? "None" : null)}
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
      </div>

      {/* SECTION 3: FINANCIALS & ACQUISITION */}
      <div className="group rounded-xl border bg-card p-6 shadow-sm hover:border-primary/20 hover:shadow-md transition-all duration-300 space-y-6">
        <div className="flex items-center gap-3 border-b pb-4">
          <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <DollarSign className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-semibold tracking-tight text-foreground">Financials & Acquisition</h3>
            <p className="text-xs text-muted-foreground">Warranty information, purchase details, and replacement cost.</p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <div className="grid gap-2">
            <Label htmlFor="vendor" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Vendor / Supplier
            </Label>
            <Select value={vendorId} onValueChange={(val) => setVendorId(val || "none")}>
              <SelectTrigger id="vendor" className="bg-muted/10 focus:bg-background transition-colors duration-200">
                <SelectValue placeholder="Select vendor">
                  {vendors.find(v => v.id === vendorId)?.name || (vendorId === "none" ? "None" : null)}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {vendors.map((vendor) => (
                  <SelectItem key={vendor.id} value={vendor.id}>
                    {vendor.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="purchaseDate" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Purchase Date
            </Label>
            <Input
              id="purchaseDate"
              type="date"
              value={purchaseDate}
              onChange={(e) => handlePurchaseDateChange(e.target.value)}
              className="bg-muted/10 focus:bg-background transition-colors duration-200"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="assetPrice" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Asset Cost (INR)
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-muted-foreground text-sm font-semibold">₹</span>
              <Input
                id="assetPrice"
                type="number"
                min="0"
                step="0.01"
                value={assetPrice}
                onChange={(e) => setAssetPrice(e.target.value)}
                placeholder="0.00"
                className="pl-7 bg-muted/10 focus:bg-background transition-colors duration-200 font-semibold text-emerald-600 dark:text-emerald-400"
              />
            </div>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <div className="grid gap-2">
            <Label htmlFor="replacementValue" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Est. Replacement Value (INR)
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-muted-foreground text-sm font-semibold">₹</span>
              <Input
                id="replacementValue"
                type="number"
                min="0"
                step="0.01"
                value={replacementValue}
                onChange={(e) => setReplacementValue(e.target.value)}
                placeholder="0.00"
                className="pl-7 bg-muted/10 focus:bg-background transition-colors duration-200"
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="warranty" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Warranty Period
            </Label>
            <Input
              id="warranty"
              value={warranty}
              onChange={(e) => {
                setWarranty(e.target.value);
                updateWarrantyExpiration(e.target.value, purchaseDate);
              }}
              placeholder="e.g. 1 Year Limited"
              className="bg-muted/10 focus:bg-background transition-colors duration-200"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="warrantyExpiration" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Warranty Expiration Date
            </Label>
            <Input
              id="warrantyExpiration"
              type="date"
              value={warrantyExpiration}
              onChange={(e) => setWarrantyExpiration(e.target.value)}
              className="bg-muted/10 focus:bg-background transition-colors duration-200"
            />
          </div>
        </div>
      </div>

      {/* SECTION 4: SPECS & ATTACHMENTS */}
      <div className="group rounded-xl border bg-card p-6 shadow-sm hover:border-primary/20 hover:shadow-md transition-all duration-300 space-y-6">
        <div className="flex items-center gap-3 border-b pb-4">
          <div className="p-2.5 rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400">
            <ImageIcon className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-semibold tracking-tight text-foreground">Specifications & Attachments</h3>
            <p className="text-xs text-muted-foreground">Product configurations, media, and accessory listings.</p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="specifications" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Hardware Specifications
            </Label>
            <Input
              id="specifications"
              value={specifications}
              onChange={(e) => setSpecifications(e.target.value)}
              placeholder="e.g. 16GB RAM, 512GB SSD, Apple M3"
              className="bg-muted/10 focus:bg-background transition-colors duration-200"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="accessoriesIncluded" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Included Accessories
            </Label>
            <Input
              id="accessoriesIncluded"
              value={accessoriesIncluded}
              onChange={(e) => setAccessoriesIncluded(e.target.value)}
              placeholder="e.g. Charger, USB-C Cable, Laptop Sleeve"
              className="bg-muted/10 focus:bg-background transition-colors duration-200"
            />
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="attachmentUrl" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Invoice or Document Attachment Link
            </Label>
            <Input
              id="attachmentUrl"
              value={attachmentUrl}
              onChange={(e) => setAttachmentUrl(e.target.value)}
              placeholder="File URL"
              className="bg-muted/10 focus:bg-background transition-colors duration-200"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="purchaseUrl" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Purchase Link URL
            </Label>
            <div className="flex gap-2">
              <Input
                id="purchaseUrl"
                value={purchaseUrl}
                onChange={(e) => setPurchaseUrl(e.target.value)}
                placeholder="https://www.amazon.in/dp/... or e-commerce link"
                className="flex-1 bg-muted/10 focus:bg-background transition-colors duration-200"
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleFetchImage}
                disabled={isFetchingImage || !purchaseUrl}
                className="shrink-0 flex items-center gap-1.5 bg-violet-500/5 hover:bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20 hover:border-violet-500/40 transition-all duration-200"
              >
                {isFetchingImage ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5" />
                )}
                Fetch Image
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground">Extract visual assets by paste-fetching standard ecommerce sites.</p>
          </div>
        </div>

        <div className="grid gap-4 pt-2">
          <div className="grid gap-2">
            <Label htmlFor="imageUrl" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Product Image URL
            </Label>
            <Input
              id="imageUrl"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://..."
              className="bg-muted/10 focus:bg-background transition-colors duration-200"
            />
          </div>

          {imageUrl && (
            <div className="flex items-center gap-4 p-4 rounded-xl border bg-muted/20 backdrop-blur-sm shadow-inner max-w-xl animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="relative h-16 w-16 rounded-lg overflow-hidden border bg-background flex items-center justify-center shrink-0 shadow-sm">
                <img 
                  src={imageUrl} 
                  alt="Asset Preview" 
                  className="h-full w-full object-contain" 
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} 
                />
              </div>
              <div>
                <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                  Product Preview Loaded
                </p>
                <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">{imageUrl}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* FORM ACTION BAR */}
      <div className="flex items-center justify-between gap-4 pt-4 border-t">
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.back()}
          className="flex items-center gap-1.5 hover:bg-muted"
        >
          <ArrowLeft className="h-4 w-4" />
          Cancel
        </Button>
        
        <Button
          type="submit"
          disabled={mutation.isPending || !assetTag || !assetName || !categoryId}
          className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white shadow-lg shadow-indigo-500/10 hover:shadow-indigo-500/25 transition-all duration-300 px-6 py-5 rounded-lg flex items-center gap-2"
        >
          {mutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving Changes...
            </>
          ) : (
            <>
              <Check className="h-4 w-4" />
              Update Asset
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
