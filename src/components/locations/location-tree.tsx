"use client";

import { ChevronRight, ChevronDown, MapPin, Building, Plus, Pencil, Trash2, Loader2, AlertCircle } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LocationModal } from "./location-modal";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { LocationTree as LocationTreeType } from "@/services/location-service";

interface Props {
  locations: LocationTreeType[];
  level?: number;
}

export function LocationTree({ locations, level = 0 }: Props) {
  if (locations.length === 0 && level === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed rounded-xl bg-muted/10 border-border/40 animate-in fade-in duration-500">
        <div className="p-4 bg-background rounded-full border border-border/40 shadow-xs mb-4">
           <MapPin size={32} className="text-primary/60" />
        </div>
        <h3 className="text-sm font-semibold text-foreground/80">No locations found</h3>
        <p className="text-xs text-muted-foreground/60 mt-1 max-w-xs">Start by adding a top-level location to begin your organizational structure.</p>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-2", level > 0 && "ml-5 pl-5 border-l-2 border-primary/10")}>
      {locations.map((loc) => (
        <LocationItem key={loc.id} location={loc} level={level} />
      ))}
    </div>
  );
}

function LocationItem({ location, level }: { location: LocationTreeType; level: number }) {
  const [isOpen, setIsOpen] = useState(true);
  const router = useRouter();
  const hasChildren = location.children && location.children.length > 0;

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"edit" | "add-child">("edit");

  // Action State
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isActionProcessing, setIsActionProcessing] = useState(false);

  const handleAction = async () => {
    setIsActionProcessing(true);
    try {
      const res = await fetch(`/api/locations/${location.id}`, {
        method: "DELETE",
      });
      
      let result;
      try {
        result = await res.json();
      } catch (e) {
        result = { error: "A server-side error occurred. Please check site dependencies." };
      }
      
      if (!res.ok) {
        throw new Error(result.error || `Failed to ${location.isActive ? "deactivate" : "delete"} location`);
      }

      toast.success(location.isActive ? "Location Disabled" : "Location Purged", { 
        description: location.isActive 
          ? `"${location.name}" has been removed from active site rotation.`
          : `"${location.name}" has been permanently removed from the database.`
      });
      router.refresh();
      setIsConfirmOpen(false);
    } catch (error: any) {
       toast.error("Process Blocked", { 
         description: error.message,
         icon: <AlertCircle className="text-destructive font-black" />
       });
    } finally {
      setIsActionProcessing(false);
    }
  };

  return (
    <div className="flex flex-col animate-in slide-in-from-left-2 duration-300">
      <div className="flex items-center gap-3 py-2 px-3 rounded-xl hover:bg-muted/40 transition-all group border border-transparent hover:border-border/30">
        {hasChildren ? (
          <button 
            onClick={() => setIsOpen(!isOpen)} 
            className="text-muted-foreground/60 hover:text-primary transition-colors outline-none size-6 flex items-center justify-center rounded-md hover:bg-background shadow-2xs border border-border/20"
          >
            {isOpen ? <ChevronDown size={13} className="stroke-2" /> : <ChevronRight size={13} className="stroke-2" />}
          </button>
        ) : (
          <div className="size-6 shrink-0 flex items-center justify-center">
             <div className="size-1 rounded-full bg-muted-foreground/30" />
          </div>
        )}
        
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className={cn(
            "p-1.5 rounded-lg shrink-0 transition-colors shadow-3xs border border-border/10",
            level === 0 ? "bg-primary/5 text-primary border-primary/10" : "bg-muted/80 text-muted-foreground group-hover:bg-primary/5 group-hover:text-primary group-hover:border-primary/10"
          )}>
            {level === 0 ? <Building size={15} /> : <MapPin size={14} />}
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2">
              <span className={cn(
                "font-semibold text-sm tracking-tight truncate group-hover:text-primary transition-colors text-foreground/80", 
                !location.isActive && "text-muted-foreground/45 line-through decoration-destructive/40"
              )}>
                {location.name}
              </span>
              {location.code && (
                <span className="text-[10px] text-primary bg-primary/5 border border-primary/15 px-1.5 py-0.5 rounded font-mono font-medium tracking-tight shrink-0">
                  {location.code}
                </span>
              )}
              {!location.isActive && (
                <Badge variant="outline" className="text-[9px] h-4.5 px-1.5 uppercase font-bold tracking-wider border-destructive/20 text-destructive/80 bg-destructive/5 shadow-none rounded">Disabled</Badge>
              )}
            </div>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-4 text-xs font-semibold text-muted-foreground/60 mr-4">
          <div className="flex items-center gap-1 transition-colors">
            <span className="text-foreground/80">{location._count?.assets || 0}</span> assets
          </div>
          <div className="flex items-center gap-1 transition-colors">
            <span className="text-foreground/80">{location._count?.employees || 0}</span> staff
          </div>
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0">
          <Button 
            variant="ghost" 
            size="icon" 
            className="size-9 rounded-xl hover:bg-primary/10 hover:text-primary transition-colors"
            onClick={() => { setModalMode("add-child"); setIsModalOpen(true); }}
            title="Add Sub-location"
          >
            <Plus size={16} />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="size-9 rounded-xl hover:bg-primary/10 hover:text-primary transition-colors"
            onClick={() => { setModalMode("edit"); setIsModalOpen(true); }}
            title="Edit Location"
          >
            <Pencil size={15} />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className={cn(
              "size-9 rounded-xl transition-colors",
              location.isActive 
                ? "hover:bg-destructive/10 hover:text-destructive" 
                : "text-destructive font-black bg-destructive/5 hover:bg-destructive hover:text-white"
            )}
            onClick={() => setIsConfirmOpen(true)}
            title={location.isActive ? "Deactivate" : "Delete Permanently"}
          >
            <Trash2 size={15} />
          </Button>
        </div>
      </div>

      {hasChildren && isOpen && (
        <LocationTree locations={location.children} level={level + 1} />
      )}

      {/* CRUD Modals */}
      <LocationModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        location={modalMode === "edit" ? location : undefined}
        parentId={modalMode === "add-child" ? location.id : undefined}
        onSuccess={() => router.refresh()}
      />

      <Dialog open={isConfirmOpen} onOpenChange={(open) => !open && setIsConfirmOpen(false)}>
        <DialogContent className="rounded-xl border border-border/40 shadow-xl max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-destructive">
              {location.isActive ? "Deactivate Location" : "Delete Location"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-2 leading-relaxed">
              {location.isActive ? (
                <>
                  Are you sure you want to deactivate <strong>{location.name}</strong>? 
                  <br/><br/>
                  This will prevent the location and its sub-locations from receiving new assignments. This action will fail if active assets or employees are currently mapped here.
                </>
              ) : (
                <>
                  Are you sure you want to permanently delete <strong>{location.name}</strong>? 
                  <br/><br/>
                  This action cannot be undone. This will fail if any historical data remains linked to this location.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 pt-4">
            <Button variant="ghost" onClick={() => setIsConfirmOpen(false)} className="rounded-lg h-9 px-4 text-xs font-semibold">
              Cancel
            </Button>
            <Button 
              onClick={(e) => { e.preventDefault(); handleAction(); }}
              className="rounded-lg h-9 px-4 bg-destructive text-destructive-foreground hover:bg-destructive/90 text-xs font-semibold shadow-2xs"
              disabled={isActionProcessing}
            >
              {isActionProcessing ? <Loader2 className="animate-spin size-4" /> : (location.isActive ? "Deactivate" : "Delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

