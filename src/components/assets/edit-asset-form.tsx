"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Sparkles, Loader2 } from "lucide-react";

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
        throw new Error(data.error || "Failed to fetch image");
      }
      if (data.imageUrl) {
        setImageUrl(data.imageUrl);
        toast.success("Successfully fetched product image!");
      } else {
        toast.error("No product image found on the site.");
      }
    } catch (err: any) {
      toast.error(err.message || "Error fetching product image");
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
    <form onSubmit={onSubmit} className="space-y-8 max-w-4xl">
      <div className="space-y-6 rounded-xl border bg-card p-6 shadow-sm">
        <h3 className="text-lg font-semibold">Asset Specifics</h3>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <div className="grid gap-2">
            <Label htmlFor="assetCategory">Asset Category</Label>
            <Select value={categoryId} onValueChange={(val) => setCategoryId(val || "")}>
              <SelectTrigger id="assetCategory">
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
            <Label htmlFor="vendor">Vendor</Label>
            <Select value={vendorId} onValueChange={(val) => setVendorId(val || "none")}>
              <SelectTrigger id="vendor">
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
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
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
              placeholder="Latitude 5440"
            />
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <div className="grid gap-2">
            <Label htmlFor="serialNumber">Serial Number / Service Tag</Label>
            <Input
              id="serialNumber"
              value={serialNumber}
              onChange={(e) => setSerialNumber(e.target.value)}
              placeholder="Serial / service tag"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="locationId">Location</Label>
            <Select value={locationId} onValueChange={(val) => setLocationId(val || "none")}>
              <SelectTrigger id="locationId">
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
            <Label htmlFor="purchaseDate">Purchase Date</Label>
            <Input
              id="purchaseDate"
              type="date"
              value={purchaseDate}
              onChange={(e) => setPurchaseDate(e.target.value)}
            />
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
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <div className="grid gap-2">
            <Label htmlFor="replacementValue">Replacement Value</Label>
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
            <Label htmlFor="warrantyExpiration">Warranty Expiry</Label>
            <Input
              id="warrantyExpiration"
              type="date"
              value={warrantyExpiration}
              onChange={(e) => setWarrantyExpiration(e.target.value)}
            />
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-3">
          <div className="grid gap-2 lg:col-span-2">
            <Label htmlFor="specifications">Specifications</Label>
            <Input
              id="specifications"
              value={specifications}
              onChange={(e) => setSpecifications(e.target.value)}
              placeholder="16GB RAM, 512GB SSD"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="accessoriesIncluded">Accessories</Label>
            <Input
              id="accessoriesIncluded"
              value={accessoriesIncluded}
              onChange={(e) => setAccessoriesIncluded(e.target.value)}
              placeholder="Charger, Bag"
            />
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <div className="grid gap-2">
            <Label htmlFor="departmentId">Department</Label>
            <Select value={departmentId} onValueChange={(val) => setDepartmentId(val || "none")}>
              <SelectTrigger id="departmentId">
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
            <Label htmlFor="purchasedFromDepartmentId">Purchased From Company</Label>
            <Select value={purchasedFromDepartmentId} onValueChange={(val) => setPurchasedFromDepartmentId(val || "none")}>
              <SelectTrigger id="purchasedFromDepartmentId">
                <SelectValue placeholder="Select company">
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

          <div className="grid gap-2">
            <Label htmlFor="condition">Condition</Label>
            <Input
              id="condition"
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
              placeholder="Good / New"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="status">Asset Status</Label>
            <Select value={status} onValueChange={(val) => setStatus(val || "ACTIVE")}>
              <SelectTrigger id="status">
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
            <Label htmlFor="attachmentUrl">Photos / Attachment URL</Label>
            <Input
              id="attachmentUrl"
              value={attachmentUrl}
              onChange={(e) => setAttachmentUrl(e.target.value)}
              placeholder="File URL"
            />
          </div>

          <div className="grid gap-2 lg:col-span-2">
            <Label htmlFor="imageUrl">Product Image URL</Label>
            <Input
              id="imageUrl"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://m.media-amazon.com/images/I/... or any image URL"
            />
            {imageUrl && (
              <div className="mt-1.5 flex items-center gap-3 p-2 rounded-lg border bg-muted/20">
                <img src={imageUrl} alt="Asset preview" className="h-10 w-10 rounded-md object-contain border bg-background" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                <p className="text-[11px] text-muted-foreground">Product image preview loaded successfully</p>
              </div>
            )}
          </div>

          <div className="grid gap-2 lg:col-span-2">
            <Label htmlFor="purchaseUrl">Purchase Link URL</Label>
            <div className="flex gap-2">
              <Input
                id="purchaseUrl"
                value={purchaseUrl}
                onChange={(e) => setPurchaseUrl(e.target.value)}
                placeholder="https://www.amazon.in/dp/... or any ecommerce link"
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleFetchImage}
                disabled={isFetchingImage || !purchaseUrl}
                className="shrink-0 flex items-center gap-1.5 bg-violet-500/5 hover:bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/30 hover:border-violet-500/50"
              >
                {isFetchingImage ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5" />
                )}
                Fetch Image
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground">Paste an e-commerce link and click Fetch Image to auto-extract the image link.</p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={mutation.isPending || !assetTag || !assetName || !categoryId}
        >
          {mutation.isPending ? "Updating..." : "Update Asset"}
        </Button>
      </div>
    </form>
  );
}
