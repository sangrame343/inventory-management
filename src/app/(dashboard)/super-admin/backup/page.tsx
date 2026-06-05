import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { BackupClient } from "./backup-client";
import { Database, ShieldAlert } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function BackupPage() {
  const session = await auth();
  const isSuperAdmin = (session?.user as any)?.isSuperAdmin;

  if (!isSuperAdmin) {
    redirect("/dashboard");
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center size-12 rounded-2xl bg-primary/10 border border-primary/20 shadow-sm">
            <Database className="size-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Database Backup
            </h1>
            <p className="text-muted-foreground mt-1 text-sm max-w-xl">
              Generate and download full SQL backups of your local and production
              databases. Backups include all table data as import-ready INSERT
              statements.
            </p>
          </div>
        </div>

        {/* Super Admin badge */}
        <div className="shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 text-xs font-semibold">
          <ShieldAlert className="size-4" />
          Super Admin Only
        </div>
      </div>

      <BackupClient />
    </div>
  );
}
