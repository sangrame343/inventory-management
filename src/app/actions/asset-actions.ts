"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { generateAssetCode, generateAssetTag } from "@/lib/asset-utils";
import { Role } from "@prisma/client";
import { checkPermission } from "@/lib/permissions";
import { ApprovalService } from "@/lib/services/approval-service";


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

  const session = await auth();
  const role = session?.user?.role as Role;

  const permission = checkPermission(role, "ASSET", "DELETE");
  if (permission === "DENY") throw new Error("Unauthorized");

  const asset = await db.asset.findUnique({
    where: { id },
    select: { id: true, companyId: true, assetTag: true, name: true },
  });

  if (!asset || asset.companyId !== companyId) {
    throw new Error("Asset not found or unauthorized");
  }

  if (permission === "REQUIRE_APPROVAL") {
    await ApprovalService.createRequest({
      companyId,
      requestedById: userId,
      module: "ASSET",
      action: "DELETE",
      title: `Delete Asset: ${asset.name} (${asset.assetTag})`,
      summary: `Request to delete asset ${asset.name}`,
      targetRecordId: id,
      payload: { id },
    });
    return { success: true, message: "Request submitted for approval" };
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

  const session = await auth();
  const role = session?.user?.role as Role;

  const permission = checkPermission(role, "ASSET", "BULK_DELETE");
  if (permission === "DENY") throw new Error("Unauthorized");

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

  if (permission === "REQUIRE_APPROVAL") {
    await ApprovalService.createRequest({
      companyId,
      requestedById: userId,
      module: "ASSET",
      action: "BULK_DELETE",
      title: `Bulk Delete Assets (${assets.length} items)`,
      summary: `Request to delete ${assets.length} assets`,
      payload: { ids },
    });
    return { success: true, message: "Request submitted for approval" };
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

  const session = await auth();
  const role = session?.user?.role as Role;

  const permission = checkPermission(role, "ASSET", "UPDATE");
  if (permission === "DENY") throw new Error("Unauthorized");

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

  const updateData = {
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
    purchasedFromDepartmentId: data.purchasedFromDepartmentId || null,
    locationId: data.locationId || null,
    vendorId: data.vendorId || null,
    warranty: data.warranty?.trim() || null,
    warrantyExpiration: data.warrantyExpiration ? new Date(data.warrantyExpiration) : null,
  };

  if (permission === "REQUIRE_APPROVAL") {
    await ApprovalService.createRequest({
      companyId,
      requestedById: userId,
      module: "ASSET",
      action: "UPDATE",
      title: `Update Asset: ${asset.name}`,
      summary: `Update details for asset with tag ${asset.assetTag}`,
      targetRecordId: id,
      oldData: asset,
      payload: updateData,
    });
    return { success: true, message: "Request submitted for approval" };
  }

  const res = await db.$transaction(async (tx) => {
    const updated = await tx.asset.update({
      where: { id },
      data: updateData,
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


export async function duplicateAsset(id: string) {
  const { companyId, userId } = await getSessionContext();

  const session = await auth();
  const role = session?.user?.role as Role;

  const permission = checkPermission(role, "ASSET", "CREATE"); // Duplication is a CREATE action
  if (permission === "DENY") throw new Error("Unauthorized");

  const original = await db.asset.findUnique({
    where: { id, companyId },
    include: {
      company: true,
      category: true,
      purchasedFromDepartment: true,
    },
  });

  if (!original) {
    throw new Error("Asset not found");
  }

  if (permission === "REQUIRE_APPROVAL") {
    // We need to generate the codes before submitting the request 
    // OR we let the handler do it. Let's let the handler do it for consistency.
    // But we need to pass enough info.
    await ApprovalService.createRequest({
      companyId,
      requestedById: userId,
      module: "ASSET",
      action: "CREATE",
      title: `Duplicate Asset: ${original.name}`,
      summary: `Request to duplicate asset ${original.assetTag}`,
      targetRecordId: id,
      payload: {
          originalId: id,
          isDuplicate: true
      },
    });
    return { success: true, message: "Request submitted for approval" };
  }

  const res = await db.$transaction(async (tx) => {
    // 1. Increment sequence
    const company = await tx.company.update({
      where: { id: companyId },
      data: { lastAssetSequence: { increment: 1 } },
      select: { code: true, name: true, lastAssetSequence: true },
    });

    // 2. Generate new codes
    const ctx = {
      companyCode: company.code,
      companyName: company.name,
      purchasedFromCode: original.purchasedFromDepartment?.code,
      purchasedFromName: original.purchasedFromDepartment?.name,
      categoryCode: original.category.code,
      categoryName: original.category.name,
      sequence: company.lastAssetSequence,
    };

    const newAssetCode = generateAssetCode(ctx);
    const newAssetTag = generateAssetTag(ctx);

    // 3. Create duplicate
    const duplicated = await tx.asset.create({
      data: {
        companyId,
        categoryId: original.categoryId,
        departmentId: original.departmentId,
        locationId: original.locationId,
        vendorId: original.vendorId,
        purchasedFromDepartmentId: original.purchasedFromDepartmentId,
        
        name: `${original.name} (Copy)`,
        assetCode: newAssetCode,
        assetTag: newAssetTag,
        serialNumber: null, // Don't copy serial number
        brand: original.brand,
        model: original.model,
        
        status: "ACTIVE", // Reset status to ACTIVE
        condition: original.condition,
        specifications: original.specifications,
        accessoriesIncluded: original.accessoriesIncluded,
        estimatedReplacementValue: original.estimatedReplacementValue,
        cost: original.cost,
        usefulLife: original.usefulLife,
        residualValue: original.residualValue,
        warranty: original.warranty,
        warrantyExpiration: original.warrantyExpiration,
      },
    });

    // 4. Log activity
    await tx.activityLog.create({
      data: {
        companyId,
        userId,
        action: "DUPLICATE_ASSET",
        entity: "Asset",
        entityId: duplicated.id,
        details: JSON.stringify({
          originalId: id,
          newAssetTag: duplicated.assetTag,
        }),
      },
    });

    return duplicated;
  });

  revalidatePath("/assets");
  return res;
}

