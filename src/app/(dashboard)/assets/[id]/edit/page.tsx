import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { EditAssetForm } from "@/components/assets/edit-asset-form";

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Edit Asset</h1>
        <p className="text-sm text-muted-foreground">
          Update asset details for <span className="font-semibold text-foreground">{asset.name}</span>.
        </p>
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
