"use client";

import { useCallback, useEffect, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Trash2, Pencil, CheckCircle2, XCircle, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { MasterDataModal } from "./master-data-modal";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface MasterItem {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  [key: string]: any; // Allow for domain-specific fields like symbol or code
}

interface Props {
  domain: string;
  label: string;
  icon: React.ReactNode;
}

export function MasterDataList({ domain, label, icon }: Props) {
  const [items, setItems] = useState<MasterItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<MasterItem | undefined>(undefined);
  
  // Deactivate State
  const [itemToDeactivate, setItemToDeactivate] = useState<MasterItem | null>(null);
  const [isDeactivating, setIsDeactivating] = useState(false);

  const fetchItems = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/settings/${domain}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setItems(data);
    } catch {
      toast.error("Fetch Error", { description: `Failed to load ${label} registry. Please check your connection.` });
    } finally {
      setIsLoading(false);
    }
  }, [domain, label]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleDeactivate = async () => {
    if (!itemToDeactivate) return;
    
    setIsDeactivating(true);
    const actionType = itemToDeactivate.isActive ? "deactivate" : "delete";
    
    try {
      const res = await fetch(`/api/settings/${domain}/${itemToDeactivate.id}`, {
        method: "DELETE",
      });
      
      const result = await res.json();
      
      if (!res.ok) {
        throw new Error(result.error || `Failed to ${actionType} item`);
      }

      toast.success(actionType === "deactivate" ? "Deactivation Successful" : "Purge Complete", { 
        description: actionType === "deactivate" 
          ? `The ${label.toLowerCase()} "${itemToDeactivate.name}" has been disabled.`
          : `The ${label.toLowerCase()} "${itemToDeactivate.name}" has been permanently removed.`
      });
      fetchItems();
    } catch (error: any) {
       toast.error("Process Blocked", { 
         description: error.message,
         icon: <AlertCircle className="text-destructive" />
       });
    } finally {
      setIsDeactivating(false);
      setItemToDeactivate(null);
    }
  };

  const filtered = items.filter(i => 
    i.name.toLowerCase().includes(search.toLowerCase()) || 
    (i.description?.toLowerCase().includes(search.toLowerCase()) ?? false) ||
    (i.symbol?.toLowerCase().includes(search.toLowerCase()) ?? false) ||
    (i.code?.toLowerCase().includes(search.toLowerCase()) ?? false)
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-primary/10 rounded-2xl text-primary shadow-inner border border-primary/20">
            {icon}
          </div>
          <div>
            <h3 className="text-2xl font-black tracking-tight uppercase italic">{label} Registry</h3>
            <p className="text-xs text-muted-foreground font-semibold tracking-wide">Manage and configure organization-wide {label.toLowerCase()} entries.</p>
          </div>
        </div>
        <Button 
          onClick={() => { setSelectedItem(undefined); setIsModalOpen(true); }}
          className="rounded-xl h-12 px-8 font-black shadow-lg shadow-primary/20 uppercase text-[11px] tracking-[0.2em]"
        >
          <Plus size={16} className="mr-2" /> Add {label}
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground opacity-50" size={18} />
        <Input 
          placeholder={`Search ${label.toLowerCase()} registry...`} 
          className="h-12 pl-12 bg-muted/20 border-none rounded-2xl shadow-inner font-bold focus-visible:ring-primary"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="border border-border/50 rounded-[2.5rem] overflow-hidden bg-card shadow-xl shadow-primary/5">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow className="hover:bg-transparent border-border/50">
              <TableHead className="font-black text-[10px] uppercase tracking-[0.2em] py-5 px-8">Identifier / Name</TableHead>
              <TableHead className="font-black text-[10px] uppercase tracking-[0.2em] py-5">Details / Metadata</TableHead>
              <TableHead className="font-black text-[10px] uppercase tracking-[0.2em] py-5">Status</TableHead>
              <TableHead className="font-black text-[10px] uppercase tracking-[0.2em] py-5 text-right px-8">Control</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-20">
                  <div className="flex flex-col items-center gap-4">
                     <Loader2 className="animate-spin text-primary size-8 opacity-20" />
                     <p className="text-xs font-black uppercase tracking-widest opacity-30">Synchronizing registry...</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-24">
                  <div className="flex flex-col items-center gap-4">
                     <div className="p-4 bg-muted/20 rounded-full">
                        <Search size={32} className="opacity-20" />
                     </div>
                     <p className="text-sm font-bold text-muted-foreground">No entries found matching your search criteria.</p>
                     <Button variant="outline" size="sm" onClick={() => setSearch("")} className="rounded-xl font-bold">Clear Filters</Button>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((item) => (
                <TableRow key={item.id} className="hover:bg-primary/5 border-border/10 transition-colors group">
                  <TableCell className="py-6 px-8">
                     <div className="flex flex-col">
                        <span className={`font-black text-base tracking-tight group-hover:text-primary transition-colors ${!item.isActive ? "opacity-40" : ""}`}>
                          {item.name}
                        </span>
                        {(item.symbol || item.code) && (
                          <span className="text-[10px] font-mono font-black text-primary/60 uppercase tracking-tighter">
                            Ref: {item.symbol || item.code}
                          </span>
                        )}
                     </div>
                  </TableCell>
                  <TableCell className="py-6">
                    <p className={`text-xs text-muted-foreground font-semibold max-w-xs line-clamp-2 ${!item.isActive ? "opacity-40" : ""}`}>
                       {item.description || "No description provided."}
                    </p>
                  </TableCell>
                  <TableCell className="py-6">
                    <Badge 
                      variant={item.isActive ? "default" : "outline"} 
                      className={item.isActive ? "bg-green-500/10 text-green-600 border-green-500/20 shadow-none px-3 py-1 rounded-lg" : "opacity-40 px-3 py-1 rounded-lg"}
                    >
                      {item.isActive ? <CheckCircle2 size={10} className="mr-1.5" /> : <XCircle size={10} className="mr-1.5" />}
                      <span className="text-[10px] font-black uppercase tracking-widest">{item.isActive ? "Active" : "Disabled"}</span>
                    </Badge>
                  </TableCell>
                  <TableCell className="py-6 text-right px-8">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="size-10 rounded-xl hover:bg-primary/10 hover:text-primary transition-colors"
                        onClick={() => { setSelectedItem(item); setIsModalOpen(true); }}
                      >
                        <Pencil size={16} />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className={`size-10 rounded-xl transition-colors ${item.isActive ? "hover:bg-destructive/10 hover:text-destructive" : "hover:bg-red-600 hover:text-white"}`}
                        onClick={() => setItemToDeactivate(item)}
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <MasterDataModal 
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setSelectedItem(undefined); }}
        domain={domain}
        label={label}
        item={selectedItem}
        onSuccess={fetchItems}
      />

      <Dialog open={!!itemToDeactivate} onOpenChange={(open: boolean) => !open && setItemToDeactivate(null)}>
        <DialogContent className="rounded-[2rem] border-none shadow-2xl">
          <DialogHeader className="items-center text-center">
            <div className={`p-4 rounded-full mb-4 ${itemToDeactivate?.isActive ? "bg-amber-100 text-amber-600" : "bg-red-100 text-red-600"}`}>
               {itemToDeactivate?.isActive ? <AlertCircle size={32} /> : <Trash2 size={32} />}
            </div>
            <DialogTitle className="text-2xl font-black uppercase tracking-tight">
              {itemToDeactivate?.isActive ? "Deactivate Item?" : "Permanent Removal?"}
            </DialogTitle>
            <DialogDescription className="font-semibold text-muted-foreground text-base px-4">
              {itemToDeactivate?.isActive ? (
                <>
                  Are you sure you want to disable <strong>{itemToDeactivate?.name}</strong>? 
                  This will block its use in new records but preserve historical data.
                </>
              ) : (
                <>
                  You are about to permanently delete <strong>{itemToDeactivate?.name}</strong>. 
                  <span className="block mt-2 text-destructive font-bold uppercase text-xs italic">
                    This action is irreversible and will fail if any historical audit data is attached.
                  </span>
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:justify-center mt-4">
            <Button variant="ghost" onClick={() => setItemToDeactivate(null)} className="rounded-xl h-12 px-8 font-bold uppercase text-[10px] tracking-widest">
              Keep Item
            </Button>
            <Button 
              onClick={(e: React.MouseEvent) => { e.preventDefault(); handleDeactivate(); }}
              className={`rounded-xl h-12 px-10 font-black uppercase text-[11px] tracking-widest shadow-lg ${
                itemToDeactivate?.isActive 
                  ? "bg-amber-600 hover:bg-amber-700 shadow-amber-600/20" 
                  : "bg-red-600 hover:bg-red-700 shadow-red-600/20"
              }`}
              disabled={isDeactivating}
            >
              {isDeactivating ? <Loader2 className="animate-spin size-4" /> : itemToDeactivate?.isActive ? "Disable Registry" : "Delete Permanently"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


