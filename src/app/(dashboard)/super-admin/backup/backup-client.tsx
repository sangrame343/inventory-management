"use client";

import { useState } from "react";
import {
  Database,
  Download,
  Server,
  Cloud,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  HardDrive,
  Shield,
  RefreshCw,
} from "lucide-react";

interface BackupEntry {
  target: "local" | "prod";
  filename: string;
  timestamp: string;
  status: "success" | "failed";
  size?: string;
}

interface BackupCardProps {
  target: "local" | "prod";
  label: string;
  description: string;
  connectionHint: string;
  icon: React.ReactNode;
  accent: string;
  onDownload: (target: "local" | "prod") => Promise<void>;
  isLoading: boolean;
}

function BackupCard({
  target,
  label,
  description,
  connectionHint,
  icon,
  accent,
  onDownload,
  isLoading,
}: BackupCardProps) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-border/40 bg-card shadow-sm transition-all duration-300 hover:shadow-md hover:border-border/70 group`}
    >
      {/* Gradient accent strip */}
      <div className={`absolute inset-x-0 top-0 h-1 ${accent}`} />

      <div className="p-6 pt-7 space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className={`flex items-center justify-center size-12 rounded-xl bg-muted/60 border border-border/40 group-hover:scale-105 transition-transform duration-200`}
            >
              {icon}
            </div>
            <div>
              <h3 className="font-bold text-foreground text-lg leading-tight">
                {label}
              </h3>
              <p className="text-muted-foreground text-xs mt-0.5">
                {description}
              </p>
            </div>
          </div>

          {/* Status badge */}
          <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
            Online
          </span>
        </div>

        {/* Connection info */}
        <div className="rounded-lg bg-muted/40 border border-border/30 px-4 py-3">
          <div className="flex items-center gap-2 text-xs">
            <Shield className="size-3.5 text-muted-foreground shrink-0" />
            <span className="font-mono text-muted-foreground truncate">
              {connectionHint}
            </span>
          </div>
        </div>

        {/* What's included */}
        <ul className="space-y-1.5 text-xs text-muted-foreground">
          {[
            "All public schema tables",
            "Full row data as INSERT statements",
            "Conflict-safe (ON CONFLICT DO NOTHING)",
            "Timestamped filename",
          ].map((item) => (
            <li key={item} className="flex items-center gap-2">
              <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0" />
              <span>{item}</span>
            </li>
          ))}
        </ul>

        {/* Download button */}
        <button
          onClick={() => onDownload(target)}
          disabled={isLoading}
          className={`
            w-full flex items-center justify-center gap-2.5 px-5 py-3 rounded-xl
            font-semibold text-sm transition-all duration-200
            ${
              isLoading
                ? "bg-muted text-muted-foreground cursor-not-allowed"
                : "bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0"
            }
          `}
        >
          {isLoading ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              <span>Generating backup…</span>
            </>
          ) : (
            <>
              <Download className="size-4" />
              <span>Download SQL Backup</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export function BackupClient() {
  const [loadingTarget, setLoadingTarget] = useState<"local" | "prod" | null>(
    null
  );
  const [history, setHistory] = useState<BackupEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleDownload = async (target: "local" | "prod") => {
    setLoadingTarget(target);
    setError(null);
    const startTime = Date.now();

    try {
      const res = await fetch(`/api/backup?target=${target}`);

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Request failed (${res.status})`);
      }

      // Get filename from Content-Disposition header
      const disposition = res.headers.get("Content-Disposition") ?? "";
      const match = disposition.match(/filename="?([^"]+)"?/);
      const filename = match?.[1] ?? `backup_${target}_${Date.now()}.sql`;

      // Blob → object URL → click-trigger download
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Format file size
      const kb = (blob.size / 1024).toFixed(1);
      const size = blob.size > 1024 * 1024
        ? `${(blob.size / 1024 / 1024).toFixed(2)} MB`
        : `${kb} KB`;

      // Log to history
      setHistory((prev) => [
        {
          target,
          filename,
          timestamp: new Date().toLocaleString(),
          status: "success",
          size,
        },
        ...prev.slice(0, 9),
      ]);
    } catch (err: any) {
      const msg = err.message || "Backup failed";
      setError(msg);
      setHistory((prev) => [
        {
          target,
          filename: `backup_${target}_failed`,
          timestamp: new Date().toLocaleString(),
          status: "failed",
        },
        ...prev.slice(0, 9),
      ]);
    } finally {
      setLoadingTarget(null);
    }
  };

  return (
    <div className="space-y-8">
      {/* Error banner */}
      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/8 px-5 py-4 text-sm text-destructive">
          <AlertCircle className="size-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Backup failed</p>
            <p className="mt-0.5 text-destructive/80">{error}</p>
          </div>
          <button
            onClick={() => setError(null)}
            className="ml-auto text-destructive/60 hover:text-destructive transition-colors"
          >
            ✕
          </button>
        </div>
      )}

      {/* Info banner */}
      <div className="flex items-start gap-3 rounded-xl border border-blue-500/20 bg-blue-500/8 px-5 py-4 text-sm">
        <HardDrive className="size-5 shrink-0 mt-0.5 text-blue-500" />
        <div className="text-blue-700 dark:text-blue-400">
          <p className="font-semibold">Pure SQL backup — no CLI required</p>
          <p className="mt-0.5 text-blue-600/80 dark:text-blue-400/80">
            Backups are generated server-side using direct PostgreSQL connections. The
            downloaded <code className="font-mono text-xs bg-blue-500/10 px-1 py-0.5 rounded">.sql</code> file
            contains INSERT statements for all tables and can be restored with{" "}
            <code className="font-mono text-xs bg-blue-500/10 px-1 py-0.5 rounded">psql -f backup.sql</code>.
          </p>
        </div>
      </div>

      {/* DB Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BackupCard
          target="local"
          label="Local Database"
          description="Your local PostgreSQL development database"
          connectionHint="postgresql://localhost:5432/inventory_management"
          icon={<Server className="size-6 text-violet-500" />}
          accent="bg-gradient-to-r from-violet-500 to-purple-500"
          onDownload={handleDownload}
          isLoading={loadingTarget === "local"}
        />
        <BackupCard
          target="prod"
          label="Production Database"
          description="Supabase cloud database (via direct connection)"
          connectionHint="postgresql://aws-1-ap-southeast-2.pooler.supabase.com/postgres"
          icon={<Cloud className="size-6 text-sky-500" />}
          accent="bg-gradient-to-r from-sky-500 to-cyan-500"
          onDownload={handleDownload}
          isLoading={loadingTarget === "prod"}
        />
      </div>

      {/* Backup History */}
      {history.length > 0 && (
        <div className="rounded-2xl border border-border/40 bg-card overflow-hidden shadow-sm">
          <div className="flex items-center justify-between px-6 py-4 border-b border-border/40 bg-muted/20">
            <div className="flex items-center gap-2">
              <Clock className="size-4 text-muted-foreground" />
              <h3 className="font-semibold text-sm text-foreground">
                Recent Backups
              </h3>
              <span className="text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5">
                {history.length}
              </span>
            </div>
            <button
              onClick={() => setHistory([])}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
            >
              <RefreshCw className="size-3" />
              Clear
            </button>
          </div>

          <div className="divide-y divide-border/30">
            {history.map((entry, i) => (
              <div
                key={i}
                className="flex items-center justify-between gap-4 px-6 py-3.5 hover:bg-muted/20 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {entry.target === "local" ? (
                    <Server className="size-4 text-violet-500 shrink-0" />
                  ) : (
                    <Cloud className="size-4 text-sky-500 shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className="text-xs font-mono text-foreground truncate">
                      {entry.filename}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {entry.timestamp}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {entry.size && (
                    <span className="text-xs text-muted-foreground">
                      {entry.size}
                    </span>
                  )}
                  {entry.status === "success" ? (
                    <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-600">
                      <CheckCircle2 className="size-3.5" />
                      Success
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-xs font-medium text-destructive">
                      <AlertCircle className="size-3.5" />
                      Failed
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
