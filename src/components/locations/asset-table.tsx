"use client";

import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Package, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

export function AssetTable({ assets, subtreeAssets }: { assets: any[]; subtreeAssets: any[] }) {
  const [showSubtree, setShowSubtree] = useState(false);
  const data = showSubtree ? subtreeAssets : assets;

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-2 py-2 bg-muted/20 rounded-lg">
         <div className="flex items-center gap-2 text-sm font-medium">
            <Package size={16} className="text-primary" />
            <span>{showSubtree ? "Hierarchy Assets" : "Current Location Assets"}</span>
            <Badge variant="outline" className="ml-2 font-mono">{data.length}</Badge>
         </div>
         <div className="flex items-center space-x-3 bg-background px-3 py-1.5 rounded-full border shadow-sm">
            <Label htmlFor="subtree-toggle" className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Deep Scan Sub-locations</Label>
            <Switch id="subtree-toggle" checked={showSubtree} onCheckedChange={setShowSubtree} />
         </div>
      </div>

      <div className="border border-border/50 rounded-xl overflow-hidden bg-background">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow>
              <TableHead className="w-[120px]">Asset Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Status</TableHead>
              {showSubtree && <TableHead>Site/Floor</TableHead>}
              <TableHead>Assigned To</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={showSubtree ? 6 : 5} className="text-center py-20 text-muted-foreground">
                   <div className="flex flex-col items-center gap-2">
                      <div className="p-3 bg-muted rounded-full opacity-20">
                         <Package size={24} />
                      </div>
                      <p className="text-sm">No assets found in this {showSubtree ? "hierarchy" : "location"}.</p>
                   </div>
                </TableCell>
              </TableRow>
            ) : (
              data.map((asset) => (
                <TableRow key={asset.id} className="hover:bg-muted/20 transition-colors group">
                  <TableCell className="font-mono text-[10px] uppercase tracking-tighter text-muted-foreground flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-primary/40" />
                    {asset.assetCode || asset.assetTag || "—"}
                  </TableCell>
                  <TableCell className="font-semibold text-sm">{asset.name}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{asset.category?.name || "Uncategorized"}</TableCell>
                  <TableCell>
                    <Badge 
                      variant="secondary" 
                      className={cn(
                        "text-[10px] h-5 px-2 bg-opacity-10 border",
                        asset.status === "ACTIVE" ? "text-green-500 bg-green-500 border-green-500/20" :
                        asset.status === "ASSIGNED" ? "text-blue-500 bg-blue-500 border-blue-500/20" :
                        "text-orange-500 bg-orange-500 border-orange-500/20"
                      )}
                    >
                      {asset.status}
                    </Badge>
                  </TableCell>
                  {showSubtree && (
                    <TableCell className="text-[10px] font-medium flex items-center gap-1 text-muted-foreground">
                      <MapPin size={10} />
                      {asset.location?.name}
                    </TableCell>
                  )}
                  <TableCell className="text-xs font-medium">
                    {asset.assignments[0]?.employee?.fullName ||
                    asset.assignments[0]?.user?.name ||
                    asset.assignments[0]?.department?.name || (
                      <span className="text-muted-foreground italic font-normal">Available</span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
