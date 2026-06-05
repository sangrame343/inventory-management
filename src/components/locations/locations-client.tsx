"use client";

import { LocationTree } from "@/components/locations/location-tree";
import { Button } from "@/components/ui/button";
import { Plus, Search, MapPinned } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { LocationModal } from "./location-modal";
import { useRouter } from "next/navigation";

interface Props {
  initialLocations: any[];
}

export function LocationsClient({ initialLocations }: Props) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [search, setSearch] = useState("");
  const router = useRouter();

  // Simple filtering for the tree (names)
  const filterTree = (nodes: any[]): any[] => {
    return nodes
      .map((node) => ({
        ...node,
        children: filterTree(node.children || []),
      }))
      .filter((node) => 
        node.name.toLowerCase().includes(search.toLowerCase()) || 
        (node.code?.toLowerCase().includes(search.toLowerCase()) ?? false) ||
        node.children.length > 0
      );
  };

  const filteredLocations = search ? filterTree(initialLocations) : initialLocations;

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center justify-between pb-2">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="h-6 w-1 rounded-full bg-gradient-to-b from-primary to-primary/30" />
            <h2 className="text-xl md:text-2xl font-bold tracking-tight text-foreground/90">
              Locations Registry
            </h2>
          </div>
          <p className="text-xs md:text-sm text-muted-foreground pl-[18px]">
            Manage physical sites, buildings, warehouses, and storage rooms.
          </p>
        </div>
        <div className="flex items-center gap-2 pl-[18px] md:pl-0">
          <Button 
            onClick={() => setIsModalOpen(true)}
            className="rounded-lg h-9 px-4 text-xs font-semibold shadow-2xs transition-all duration-200"
          >
            <Plus size={15} className="mr-1.5" /> Add Location
          </Button>
        </div>
      </div>

      <div className="h-px bg-gradient-to-r from-border via-border/50 to-transparent" />

      {/* Search Toolbar */}
      <div className="flex items-center gap-4 bg-muted/20 px-4 py-3 rounded-xl border border-border/40 shadow-3xs">
        <div className="relative group max-w-sm flex-1">
          <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 -m-0.5 pointer-events-none" />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 transition-colors group-focus-within:text-primary opacity-80" size={15} />
          <Input 
            placeholder="Search locations by name or code..." 
            className="pl-9 h-9.5 text-xs bg-background border-border/60 rounded-lg shadow-2xs focus-visible:ring-primary/10 focus-visible:border-primary/40 transition-all duration-200" 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="hidden md:flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
           <div className="size-1.5 rounded-full bg-primary animate-pulse" />
           Live Filter Active
        </div>
      </div>

      {/* Main Tree Card */}
      <div className="border border-border/40 rounded-xl bg-card shadow-sm p-4 md:p-6">
        <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/30 pb-4">
           <div>
              <h3 className="text-sm font-bold text-foreground/80 tracking-wide uppercase">Hierarchy Tree</h3>
              <p className="text-xs text-muted-foreground/60 mt-0.5">Expand nodes to navigate through levels, sections, or storage details.</p>
           </div>
           <div className="px-3 py-1 bg-muted/40 rounded-lg text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 border border-border/30">
              Note: Site nodes are expandable
           </div>
        </div>
        
        <div className="min-h-[300px]">
          <LocationTree locations={filteredLocations} />
        </div>
      </div>

      <LocationModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => router.refresh()}
      />
    </div>
  );
}
