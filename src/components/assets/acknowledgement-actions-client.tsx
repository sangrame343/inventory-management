"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";


import { Copy, Check, FileDown, RefreshCw, Loader2, Link2, Archive, Trash2, RotateCcw } from "lucide-react";
import { toast } from "sonner";

interface AcknowledgementActionsClientProps {
  assignmentId: string;
  acknowledgement: {
    status: "PENDING" | "ACKNOWLEDGED" | "EXPIRED" | "ARCHIVED" | "DELETED";
    pdfReceiptPath: string | null;
  } | null;
}

export function AcknowledgementActionsClient({
  assignmentId,
  acknowledgement,
}: AcknowledgementActionsClientProps) {
  const [status, setStatus] = useState<"PENDING" | "ACKNOWLEDGED" | "EXPIRED" | "ARCHIVED" | "DELETED" | null>(
    acknowledgement?.status || null
  );
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rawToken, setRawToken] = useState<string | null>(null);

  const handleCopy = (tokenToCopy?: string) => {
    const token = tokenToCopy || rawToken;
    if (!token) return;
    
    const url = `${window.location.origin}/acknowledge/${token}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success("Acknowledgement link copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRegenerate = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/acknowledge/regenerate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignmentId }),
      });

      if (!res.ok) {
        throw new Error("Failed to regenerate link");
      }

      const data = await res.json();
      setRawToken(data.rawAcknowledgementToken);
      setStatus("PENDING");
      toast.success("New token generated successfully!");
      handleCopy(data.rawAcknowledgementToken);
    } catch (err: any) {
      toast.error(err.message || "Failed to regenerate token.");
    } finally {
      setLoading(false);
    }
  };

  const handleArchive = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/acknowledge/archive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignmentId }),
      });

      if (!res.ok) {
        throw new Error("Failed to archive");
      }

      setStatus("ARCHIVED");
      toast.success("Acknowledgement archived. It will be moved to Deleted in 60 days.");
    } catch (err: any) {
      toast.error(err.message || "Failed to archive.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this acknowledgement? It will be permanently purged in 30 days.")) {
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/admin/acknowledge/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignmentId }),
      });

      if (!res.ok) {
        throw new Error("Failed to delete");
      }

      setStatus("DELETED");
      toast.success("Acknowledgement soft-deleted. It will be permanently purged in 30 days.");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete.");
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/acknowledge/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignmentId }),
      });

      if (!res.ok) {
        throw new Error("Failed to restore");
      }

      const data = await res.json();
      // Reload page to update the active list status dynamically
      toast.success("Acknowledgement restored successfully!");
      window.location.reload();
    } catch (err: any) {
      toast.error(err.message || "Failed to restore.");
      setLoading(false);
    }
  };

  const handleDownload = () => {
    window.location.href = `/api/admin/receipts/${assignmentId}`;
  };

  // Status Color classes
  const statusColors = {
    PENDING: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/50",
    ACKNOWLEDGED: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/50",
    EXPIRED: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/50",
    ARCHIVED: "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
    DELETED: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/50",
  };

  if (!status) return null;

  return (
    <div className="space-y-2">
      {/* ── PENDING ── */}
      {status === "PENDING" && (
        <>
          {rawToken ? (
            <Button
              variant="outline"
              className="w-full h-9 text-sm gap-2 justify-start"
              onClick={() => handleCopy()}
            >
              {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copied!" : "Copy Acknowledgement Link"}
            </Button>
          ) : (
            <Button
              variant="outline"
              className="w-full h-9 text-sm gap-2 justify-start"
              onClick={handleRegenerate}
              disabled={loading}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
              Generate &amp; Copy Link
            </Button>
          )}
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="ghost"
              className="flex-1 h-8 text-xs gap-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              onClick={handleRegenerate}
              disabled={loading}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Reset Link
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="flex-1 h-8 text-xs gap-1.5 text-rose-500 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/30"
              onClick={handleDelete}
              disabled={loading}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete Record
            </Button>
          </div>
        </>
      )}

      {/* ── EXPIRED ── */}
      {status === "EXPIRED" && (
        <>
          <Button
            variant="outline"
            className="w-full h-9 text-sm gap-2 justify-start"
            onClick={handleRegenerate}
            disabled={loading}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Regenerate Acknowledgement Link
          </Button>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="ghost"
              className="flex-1 h-8 text-xs gap-1.5 text-slate-500 hover:text-slate-800"
              onClick={handleArchive}
              disabled={loading}
            >
              <Archive className="h-3.5 w-3.5" />
              Archive
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="flex-1 h-8 text-xs gap-1.5 text-rose-500 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/30"
              onClick={handleDelete}
              disabled={loading}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete Record
            </Button>
          </div>
        </>
      )}

      {/* ── ACKNOWLEDGED ── */}
      {status === "ACKNOWLEDGED" && (
        <>
          <Button
            variant="outline"
            className="w-full h-9 text-sm gap-2 justify-start bg-white hover:bg-slate-50 dark:bg-slate-900"
            onClick={handleDownload}
          >
            <FileDown className="h-4 w-4" />
            Download Signed PDF Receipt
          </Button>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="ghost"
              className="flex-1 h-8 text-xs gap-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              onClick={handleArchive}
              disabled={loading}
            >
              <Archive className="h-3.5 w-3.5" />
              Archive
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="flex-1 h-8 text-xs gap-1.5 text-rose-500 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/30"
              onClick={handleDelete}
              disabled={loading}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete Record
            </Button>
          </div>
        </>
      )}

      {/* ── ARCHIVED ── */}
      {status === "ARCHIVED" && (
        <>
          <Button
            variant="outline"
            className="w-full h-9 text-sm gap-2 justify-start"
            onClick={handleRestore}
            disabled={loading}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
            Restore to Active
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="w-full h-8 text-xs gap-1.5 text-rose-500 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/30"
            onClick={handleDelete}
            disabled={loading}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete Record
          </Button>
        </>
      )}

      {/* ── DELETED ── */}
      {status === "DELETED" && (
        <Button
          variant="outline"
          className="w-full h-9 text-sm gap-2 justify-start"
          onClick={handleRestore}
          disabled={loading}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
          Restore to Active
        </Button>
      )}
    </div>
  );
}




