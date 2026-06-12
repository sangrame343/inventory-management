"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
    <div className="mt-3 flex flex-wrap items-center gap-2.5 rounded-lg border border-border/40 bg-slate-50/50 p-2.5 dark:bg-slate-900/40">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground mr-2">
        <span>Acknowledgement:</span>
        <Badge variant="outline" className={`text-[10px] font-bold px-2 py-0.5 uppercase tracking-wide ${statusColors[status]}`}>
          {status}
        </Badge>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {status === "PENDING" && (
          <>
            {rawToken ? (
              <Button size="sm" variant="outline" onClick={() => handleCopy()} className="h-7 text-xs px-2.5 flex items-center gap-1">
                {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                Copy Link
              </Button>
            ) : (
              <Button size="sm" variant="outline" onClick={handleRegenerate} disabled={loading} className="h-7 text-xs px-2.5 flex items-center gap-1">
                {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Link2 className="h-3 w-3" />}
                Generate & Copy Link
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={handleRegenerate} disabled={loading} className="h-7 text-xs px-2.5 flex items-center gap-1 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200">
              <RefreshCw className="h-3 w-3" />
              Reset Link
            </Button>
            <Button size="sm" variant="ghost" onClick={handleDelete} disabled={loading} className="h-7 text-xs px-2.5 flex items-center gap-1 text-rose-500 hover:text-rose-700 dark:hover:text-rose-400">
              <Trash2 className="h-3 w-3" />
              Delete
            </Button>
          </>
        )}

        {status === "EXPIRED" && (
          <>
            <Button size="sm" variant="outline" onClick={handleRegenerate} disabled={loading} className="h-7 text-xs px-2.5 flex items-center gap-1">
              {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
              Regenerate Link
            </Button>
            <Button size="sm" variant="ghost" onClick={handleArchive} disabled={loading} className="h-7 text-xs px-2.5 flex items-center gap-1 text-slate-500 hover:text-slate-800">
              <Archive className="h-3 w-3" />
              Archive
            </Button>
            <Button size="sm" variant="ghost" onClick={handleDelete} disabled={loading} className="h-7 text-xs px-2.5 flex items-center gap-1 text-rose-500 hover:text-rose-700">
              <Trash2 className="h-3 w-3" />
              Delete
            </Button>
          </>
        )}

        {status === "ACKNOWLEDGED" && (
          <>
            <Button size="sm" variant="outline" onClick={handleDownload} className="h-7 text-xs px-2.5 flex items-center gap-1 bg-white hover:bg-slate-100 dark:bg-slate-900">
              <FileDown className="h-3.5 w-3.5" />
              Download Signed PDF
            </Button>
            <Button size="sm" variant="ghost" onClick={handleArchive} disabled={loading} className="h-7 text-xs px-2.5 flex items-center gap-1 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200">
              <Archive className="h-3 w-3" />
              Archive
            </Button>
            <Button size="sm" variant="ghost" onClick={handleDelete} disabled={loading} className="h-7 text-xs px-2.5 flex items-center gap-1 text-rose-500 hover:text-rose-700 dark:hover:text-rose-400">
              <Trash2 className="h-3 w-3" />
              Delete
            </Button>
          </>
        )}

        {status === "ARCHIVED" && (
          <>
            <Button size="sm" variant="outline" onClick={handleRestore} disabled={loading} className="h-7 text-xs px-2.5 flex items-center gap-1">
              {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCcw className="h-3 w-3" />}
              Restore Active
            </Button>
            <Button size="sm" variant="ghost" onClick={handleDelete} disabled={loading} className="h-7 text-xs px-2.5 flex items-center gap-1 text-rose-500 hover:text-rose-700">
              <Trash2 className="h-3 w-3" />
              Delete
            </Button>
          </>
        )}

        {status === "DELETED" && (
          <Button size="sm" variant="outline" onClick={handleRestore} disabled={loading} className="h-7 text-xs px-2.5 flex items-center gap-1">
            {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCcw className="h-3 w-3" />}
            Restore Active
          </Button>
        )}
      </div>
    </div>
  );
}

