"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

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

import type { InventoryCategory, InventoryLocation, UnitOfMeasure, InventoryItem, InventoryItemType } from "@prisma/client";

const formSchema = z.object({
  sku: z.string().min(1, "SKU is required"),
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  categoryId: z.string().optional(),
  unitId: z.string().optional(),
  defaultLocationId: z.string().optional(),
  itemType: z.enum(["CONSUMABLE", "SPARE", "TOOL", "OTHER"]),
  minStockLevel: z.number().min(0),
  reorderLevel: z.number().min(0),
});

type FormValues = z.infer<typeof formSchema>;

export function AddItemModal({
  open,
  onOpenChange,
  categories,
  locations,
  units,
  editingItem,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: InventoryCategory[];
  locations: InventoryLocation[];
  units: UnitOfMeasure[];
  editingItem: InventoryItem | null;
}) {
  const [loading, setLoading] = useState(false);
  const isEditing = !!editingItem;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      sku: "",
      name: "",
      description: "",
      categoryId: undefined,
      unitId: undefined,
      defaultLocationId: undefined,
      itemType: "CONSUMABLE",
      minStockLevel: 0,
      reorderLevel: 0,
    },
  });

  useEffect(() => {
    if (editingItem && open) {
      form.reset({
        sku: editingItem.sku,
        name: editingItem.name,
        description: editingItem.description || "",
        categoryId: editingItem.categoryId || undefined,
        unitId: editingItem.unitId || undefined,
        defaultLocationId: editingItem.defaultLocationId || undefined,
        itemType: editingItem.itemType,
        minStockLevel: editingItem.minStockLevel,
        reorderLevel: editingItem.reorderLevel,
      });
    } else if (open) {
      form.reset({
        sku: "",
        name: "",
        description: "",
        categoryId: undefined,
        unitId: undefined,
        defaultLocationId: undefined,
        itemType: "CONSUMABLE",
        minStockLevel: 0,
        reorderLevel: 0,
      });
    }
  }, [editingItem, open, form]);

  async function onSubmit(values: FormValues) {
    setLoading(true);
    try {
      const payload: CreateInventoryItemInput = {
        ...values,
      };

      if (isEditing && editingItem?.id) {
        await updateInventoryItem(editingItem.id, payload);
      } else {
        await createInventoryItem(payload);
      }
      onOpenChange(false);
    } catch (err: any) {
      alert(err.message || "Failed to save item");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Item" : "Add Inventory Item"}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="sku"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>SKU</FormLabel>
                    <FormControl>
                      <Input placeholder="PRT-001" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Item Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Replacement Screen" {...field} />
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
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Input placeholder="Optional detailed info" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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
                             field.value === "SPARE" ? "Spare Part" : 
                             field.value === "TOOL" ? "Tool" : 
                             field.value === "OTHER" ? "Other" : null}
                          </SelectValue>
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="CONSUMABLE">Consumable</SelectItem>
                        <SelectItem value="SPARE">Spare Part</SelectItem>
                        <SelectItem value="TOOL">Tool</SelectItem>
                        <SelectItem value="OTHER">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="defaultLocationId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Default Location</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Location">
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
                  </FormItem>
                )}
              />
            </div>

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
                        {...field} 
                        onChange={(e) => field.onChange(e.target.value === "" ? 0 : Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={loading}>{loading ? "Saving..." : "Save Item"}</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
