"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { locationSchema, LocationFormInput } from "@/lib/validations/locations";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useState, useEffect, useCallback } from "react";
import { Loader2, Save, MapPin } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  location?: any; // If editing
  parentId?: string; // If adding sub-location
  onSuccess: () => void;
}

export function LocationModal({ isOpen, onClose, location, parentId, onSuccess }: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const [allLocations, setAllLocations] = useState<any[]>([]);
  const [isFetchingLocations, setIsFetchingLocations] = useState(false);

  const form = useForm<LocationFormInput>({
    resolver: zodResolver(locationSchema as any),
    defaultValues: {
      name: "",
      code: "",
      description: "",
      parentLocationId: null,
      addressLine1: "",
      addressLine2: "",
      city: "",
      state: "",
      country: "",
      postalCode: "",
      isActive: true,
    },
  });

  const fetchLocations = useCallback(async () => {
    setIsFetchingLocations(true);
    try {
      const res = await fetch("/api/locations?isActive=true");
      if (res.ok) {
        const data = await res.json();
        // Filter out current location if editing to prevent circularity
        setAllLocations(data.filter((l: any) => l.id !== location?.id));
      }
    } catch (error) {
      console.error("Failed to fetch locations", error);
    } finally {
      setIsFetchingLocations(false);
    }
  }, [location?.id]);

  useEffect(() => {
    if (isOpen) {
      fetchLocations();
    }
  }, [isOpen, fetchLocations]);

  useEffect(() => {
    if (location) {
      form.reset({
        ...location,
        description: location.description || "",
        code: location.code || "",
        parentLocationId: location.parentLocationId || null,
        addressLine1: location.addressLine1 || "",
        addressLine2: location.addressLine2 || "",
        city: location.city || "",
        state: location.state || "",
        country: location.country || "",
        postalCode: location.postalCode || "",
      });
    } else {
      form.reset({
        name: "",
        code: "",
        description: "",
        parentLocationId: parentId || null,
        addressLine1: "",
        addressLine2: "",
        city: "",
        state: "",
        country: "",
        postalCode: "",
        isActive: true,
      });
    }
  }, [location, parentId, form]);

  async function onSubmit(data: LocationFormInput) {
    setIsLoading(true);
    try {
      const url = location ? `/api/locations/${location.id}` : "/api/locations";
      const method = location ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || `Failed to ${location ? "update" : "create"} location`);
      }

      toast.success(location ? "Location Updated" : "Location Created", {
        description: `Physical site "${data.name}" has been synchronized.`
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

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto rounded-xl border border-border/40 shadow-xl p-5">
        <DialogHeader className="pb-3 border-b border-border/30">
          <div className="flex items-center gap-3">
             <div className="p-1.5 bg-primary/5 rounded-lg text-primary border border-primary/10">
                <MapPin size={16} />
             </div>
             <div>
                <DialogTitle className="text-base font-bold text-foreground/80">
                  {location ? "Edit Location" : "Add Location"}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                   {location ? `Update details for location: ${location.name}` : "Create a new branch node in your organizational hierarchy."}
                </DialogDescription>
             </div>
          </div>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Primary Details */}
            <div className="space-y-4 md:col-span-2">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80 ml-1">Location Name</Label>
                <Input 
                  {...form.register("name")} 
                  placeholder="e.g. Headquarters, Floor 1, Server Room" 
                  className="h-10 rounded-lg border border-border/60 bg-background text-sm focus-visible:ring-primary/10 focus-visible:border-primary/40 transition-all shadow-3xs font-medium"
                />
                {form.formState.errors.name && <p className="text-[10px] font-semibold text-destructive ml-1">{form.formState.errors.name.message}</p>}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80 ml-1">Internal Code (Optional)</Label>
                  <Input 
                    {...form.register("code")} 
                    placeholder="e.g. HQ-01" 
                    className="h-9.5 rounded-lg border border-border/60 bg-background text-xs font-mono font-medium focus-visible:ring-primary/10 focus-visible:border-primary/40 transition-all shadow-3xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80 ml-1">Parent Hierarchy</Label>
                  <Select 
                    disabled={isFetchingLocations || !!parentId} 
                    onValueChange={(val) => form.setValue("parentLocationId", val === "root" ? null : val)}
                    value={form.watch("parentLocationId") || "root"}
                  >
                    <SelectTrigger className="h-9.5 rounded-lg border border-border/60 bg-background text-xs font-medium focus:ring-primary/10 focus:border-primary/40 transition-all shadow-3xs">
                      <SelectValue placeholder="Select parent location">
                        {form.watch("parentLocationId") === null ? "Root (Top Level)" : 
                         allLocations.find(l => l.id === form.watch("parentLocationId"))?.name}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="rounded-lg border border-border/40 shadow-md">
                      <SelectItem value="root" className="font-bold text-[10px] tracking-wider text-primary uppercase">Root (Top Level)</SelectItem>
                      {allLocations.map((loc) => (
                        <SelectItem key={loc.id} value={loc.id} className="text-xs">
                          {loc.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {parentId && <p className="text-[10px] font-semibold text-primary/80 italic ml-1 mt-0.5">Locked: Branch Context</p>}
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5 md:col-span-2">
               <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80 ml-1">Description / Purpose</Label>
               <Textarea 
                 {...form.register("description")} 
                 placeholder="Define the primary use-case for this physical space..." 
                 className="min-h-[80px] rounded-lg border border-border/60 bg-background text-xs font-medium resize-none focus-visible:ring-primary/10 focus-visible:border-primary/40 transition-all shadow-3xs"
               />
            </div>

            {/* Address Details - Divider */}
            <div className="md:col-span-2 flex items-center gap-2 pt-2">
               <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80 shrink-0 flex items-center gap-1.5">
                  <MapPin size={11} /> Address Details
               </span>
               <div className="h-px w-full bg-border/30" />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80 ml-1">Address Line 1</Label>
              <Input {...form.register("addressLine1")} className="h-9.5 rounded-lg border border-border/60 bg-background text-xs font-medium focus-visible:ring-primary/10 focus-visible:border-primary/40 transition-all shadow-3xs" />
            </div>
            
            <div className="space-y-1.5 md:col-span-2">
              <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80 ml-1">Address Line 2 (Optional)</Label>
              <Input {...form.register("addressLine2")} className="h-9.5 rounded-lg border border-border/60 bg-background text-xs font-medium focus-visible:ring-primary/10 focus-visible:border-primary/40 transition-all shadow-3xs" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80 ml-1">City</Label>
              <Input {...form.register("city")} className="h-9.5 rounded-lg border border-border/60 bg-background text-xs font-medium focus-visible:ring-primary/10 focus-visible:border-primary/40 transition-all shadow-3xs" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80 ml-1">State / Province</Label>
              <Input {...form.register("state")} className="h-9.5 rounded-lg border border-border/60 bg-background text-xs font-medium focus-visible:ring-primary/10 focus-visible:border-primary/40 transition-all shadow-3xs" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80 ml-1">Postal Code</Label>
              <Input {...form.register("postalCode")} className="h-9.5 rounded-lg border border-border/60 bg-background text-xs font-medium focus-visible:ring-primary/10 focus-visible:border-primary/40 transition-all shadow-3xs" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80 ml-1">Country</Label>
              <Input {...form.register("country")} className="h-9.5 rounded-lg border border-border/60 bg-background text-xs font-medium focus-visible:ring-primary/10 focus-visible:border-primary/40 transition-all shadow-3xs" />
            </div>
          </div>

          <DialogFooter className="pt-4 border-t border-border/30 gap-2">
            <Button type="button" variant="ghost" onClick={onClose} className="rounded-lg h-9 px-4 text-xs font-semibold hover:bg-muted transition-colors">
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} className="rounded-lg h-9 px-5 font-semibold text-xs transition-all duration-150 min-w-[120px] shadow-2xs">
              {isLoading ? <Loader2 className="animate-spin size-4" /> : <><Save className="mr-1.5 size-3.5" /> {location ? "Save Changes" : "Add Location"}</>}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
