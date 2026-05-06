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
      <DialogContent className="max-w-2xl max-h-[95vh] overflow-y-auto rounded-[2rem] border-none shadow-2xl">
        <DialogHeader className="pb-4 border-b border-border/50">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-primary/10 rounded-xl text-primary">
                <MapPin size={22} className="stroke-[2.5]" />
             </div>
             <div>
                <DialogTitle className="text-2xl font-black uppercase tracking-tight italic">
                  {location ? "Modify Physical Site" : "New Organization Location"}
                </DialogTitle>
                <DialogDescription className="font-bold text-muted-foreground uppercase text-[10px] tracking-widest mt-1">
                   {location ? `Editing registry entry for ${location.name}` : "Create a new node in your company's physical hierarchy."}
                </DialogDescription>
             </div>
          </div>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 py-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Primary Details */}
            <div className="space-y-6 md:col-span-2">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Location Name</Label>
                <Input 
                  {...form.register("name")} 
                  placeholder="e.g. Headquarters, Floor 1, Server Room" 
                  className="h-14 rounded-2xl bg-muted/40 border-none shadow-inner font-black text-lg focus-visible:ring-primary/50 transition-all"
                />
                {form.formState.errors.name && <p className="text-[10px] font-bold text-destructive ml-1">{form.formState.errors.name.message}</p>}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Internal Code (Optional)</Label>
                  <Input 
                    {...form.register("code")} 
                    placeholder="e.g. HQ-01" 
                    className="h-12 rounded-xl bg-muted/30 border-none shadow-inner font-mono font-bold"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Parent Hierarchy</Label>
                  <Select 
                    disabled={isFetchingLocations || !!parentId} 
                    onValueChange={(val) => form.setValue("parentLocationId", val === "root" ? null : val)}
                    value={form.watch("parentLocationId") || "root"}
                  >
                    <SelectTrigger className="h-12 rounded-xl bg-muted/30 border-none shadow-inner font-bold focus:ring-primary/50">
                      <SelectValue placeholder="Select parent location">
                        {form.watch("parentLocationId") === null ? "Root (Top Level)" : 
                         allLocations.find(l => l.id === form.watch("parentLocationId"))?.name}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-none shadow-2xl">
                      <SelectItem value="root" className="font-black uppercase text-[10px] tracking-widest text-primary">Root (Top Level)</SelectItem>
                      {allLocations.map((loc) => (
                        <SelectItem key={loc.id} value={loc.id} className="font-bold">
                          {loc.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {parentId && <p className="text-[9px] font-bold text-primary italic ml-1 mt-1">Locked: Hierarchy Context</p>}
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2 md:col-span-2">
               <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Description / Purpose</Label>
               <Textarea 
                 {...form.register("description")} 
                 placeholder="Define the primary use-case for this physical space..." 
                 className="min-h-[100px] rounded-2xl bg-muted/30 border-none shadow-inner font-medium resize-none focus-visible:ring-primary/50"
               />
            </div>

            {/* Address Details - Visual Divider */}
            <div className="md:col-span-2 flex items-center gap-4 pt-4">
               <span className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground shrink-0 flex items-center gap-2">
                  <MapPin size={12} /> Geographic Metadata
               </span>
               <div className="h-px w-full bg-border/50" />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Address Line 1</Label>
              <Input {...form.register("addressLine1")} className="h-12 rounded-xl bg-muted/30 border-none shadow-inner font-bold" />
            </div>
            
            <div className="space-y-2 md:col-span-2">
              <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Address Line 2 (Optional)</Label>
              <Input {...form.register("addressLine2")} className="h-12 rounded-xl bg-muted/30 border-none shadow-inner font-bold" />
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">City</Label>
              <Input {...form.register("city")} className="h-12 rounded-xl bg-muted/30 border-none shadow-inner font-bold" />
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">State / Province</Label>
              <Input {...form.register("state")} className="h-12 rounded-xl bg-muted/30 border-none shadow-inner font-bold" />
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Postal Code</Label>
              <Input {...form.register("postalCode")} className="h-12 rounded-xl bg-muted/30 border-none shadow-inner font-bold" />
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Country</Label>
              <Input {...form.register("country")} className="h-12 rounded-xl bg-muted/30 border-none shadow-inner font-bold" />
            </div>
          </div>

          <DialogFooter className="pt-8 border-t border-border/50 gap-3">
            <Button type="button" variant="ghost" onClick={onClose} className="rounded-2xl h-14 px-8 font-black uppercase text-[11px] tracking-widest hover:bg-muted focus:ring-0">
              Discard Changes
            </Button>
            <Button type="submit" disabled={isLoading} className="rounded-2xl h-14 px-10 font-black shadow-2xl shadow-primary/30 uppercase text-[12px] tracking-[0.25em] min-w-[200px] transition-all hover:scale-[1.02] active:scale-[0.98]">
              {isLoading ? <Loader2 className="animate-spin size-5" /> : <><Save className="mr-2.5 size-5" /> {location ? "Synchronize" : "Finalize Location"}</>}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
