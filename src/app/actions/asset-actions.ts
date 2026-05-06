"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

async function getSessionContext() {
  const session = await auth();
  if (!session?.user?.id || !session?.user?.activeCompanyId) {
    throw new Error("Unauthorized");
  }
  return {
    userId: session.user.id,
    companyId: session.user.activeCompanyId,
  };
}

export async function deleteAsset(id: string) {
  const { companyId, userId } = await getSessionContext();

  const asset = await db.asset.findUnique({
    where: { id },
    select: { id: true, companyId: true, assetTag: true, name: true },
  });

  if (!asset || asset.companyId !== companyId) {
    throw new Error("Asset not found or unauthorized");
  }

  await db.$transaction(async (tx) => {
    // Delete the asset (cascades handle related records)
    await tx.asset.delete({
      where: { id },
    });

    // Log activity
    await tx.activityLog.create({
      data: {
        companyId,
        userId,
        action: "DELETE_ASSET",
        entity: "Asset",
        entityId: id,
        details: JSON.stringify({
          assetTag: asset.assetTag,
          name: asset.name,
        }),
      },
    });
  });

  revalidatePath("/assets");
}

export async function bulkDeleteAssets(ids: string[]) {
  const { companyId, userId } = await getSessionContext();

  if (!ids.length) return;

  const assets = await db.asset.findMany({
    where: {
      id: { in: ids },
      companyId,
    },
    select: { id: true, assetTag: true, name: true },
  });

  if (assets.length !== ids.length) {
    throw new Error("Some assets were not found or are unauthorized");
  }

  await db.$transaction(async (tx) => {
    // Delete the assets
    await tx.asset.deleteMany({
      where: {
        id: { in: ids },
        companyId,
      },
    });

    // Log activity
    await tx.activityLog.create({
      data: {
        companyId,
        userId,
        action: "BULK_DELETE_ASSETS",
        entity: "Asset",
        entityId: "multiple",
        details: JSON.stringify({
          count: assets.length,
          assets: assets.map((a) => ({ id: a.id, tag: a.assetTag, name: a.name })),
        }),
      },
    });
  });

  revalidatePath("/assets");
}

export async function updateAsset(id: string, data: any) {
  const { companyId, userId } = await getSessionContext();

  const asset = await db.asset.findUnique({
    where: { id },
  });

  if (!asset || asset.companyId !== companyId) {
    throw new Error("Asset not found or unauthorized");
  }

  // Handle accessoriesIncluded if it's a string coming from the form
  const normalizedAccessories =
    typeof data.accessoriesIncluded === "string"
      ? data.accessoriesIncluded
          .split(",")
          .map((item: string) => item.trim())
          .filter(Boolean)
      : data.accessoriesIncluded;

  const res = await db.$transaction(async (tx) => {
    const updated = await tx.asset.update({
      where: { id },
      data: {
        assetCode: data.assetCode?.trim() || null,
        assetTag: data.assetTag?.trim(),
        name: data.name?.trim(),
        brand: data.brand?.trim() || null,
        model: data.model?.trim() || null,
        serialNumber: data.serialNumber?.trim() || null,
        specifications: data.specifications?.trim() || null,
        accessoriesIncluded: normalizedAccessories || [],
        estimatedReplacementValue:
          data.estimatedReplacementValue === "" || data.estimatedReplacementValue === null
            ? null
            : Number(data.estimatedReplacementValue),
        attachmentUrl: data.attachmentUrl?.trim() || null,
        purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : null,
        condition: data.condition?.trim() || null,
        categoryId: data.categoryId,
        departmentId: data.departmentId || null,
        locationId: data.locationId || null,
        vendorId: data.vendorId || null,
        warranty: data.warranty?.trim() || null,
        warrantyExpiration: data.warrantyExpiration ? new Date(data.warrantyExpiration) : null,
      },
    });

    // Log activity
    await tx.activityLog.create({
      data: {
        companyId,
        userId,
        action: "UPDATE_ASSET",
        entity: "Asset",
        entityId: id,
        details: JSON.stringify({
          previousName: asset.name,
          newName: updated.name,
          assetTag: updated.assetTag,
        }),
      },
    });

    return updated;
  });

  revalidatePath("/assets");
  revalidatePath(`/assets/${id}`);
  revalidatePath(`/assets/${id}/edit`);
  return res;
}
