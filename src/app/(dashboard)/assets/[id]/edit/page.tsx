import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Tag as TagIcon, Eye } from "lucide-react";
import { EditAssetForm } from "@/components/assets/edit-asset-form";
import { Badge } from "@/components/ui/badge";

interface AssetEditPageProps {
  params: Promise<{ id: string }>;
}

export default async function AssetEditPage({ params }: AssetEditPageProps) {
  const session = await auth();

  if (!session?.user?.activeCompanyId) {
    redirect("/login");
  }

  const companyId = session.user.activeCompanyId;
  const { id } = await params;

  const [asset, categories, departments, locations, vendors] = await Promise.all([
    db.asset.findFirst({
      where: {
        id,
        companyId,
      },
      include: {
        category: true,
        department: true,
        location: true,
        vendor: true,
      },
    }),
    db.assetCategory.findMany({
      where: { companyId },
      orderBy: { name: "asc" },
    }),
    db.department.findMany({
      where: { companyId },
      orderBy: { name: "asc" },
    }),
    db.location.findMany({
      where: { companyId },
      orderBy: { name: "asc" },
    }),
    db.vendor.findMany({
      where: { companyId },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!asset) {
    notFound();
  }

  const statusColorMap: Record<string, string> = {
    ACTIVE: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    ASSIGNED: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    REPAIR: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    DISPOSED: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
    LOST: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Top action header / Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-2">
        <Link
          href={`/assets/${asset.id}`}
          className="group flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors duration-200"
        >
          <ChevronLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform duration-200" />
          Back to Asset Details
        </Link>

        <Link
          href={`/assets/${asset.id}`}
          className="inline-flex items-center justify-center border border-border bg-background hover:bg-muted text-foreground transition-all duration-200 h-8 px-3 rounded-lg text-xs font-semibold gap-1.5"
        >
          <Eye className="h-3.5 w-3.5" />
          View Asset
        </Link>
      </div>

      {/* Main page title and status badges */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground via-foreground/90 to-muted-foreground/75">
              Edit Asset
            </h1>
            <Badge variant="outline" className={`px-2.5 py-0.5 text-[11px] font-bold rounded-full uppercase border ${statusColorMap[asset.status] || "bg-muted text-muted-foreground"}`}>
              {asset.status}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Update asset details for <span className="font-semibold text-foreground">{asset.name}</span>
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto bg-muted/30 px-3 py-2 rounded-lg border">
          <TagIcon className="h-4 w-4 text-indigo-500" />
          <div className="text-xs">
            <span className="text-muted-foreground">Asset Tag ID:</span>{" "}
            <span className="font-mono font-bold text-foreground">{asset.assetTag}</span>
          </div>
        </div>
      </div>

      <EditAssetForm
        asset={asset as any}
        categories={categories}
        departments={departments}
        locations={locations}
        vendors={vendors}
      />
    </div>
  );
}
