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
      <div className="flex flex-col items-center justify-center p-20 text-center border-2 border-dashed rounded-[2.5rem] bg-muted/20 border-border/50 animate-in fade-in duration-700">
        <div className="p-6 bg-background rounded-full shadow-2xl shadow-primary/10 mb-6">
           <MapPin size={48} className="text-primary opacity-20" />
        </div>
        <h3 className="text-xl font-black uppercase tracking-tight italic">No physical sites found</h3>
        <p className="text-xs text-muted-foreground font-semibold mt-2 max-w-[240px]">Start by creating a root location to begin your organizational hierarchy.</p>
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
      <div className="flex items-center gap-3 py-3 px-4 rounded-2xl hover:bg-primary/3 transition-all group border border-transparent hover:border-primary/10">
        {hasChildren ? (
          <button 
            onClick={() => setIsOpen(!isOpen)} 
            className="text-muted-foreground hover:text-primary transition-colors outline-none size-6 flex items-center justify-center rounded-lg hover:bg-background shadow-sm"
          >
            {isOpen ? <ChevronDown size={14} className="stroke-3" /> : <ChevronRight size={14} className="stroke-3" />}
          </button>
        ) : (
          <div className="size-6 shrink-0 flex items-center justify-center">
             <div className="size-1.5 rounded-full bg-primary/20" />
          </div>
        )}
        
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className={cn(
            "p-2 rounded-xl shrink-0 transition-colors shadow-sm",
            level === 0 ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground group-hover:bg-primary/5 group-hover:text-primary"
          )}>
            {level === 0 ? <Building size={18} /> : <MapPin size={16} />}
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2">
              <span className={cn(
                "font-black text-sm tracking-tight truncate group-hover:text-primary transition-colors uppercase italic", 
                !location.isActive && "text-muted-foreground/50 line-through decoration-destructive/50"
              )}>
                {location.name}
              </span>
              {location.code && (
                <span className="text-[9px] text-primary/60 bg-primary/5 border border-primary/10 px-2 py-0.5 rounded-lg font-black uppercase tracking-tighter shrink-0">
                  {location.code}
                </span>
              )}
              {!location.isActive && (
                <Badge variant="outline" className="text-[8px] h-4 px-1.5 uppercase font-black tracking-[0.15em] border-destructive/20 text-destructive/60 bg-destructive/5 shadow-none">Disabled</Badge>
              )}
            </div>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-6 text-[10px] uppercase font-black tracking-widest text-muted-foreground/60 mr-4">
          <div className="flex items-center gap-1.5 group-hover:text-primary/70 transition-colors">
            <span className="text-foreground">{location._count?.assets || 0}</span> Assets
          </div>
          <div className="flex items-center gap-1.5 group-hover:text-primary/70 transition-colors">
            <span className="text-foreground">{location._count?.employees || 0}</span> Staff
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
        <DialogContent className="rounded-[2rem] border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black uppercase tracking-tight italic text-destructive">
              {location.isActive ? "Security Protocol: Deactivation" : "CRITICAL: Permanent Deletion"}
            </DialogTitle>
            <DialogDescription className="font-semibold text-muted-foreground mt-2">
              {location.isActive ? (
                <>
                  Are you sure you want to disable <strong>{location.name}</strong>? 
                  <br/><br/>
                  This will block the location and all its sub-locations from new assignments. The operation will fail if active assets or employees are currently mapped to this site.
                </>
              ) : (
                <>
                  You are about to PERMANENTLY delete <strong>{location.name}</strong> from the registry.
                  <br/><br/>
                  This action cannot be undone. System will block this if any historical data (even old assets) remains linked for audit purposes.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-3 pt-4">
            <Button variant="ghost" onClick={() => setIsConfirmOpen(false)} className="rounded-2xl h-12 px-6 font-black uppercase text-[10px] tracking-widest border-none">
              Abort Action
            </Button>
            <Button 
              onClick={(e) => { e.preventDefault(); handleAction(); }}
              className="rounded-2xl h-12 px-8 bg-destructive text-destructive-foreground hover:bg-destructive/90 font-black uppercase text-[11px] tracking-widest shadow-[0_10px_20px_-10px_rgba(239,68,68,0.5)]"
              disabled={isActionProcessing}
            >
              {isActionProcessing ? <Loader2 className="animate-spin size-4" /> : (location.isActive ? "Confirm & Disable" : "Confirm Purge")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

