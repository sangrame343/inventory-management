"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, MapPin, Users, Calendar, Loader2, ExternalLink } from "lucide-react";
import Link from "next/link";

export function TransferHistory({ assetId }: { assetId: string }) {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/assets/${assetId}/transfers`)
      .then(res => res.json())
      .then(data => {
        setHistory(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [assetId]);

  if (loading) return (
    <div className="flex items-center justify-center p-8">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );

  if (history.length === 0) return (
    <div className="p-8 text-center text-muted-foreground border border-dashed rounded-lg bg-slate-50/50">
      No transfer history for this asset.
    </div>
  );

  return (
    <div className="space-y-6">
      {history.map((item) => (
        <div key={item.id} className="relative pl-8 border-l-2 border-slate-100 pb-6 last:pb-0">
          <div className="absolute left-[-9px] top-0 h-4 w-4 rounded-full border-2 border-white bg-primary shadow-sm" />
          
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Link 
                  href={`/transfers/${item.id}`}
                  className="font-mono text-[10px] text-blue-600 hover:underline font-bold"
                >
                  {item.transferCode || "REF-TBD"}
                </Link>
                <TransferTypeLabel type={item.transferType} />
                <span className="text-xs text-muted-foreground font-medium">
                  {format(new Date(item.requestedAt), "MMM d")}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <TransferStatusBadge status={item.status} />
                <Link href={`/transfers/${item.id}`} className="text-muted-foreground hover:text-primary">
                  <ExternalLink className="size-3" />
                </Link>
              </div>
            </div>

            <div className="bg-card rounded-md border p-3 shadow-sm border-slate-200/60">
               <MovementInfo item={item} />
               
               {item.reason && (
                <div className="mt-2 text-xs text-muted-foreground italic border-t pt-2">
                  "{item.reason}"
                </div>
              )}
            </div>

            <div className="flex items-center gap-4 text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
              <span className="flex items-center gap-1"><Calendar className="size-3" /> Requested by: {item.requestedBy?.name}</span>
              {item.completedBy && <span>Completed by: {item.completedBy?.name}</span>}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function TransferTypeLabel({ type }: { type: string }) {
  return (
     <span className="text-[10px] font-bold uppercase tracking-tight bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200 text-slate-600">
       {type.replace(/_/g, " ")}
     </span>
  );
}

function TransferStatusBadge({ status }: { status: string }) {
  const variants: Record<string, string> = {
    REQUESTED: "bg-blue-50 text-blue-600 border-blue-100",
    APPROVED: "bg-green-50 text-green-600 border-green-100",
    IN_TRANSIT: "bg-amber-50 text-amber-600 border-amber-100",
    COMPLETED: "bg-slate-50 text-slate-600 border-slate-200",
    REJECTED: "bg-red-50 text-red-600 border-red-100",
    CANCELLED: "bg-slate-50 text-slate-400 border-slate-200",
  };

  return (
    <Badge variant="outline" className={`${variants[status]} text-[10px] font-bold`}>
      {status}
    </Badge>
  );
}

function MovementInfo({ item }: { item: any }) {
  const isLocTo = item.transferType.endsWith("LOCATION");
  const isEmpTo = item.transferType.endsWith("EMPLOYEE");
  const isLocFrom = item.transferType.startsWith("LOCATION");

  return (
    <div className="flex items-center gap-3">
      <div className="flex flex-col">
        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">Source</span>
        {isLocFrom ? 
          <span className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
            <MapPin className="size-3.5 text-slate-400" /> {item.fromLocation?.name || "Multiple / Auto"}
          </span> :
          <span className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
            <Users className="size-3.5 text-slate-400" /> {item.fromEmployee?.fullName || "Unassigned"}
          </span>
        }
      </div>
      
      <ArrowRight className="size-4 text-slate-300 mx-1" />
      
      <div className="flex flex-col">
        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">Destination</span>
        {isLocTo ? 
          <span className="flex items-center gap-1.5 text-sm font-bold text-primary">
            <MapPin className="size-3.5 text-primary/60" /> {item.toLocation?.name}
          </span> :
          <span className="flex items-center gap-1.5 text-sm font-bold text-primary">
            <Users className="size-3.5 text-primary/60" /> {item.toEmployee?.fullName}
          </span>
        }
      </div>
    </div>
  );
}
