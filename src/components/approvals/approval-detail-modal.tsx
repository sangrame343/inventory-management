"use client";

import { useState, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { reviewApprovalAction } from "@/app/actions/approval-actions";
import { toast } from "sonner"; // Assuming sonner is used, if not we'll use alert
import { Check, X, AlertCircle } from "lucide-react";

interface ApprovalDetailModalProps {
  request: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUserId: string;
  isSuperAdmin: boolean;
}

export function ApprovalDetailModal({
  request,
  open,
  onOpenChange,
  currentUserId,
  isSuperAdmin,
}: ApprovalDetailModalProps) {
  const [reviewNote, setReviewNote] = useState("");
  const [isPending, startTransition] = useTransition();

  if (!request) return null;

  const handleReview = (status: "APPROVED" | "REJECTED") => {
    startTransition(async () => {
      const res = await reviewApprovalAction(
        request.id,
        currentUserId,
        status,
        reviewNote
      );

      if (res.success) {
        toast.success(`Request ${status.toLowerCase()} successfully`);
        onOpenChange(false);
        setReviewNote("");
      } else {
        toast.error(res.error || "Failed to process request");
      }
    });
  };

  const renderDataComparison = () => {
    const oldData = request.oldData;
    const newData = request.payload;

    if (!oldData && newData) {
      // Creation request
      return (
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">New Record Data</h4>
          <div className="grid grid-cols-2 gap-4 text-sm bg-muted/30 p-4 rounded-lg border">
            {Object.entries(newData).map(([key, value]: [string, any]) => (
                value !== null && typeof value !== 'object' && (
                    <div key={key} className="flex flex-col space-y-1">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                        <span className="truncate">{String(value)}</span>
                    </div>
                )
            ))}
          </div>
        </div>
      );
    }

    if (oldData && newData) {
      // Update request - show differences
      const diffKeys = Object.keys(newData).filter(
        (key) => JSON.stringify(oldData[key]) !== JSON.stringify(newData[key])
      );

      return (
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Changes Requested</h4>
          <div className="space-y-2">
            {diffKeys.length > 0 ? (
                diffKeys.map((key) => (
                    <div key={key} className="grid grid-cols-2 gap-4 p-3 rounded-lg border bg-muted/20">
                        <div className="space-y-1">
                            <span className="text-[10px] font-bold text-muted-foreground uppercase">{key.replace(/([A-Z])/g, ' $1').trim()} (Current)</span>
                            <div className="text-sm text-red-500 line-through truncate">{String(oldData[key] ?? 'N/A')}</div>
                        </div>
                        <div className="space-y-1">
                            <span className="text-[10px] font-bold text-muted-foreground uppercase">{key.replace(/([A-Z])/g, ' $1').trim()} (Requested)</span>
                            <div className="text-sm text-green-500 font-semibold truncate">{String(newData[key] ?? 'N/A')}</div>
                        </div>
                    </div>
                ))
            ) : (
                <div className="text-sm text-muted-foreground italic p-4 text-center border rounded-lg">
                    No field changes detected (possibly duplicate check).
                </div>
            )}
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl">{request.title}</DialogTitle>
            <Badge variant="outline">{request.status}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">{request.summary}</p>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-6 py-4">
             <div className="flex items-center gap-6 text-sm">
                <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">Module</span>
                    <span>{request.module}</span>
                </div>
                <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">Action</span>
                    <Badge variant="secondary" className="w-fit">{request.action}</Badge>
                </div>
                <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">Requested By</span>
                    <span>{request.requestedBy.name}</span>
                </div>
             </div>

             {renderDataComparison()}

             {request.status !== "PENDING" && (
                <div className="bg-muted p-4 rounded-lg border space-y-2">
                    <h4 className="text-xs font-bold text-muted-foreground uppercase">Review Result</h4>
                    <div className="flex items-center gap-2 text-sm">
                        <span className="font-semibold">Status:</span>
                        <Badge variant={request.status === "APPROVED" ? "outline" : "destructive"}>{request.status}</Badge>
                    </div>
                    {request.reviewedBy && (
                         <div className="text-sm">
                            <span className="font-semibold">Reviewed By:</span> {request.reviewedBy.name}
                        </div>
                    )}
                    {request.reviewNote && (
                         <div className="text-sm italic text-muted-foreground">
                            "{request.reviewNote}"
                        </div>
                    )}
                </div>
             )}

             {isSuperAdmin && request.status === "PENDING" && (
                <div className="space-y-2">
                    <h4 className="text-xs font-bold text-muted-foreground uppercase">Review Note</h4>
                    <Textarea 
                        placeholder="Add a note for the requester..." 
                        value={reviewNote}
                        onChange={(e) => setReviewNote(e.target.value)}
                        className="resize-none"
                    />
                </div>
             )}
          </div>
        </ScrollArea>

        <DialogFooter className="border-t pt-4">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Close</Button>
          {isSuperAdmin && request.status === "PENDING" && (
            <div className="flex gap-2">
              <Button 
                variant="destructive" 
                onClick={() => handleReview("REJECTED")}
                disabled={isPending}
              >
                <X className="mr-2 h-4 w-4" />
                Reject
              </Button>
              <Button 
                className="bg-green-600 hover:bg-green-700 text-white"
                onClick={() => handleReview("APPROVED")}
                disabled={isPending}
              >
                <Check className="mr-2 h-4 w-4" />
                Approve
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
