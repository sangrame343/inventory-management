"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { domainSchemas } from "@/lib/validations/settings";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { Loader2, Save } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  domain: string;
  label: string;
  item?: any; // If editing
  onSuccess: () => void;
}

export function MasterDataModal({ isOpen, onClose, domain, label, item, onSuccess }: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const schema = domainSchemas[domain];

  const form = useForm({
    resolver: zodResolver(schema as any),
    defaultValues: {
       name: "",
       description: "",
       isActive: true,
       ...(domain === "vendors" ? {
         contactName: "",
         email: "",
         phone: "",
         service: "",
         addressLine1: "",
         addressLine2: "",
         city: "",
         state: "",
         country: "",
         postalCode: "",
       } : {}),
       ...(domain === "units-of-measure" ? { symbol: "" } : {}),
       ...(domain === "inventory-locations" ? { code: "" } : {}),
    },
  });

  useEffect(() => {
    if (item) {
      form.reset({
        ...item,
        description: item.description || "",
        ...(domain === "vendors" ? {
          contactName: item.contactName || "",
          email: item.email || "",
          phone: item.phone || "",
          service: item.service || "",
          addressLine1: item.addressLine1 || "",
          addressLine2: item.addressLine2 || "",
          city: item.city || "",
          state: item.state || "",
          country: item.country || "",
          postalCode: item.postalCode || "",
        } : {}),
        ...(domain === "units-of-measure" ? { symbol: item.symbol || "" } : {}),
        ...(domain === "inventory-locations" ? { code: item.code || "" } : {}),
      });
    } else {
      form.reset({
        name: "",
        description: "",
        isActive: true,
        ...(domain === "vendors" ? {
          contactName: "",
          email: "",
          phone: "",
          service: "",
          addressLine1: "",
          addressLine2: "",
          city: "",
          state: "",
          country: "",
          postalCode: "",
        } : {}),
        ...(domain === "units-of-measure" ? { symbol: "" } : {}),
        ...(domain === "inventory-locations" ? { code: "" } : {}),
      });
    }
  }, [item, form, domain]);

  async function onSubmit(data: any) {
    setIsLoading(true);
    try {
      const url = item ? `/api/settings/${domain}/${item.id}` : `/api/settings/${domain}`;
      const method = item ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || `Failed to ${item ? "update" : "create"} ${label}`);
      }

      toast.success(item ? "Registry Updated" : "Entry Created", {
        description: `${label} "${data.name}" has been successfully synchronized.`
      });
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error("Operation Failed", {
        description: error.message
      });
    } finally {
      setIsLoading(false);
    }
  }

  const isVendor = domain === "vendors";
  const isUOM = domain === "units-of-measure";
  const isLocation = domain === "inventory-locations";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-[2rem] border-none shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black uppercase tracking-tight">
            {item ? `Edit ${label}` : `Add New ${label}`}
          </DialogTitle>
          <DialogDescription className="font-medium text-muted-foreground">
            {item ? `Modify existing registry entry for ${label.toLowerCase()}.` : `Create a new organization-wide ${label.toLowerCase()} record.`}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2 md:col-span-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Name</Label>
              <Input 
                {...form.register("name")} 
                placeholder={`Enter ${label.toLowerCase()} name`} 
                className="h-12 rounded-xl bg-muted/30 border-none shadow-inner font-bold focus-visible:ring-primary"
              />
              {form.formState.errors.name && <p className="text-[10px] font-bold text-destructive ml-1">{(form.formState.errors.name as any).message}</p>}
            </div>

            {isUOM && (
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Symbol (Req.)</Label>
                <Input 
                  {...form.register("symbol")} 
                  placeholder="e.g. KG, PCS, LTR" 
                  className="h-12 rounded-xl bg-muted/30 border-none shadow-inner font-mono font-bold focus-visible:ring-primary"
                />
                {form.formState.errors.symbol && <p className="text-[10px] font-bold text-destructive ml-1">{(form.formState.errors.symbol as any).message}</p>}
              </div>
            )}

            {isLocation && (
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Code (Optional)</Label>
                <Input 
                  {...form.register("code")} 
                  placeholder="e.g. WH-01" 
                  className="h-12 rounded-xl bg-muted/30 border-none shadow-inner font-mono font-bold focus-visible:ring-primary"
                />
              </div>
            )}

            <div className="space-y-2 md:col-span-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Description</Label>
              <Textarea 
                {...form.register("description")} 
                placeholder="Optional notes or details..." 
                className="min-h-[100px] rounded-2xl bg-muted/30 border-none shadow-inner font-medium focus-visible:ring-primary resize-none"
              />
            </div>

            {isVendor && (
              <>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Contact Name</Label>
                  <Input {...form.register("contactName")} className="h-12 rounded-xl bg-muted/30 border-none shadow-inner font-bold" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Email</Label>
                  <Input {...form.register("email")} type="email" className="h-12 rounded-xl bg-muted/30 border-none shadow-inner font-bold" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Phone</Label>
                  <Input {...form.register("phone")} className="h-12 rounded-xl bg-muted/30 border-none shadow-inner font-bold" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Service Type</Label>
                  <Input {...form.register("service")} placeholder="e.g. Hardware Sales" className="h-12 rounded-xl bg-muted/30 border-none shadow-inner font-bold" />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Address</Label>
                  <Input {...form.register("addressLine1")} placeholder="Line 1" className="h-12 rounded-xl bg-muted/30 border-none shadow-inner font-bold mb-2" />
                  <Input {...form.register("addressLine2")} placeholder="Line 2" className="h-12 rounded-xl bg-muted/30 border-none shadow-inner font-bold" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">City</Label>
                  <Input {...form.register("city")} className="h-12 rounded-xl bg-muted/30 border-none shadow-inner font-bold" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">State</Label>
                  <Input {...form.register("state")} className="h-12 rounded-xl bg-muted/30 border-none shadow-inner font-bold" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Country</Label>
                  <Input {...form.register("country")} className="h-12 rounded-xl bg-muted/30 border-none shadow-inner font-bold" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Postal Code</Label>
                  <Input {...form.register("postalCode")} className="h-12 rounded-xl bg-muted/30 border-none shadow-inner font-bold" />
                </div>
              </>
            )}
          </div>

          <DialogFooter className="pt-6 border-t border-border/50 gap-2">
            <Button type="button" variant="ghost" onClick={onClose} className="rounded-xl h-12 px-6 font-bold uppercase text-[10px] tracking-widest">
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} className="rounded-xl h-12 px-8 font-black shadow-lg shadow-primary/20 uppercase text-[11px] tracking-[0.2em] min-w-[140px]">
              {isLoading ? <Loader2 className="animate-spin size-4" /> : <><Save className="mr-2 size-4" /> {item ? "Update" : "Create"}</>}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
