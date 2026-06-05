"use client";

import { useEffect, useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Sparkles, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createInventoryItem, updateInventoryItem, CreateInventoryItemInput } from "@/app/actions/inventory-item-actions";

import { toast } from "sonner";
import type { InventoryCategory, InventoryLocation, UnitOfMeasure, InventoryItem } from "@prisma/client";

const formSchema = z.object({
  sku: z.string().optional(),
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  categoryId: z.string().optional(),
  unitId: z.string().optional(),
  defaultLocationId: z.string().min(1, "Location is required"),
  itemType: z.enum(["CONSUMABLE", "IT_ASSETS", "TOOL", "FIXED_ASSETS", "ELECTRONICS_ITEMS", "OTHER"]),
  minStockLevel: z.number().min(0),
  reorderLevel: z.number().min(0),

  // Asset-like fields
  totalQuantity: z.number().min(1, "Quantity must be at least 1"),
  brand: z.string().optional(),
  model: z.string().optional(),
  serialNumber: z.string().optional(),
  vendorId: z.string().optional(),
  purchasedFromDepartmentId: z.string().optional(),
  departmentId: z.string().optional(),
  purchaseDate: z.string().optional().nullable(),
  cost: z.number().min(0).optional(),
  warranty: z.string().optional(),
  warrantyExpiration: z.string().optional().nullable(),
  condition: z.string().optional(),
  imageUrl: z.string().optional(),
  purchaseUrl: z.string().optional(),
  specifications: z.string().optional(),
  accessoriesIncluded: z.string().optional(),
  estimatedReplacementValue: z.number().min(0).optional(),
  attachmentUrl: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export function AddItemModal({
  open,
  onOpenChange,
  categories,
  locations,
  units,
  vendors = [],
  departments = [],
  editingItem,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: { id: string; name: string }[];
  locations: InventoryLocation[];
  units: UnitOfMeasure[];
  vendors?: { id: string; name: string }[];
  departments?: { id: string; name: string }[];
  editingItem: any | null;
}) {
  const [loading, setLoading] = useState(false);
  const [isFetchingImage, setIsFetchingImage] = useState(false);
  const isEditing = !!editingItem;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      sku: "",
      name: "",
      description: "",
      categoryId: "",
      unitId: "",
      defaultLocationId: "",
      itemType: "CONSUMABLE",
      minStockLevel: 0,
      reorderLevel: 0,
      totalQuantity: 1,
      brand: "",
      model: "",
      serialNumber: "",
      vendorId: "",
      purchasedFromDepartmentId: "",
      departmentId: "",
      purchaseDate: new Date().toISOString().slice(0, 10),
      cost: 0,
      warranty: "",
      warrantyExpiration: "",
      condition: "",
      imageUrl: "",
      purchaseUrl: "",
      specifications: "",
      accessoriesIncluded: "",
      estimatedReplacementValue: 0,
      attachmentUrl: "",
    },
  });

  const watchPurchaseDate = form.watch("purchaseDate");
  const watchWarranty = form.watch("warranty");

  const updateWarrantyExpiration = (warrantyText: string, pDate: string) => {
    if (!pDate) return;
    const baseDate = new Date(pDate);
    if (isNaN(baseDate.getTime())) return;

    const trimmed = (warrantyText || "").trim();
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
      form.setValue("warrantyExpiration", baseDate.toISOString().slice(0, 10));
      return;
    }

    const justNumber = trimmed.match(/^(\d+(?:\.\d+)?)$/);
    if (justNumber) {
      const value = parseFloat(justNumber[1]);
      baseDate.setFullYear(baseDate.getFullYear() + value);
      form.setValue("warrantyExpiration", baseDate.toISOString().slice(0, 10));
    }
  };

  useEffect(() => {
    if (watchPurchaseDate && watchWarranty) {
      updateWarrantyExpiration(watchWarranty, watchPurchaseDate);
    }
  }, [watchPurchaseDate, watchWarranty]);

  const handleFetchImage = async () => {
    const purchaseUrl = form.getValues("purchaseUrl")?.trim();
    if (!purchaseUrl) {
      toast.error("Please enter a Purchase Link URL first");
      return;
    }
    setIsFetchingImage(true);
    try {
      const response = await fetch("/api/scrape-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: purchaseUrl }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch product details");
      }

      let autofilledFields = [];
      if (data.imageUrl) {
        form.setValue("imageUrl", data.imageUrl);
        autofilledFields.push("Image");
      }
      if (data.title && !form.getValues("name")) {
        form.setValue("name", data.title);
        autofilledFields.push("Item Name");
      }
      if (data.brand && !form.getValues("brand")) {
        form.setValue("brand", data.brand);
        autofilledFields.push("Brand");
      }
      if (data.price && !form.getValues("cost")) {
        form.setValue("cost", parseFloat(data.price));
        autofilledFields.push("Cost");
      }
      if (data.description && !form.getValues("specifications")) {
        const cleanDesc = data.description.length > 150 ? data.description.slice(0, 147) + "..." : data.description;
        form.setValue("specifications", cleanDesc);
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

  useEffect(() => {
    if (editingItem && open) {
      form.reset({
        sku: editingItem.sku,
        name: editingItem.name,
        description: editingItem.description || "",
        categoryId: editingItem.categoryId || "",
        unitId: editingItem.unitId || "",
        defaultLocationId: editingItem.defaultLocationId || "",
        itemType: editingItem.itemType,
        minStockLevel: editingItem.minStockLevel,
        reorderLevel: editingItem.reorderLevel,
        totalQuantity: editingItem.totalQuantity || 1,
        brand: editingItem.brand || "",
        model: editingItem.model || "",
        serialNumber: editingItem.serialNumber || "",
        vendorId: editingItem.vendorId || "",
        purchasedFromDepartmentId: editingItem.purchasedFromDepartmentId || "",
        departmentId: editingItem.departmentId || "",
        purchaseDate: editingItem.purchaseDate ? new Date(editingItem.purchaseDate).toISOString().slice(0, 10) : "",
        cost: editingItem.cost || 0,
        warranty: editingItem.warranty || "",
        warrantyExpiration: editingItem.warrantyExpiration ? new Date(editingItem.warrantyExpiration).toISOString().slice(0, 10) : "",
        condition: editingItem.condition || "",
        imageUrl: editingItem.imageUrl || "",
        purchaseUrl: editingItem.purchaseUrl || "",
        specifications: editingItem.specifications || "",
        accessoriesIncluded: editingItem.accessoriesIncluded ? editingItem.accessoriesIncluded.join(", ") : "",
        estimatedReplacementValue: editingItem.estimatedReplacementValue || 0,
        attachmentUrl: editingItem.attachmentUrl || "",
      });
    } else if (open) {
      form.reset({
        sku: "",
        name: "",
        description: "",
        categoryId: "",
        unitId: "",
        defaultLocationId: "",
        itemType: "CONSUMABLE",
        minStockLevel: 0,
        reorderLevel: 0,
        totalQuantity: 1,
        brand: "",
        model: "",
        serialNumber: "",
        vendorId: "",
        purchasedFromDepartmentId: "",
        departmentId: "",
        purchaseDate: new Date().toISOString().slice(0, 10),
        cost: 0,
        warranty: "",
        warrantyExpiration: "",
        condition: "",
        imageUrl: "",
        purchaseUrl: "",
        specifications: "",
        accessoriesIncluded: "",
        estimatedReplacementValue: 0,
        attachmentUrl: "",
      });
    }
  }, [editingItem, open, form]);

  async function onSubmit(values: FormValues) {
    setLoading(true);
    try {
      const payload: CreateInventoryItemInput = {
        ...values,
        accessoriesIncluded: values.accessoriesIncluded
          ? values.accessoriesIncluded.split(",").map((x) => x.trim()).filter(Boolean)
          : [],
      };

      if (isEditing && editingItem?.id) {
        await updateInventoryItem(editingItem.id, payload);
        toast.success("Inventory stock updated successfully");
      } else {
        await createInventoryItem(payload);
        toast.success("Inventory stock added successfully");
      }
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to save item");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[850px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Inventory Stock Details" : "Add Inventory Stock"}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            
            {/* Section A: Administrative Details */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold border-b pb-1">A. Administrative Details</h3>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <FormField
                  control={form.control}
                  name="sku"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>SKU / Item Code</FormLabel>
                      <FormControl>
                        <Input placeholder="PRT-001" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="totalQuantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quantity</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="1"
                          {...field} 
                          onChange={(e) => field.onChange(e.target.value === "" ? 1 : Number(e.target.value))}
                          disabled={isEditing}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="defaultLocationId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select Location">
                              {locations.find(l => l.id === field.value)?.name}
                            </SelectValue>
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {locations.map((l) => (
                            <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="departmentId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Owner Department</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select Owner">
                              {departments.find(d => d.id === field.value)?.name}
                            </SelectValue>
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {departments.map((d) => (
                            <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="purchasedFromDepartmentId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Purchased From Department / Company</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select Source">
                              {departments.find(d => d.id === field.value)?.name}
                            </SelectValue>
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {departments.map((d) => (
                            <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="vendorId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vendor / Supplier</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select Vendor">
                              {vendors.find(v => v.id === field.value)?.name}
                            </SelectValue>
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {vendors.map((v) => (
                            <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Section B: Item Specifics */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold border-b pb-1">B. Item Specifics</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Item Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Laptop / Replacement Screen" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="brand"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Brand</FormLabel>
                        <FormControl>
                          <Input placeholder="Apple / HP" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="model"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Model</FormLabel>
                        <FormControl>
                          <Input placeholder="Latitude 5440" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <FormField
                  control={form.control}
                  name="serialNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Serial Number (If Bulk, keep empty)</FormLabel>
                      <FormControl>
                        <Input placeholder="Optional Serial No." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="categoryId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Category">
                              {categories.find(c => c.id === field.value)?.name}
                            </SelectValue>
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categories.map((c) => (
                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="unitId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unit of Measure</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Unit">
                              {units.find(u => u.id === field.value)?.name}
                            </SelectValue>
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {units.map((u) => (
                            <SelectItem key={u.id} value={u.id}>{u.name} ({u.symbol})</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="itemType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue>
                              {field.value === "CONSUMABLE" ? "Consumable" : 
                               field.value === "IT_ASSETS" ? "IT Assets" : 
                               field.value === "TOOL" ? "Tool" : 
                               field.value === "FIXED_ASSETS" ? "Fixed Assets" :
                               field.value === "ELECTRONICS_ITEMS" ? "Electronics Items" :
                               field.value === "OTHER" ? "Other" : null}
                            </SelectValue>
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="CONSUMABLE">Consumable</SelectItem>
                          <SelectItem value="IT_ASSETS">IT Assets</SelectItem>
                          <SelectItem value="TOOL">Tool</SelectItem>
                          <SelectItem value="FIXED_ASSETS">Fixed Assets</SelectItem>
                          <SelectItem value="ELECTRONICS_ITEMS">Electronics Items</SelectItem>
                          <SelectItem value="OTHER">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="purchaseDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Purchase Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="cost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Purchase Cost (INR)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="0"
                          step="0.01"
                          {...field} 
                          onChange={(e) => field.onChange(e.target.value === "" ? 0 : Number(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="estimatedReplacementValue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Replacement Value</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="0"
                          step="0.01"
                          {...field} 
                          onChange={(e) => field.onChange(e.target.value === "" ? 0 : Number(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="warranty"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Warranty Details</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. 1 Year" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="warrantyExpiration"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Warranty Expiry</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Section C: Specifications, Images & Condition */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold border-b pb-1">C. Specifications & Condition</h3>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="specifications"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Specifications</FormLabel>
                      <FormControl>
                        <Input placeholder="16GB RAM, 512GB SSD, etc." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="accessoriesIncluded"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Accessories Included</FormLabel>
                      <FormControl>
                        <Input placeholder="Charger, Mouse, Case" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="imageUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Product Image URL</FormLabel>
                      <FormControl>
                        <Input placeholder="https://..." {...field} />
                      </FormControl>
                      <FormMessage />
                      {field.value && (
                        <div className="mt-1 flex items-center gap-2">
                          <img src={field.value} className="h-8 w-8 object-contain border rounded bg-background" onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }} />
                          <span className="text-[10px] text-muted-foreground">Preview loaded</span>
                        </div>
                      )}
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="purchaseUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Purchase Link URL</FormLabel>
                      <div className="flex gap-2">
                        <FormControl>
                          <Input placeholder="https://amazon.com/..." {...field} />
                        </FormControl>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleFetchImage}
                          disabled={isFetchingImage || !field.value}
                          className="shrink-0 flex items-center gap-1 bg-violet-500/5 text-violet-600 border-violet-500/30 text-xs"
                        >
                          {isFetchingImage ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                          Fetch
                        </Button>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="condition"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Physical Condition</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Brand New / Sealed" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="attachmentUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Attachment Link</FormLabel>
                      <FormControl>
                        <Input placeholder="Google Drive / Dropbox Link" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description / Remarks</FormLabel>
                    <FormControl>
                      <Input placeholder="Write notes here" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="reorderLevel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reorder Level (Alert Threshold)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="0"
                          {...field} 
                          onChange={(e) => field.onChange(e.target.value === "" ? 0 : Number(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="minStockLevel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Minimum Stock (Safety Stock)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="0"
                          {...field} 
                          onChange={(e) => field.onChange(e.target.value === "" ? 0 : Number(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Saving..." : isEditing ? "Save Stock Changes" : "Add Inventory Stock"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
