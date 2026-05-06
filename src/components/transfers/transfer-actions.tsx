"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { TransferStatus } from "@prisma/client";
import { 
  Check, 
  X, 
  Truck, 
  CheckCircle2, 
  Loader2, 
  Ban,
  MoreHorizontal
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export function TransferActions({ transfer }: { transfer: any }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [completeNotes, setCompleteNotes] = useState("");
  const [actionType, setActionType] = useState<string | null>(null);

  const handleAction = async (action: string, body: any = {}) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/transfers/${transfer.id}/${action}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error("Failed to update transfer");

      toast.success(`Transfer ${action} successfully`);
      router.refresh();
      setOpen(false);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const isPending = transfer.status === TransferStatus.REQUESTED;
  const isApproved = transfer.status === TransferStatus.APPROVED;
  const isInTransit = transfer.status === TransferStatus.IN_TRANSIT;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          }
        />
        <DropdownMenuContent align="end">
          {isPending && (
            <>
              <DropdownMenuItem onClick={() => handleAction("approve")}>
                <Check className="mr-2 h-4 w-4 text-green-600" /> Approve
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setActionType("reject"); setOpen(true); }}>
                <X className="mr-2 h-4 w-4 text-red-600" /> Reject
              </DropdownMenuItem>
            </>
          )}

          {isApproved && (
            <DropdownMenuItem onClick={() => handleAction("in-transit")}>
              <Truck className="mr-2 h-4 w-4 text-amber-600" /> Mark In-Transit
            </DropdownMenuItem>
          )}

          {isInTransit && (
            <DropdownMenuItem onClick={() => { setActionType("complete"); setOpen(true); }}>
              <CheckCircle2 className="mr-2 h-4 w-4 text-slate-800" /> Complete
            </DropdownMenuItem>
          )}

          {(isPending || isApproved) && (
            <DropdownMenuItem onClick={() => handleAction("cancel")}>
              <Ban className="mr-2 h-4 w-4 text-muted-foreground" /> Cancel
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === "reject" ? "Reject Transfer" : "Complete Transfer"}
            </DialogTitle>
            <DialogDescription>
              {actionType === "reject" 
                ? "Please provide a reason for rejecting this transfer request." 
                : "Finalize the asset movement. You can add notes about the asset condition."}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {actionType === "reject" ? (
              <div className="space-y-2">
                <Label htmlFor="reason">Reason for Rejection</Label>
                <Input 
                  id="reason" 
                  placeholder="Incomplete documentation, wrong asset, etc." 
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="notes">Completion Notes / Condition</Label>
                <Input 
                  id="notes" 
                  placeholder="Asset received in good condition." 
                  value={completeNotes}
                  onChange={(e) => setCompleteNotes(e.target.value)}
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button 
              variant={actionType === "reject" ? "destructive" : "default"}
              onClick={() => actionType === "reject" 
                ? handleAction("reject", { reason: rejectReason }) 
                : handleAction("complete", { conditionAfter: completeNotes })}
              disabled={loading || (actionType === "reject" && !rejectReason)}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {actionType === "reject" ? "Reject Request" : "Complete Movement"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
