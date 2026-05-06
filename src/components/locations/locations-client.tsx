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
    <div className="flex flex-col gap-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-primary/10 rounded-2xl shadow-inner border border-primary/20">
             <MapPinned className="size-8 text-primary stroke-[2.5]" />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight uppercase italic">Physical Hierarchy</h1>
            <p className="text-xs text-muted-foreground font-semibold tracking-wide uppercase">Define and manage your company's geographic structure.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            onClick={() => setIsModalOpen(true)}
            className="rounded-2xl h-14 px-10 font-black shadow-2xl shadow-primary/20 uppercase text-[12px] tracking-[0.25em] transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus size={18} className="mr-2.5 stroke-3" /> New Root Location
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-4 bg-muted/20 p-6 rounded-[2.5rem] border border-border/50 shadow-inner">
        <div className="relative group max-w-md flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary opacity-50" size={18} />
          <Input 
            placeholder="Search sites by name or internal code..." 
            className="pl-12 h-12 text-sm font-bold bg-background border-none rounded-2xl shadow-sm focus-visible:ring-primary/50" 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="hidden md:flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-50">
           <div className="size-2 rounded-full bg-primary animate-pulse" />
           Live Filter Active
        </div>
      </div>

      <div className="border border-border/50 rounded-[3rem] bg-card shadow-2xl shadow-primary/5 p-6 md:p-12">
        <div className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/50 pb-8">
           <div>
              <h3 className="text-xl font-black uppercase tracking-tight italic">Structural Roadmap</h3>
              <p className="text-xs text-muted-foreground font-semibold mt-1">Navigate through sites, floors, and specific rooms.</p>
           </div>
           <div className="px-4 py-2 bg-muted/30 rounded-xl text-[10px] font-black uppercase tracking-widest text-muted-foreground border border-border/50">
              Tip: Site nodes are expandable
           </div>
        </div>
        
        <div className="min-h-[400px]">
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
