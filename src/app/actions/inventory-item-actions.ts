"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { InventoryItemStatus, InventoryItemType, Role } from "@prisma/client";
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

async function getUserRole(companyId: string, userId: string): Promise<Role> {
  const userCompanyRole = await db.companyUser.findUnique({
    where: { companyId_userId: { companyId, userId } },
  });
  const session = await auth();
  if (session?.user?.isSuperAdmin) return Role.SUPER_ADMIN;
  return userCompanyRole?.role || Role.USER;
}

export type CreateInventoryItemInput = {
  sku?: string;
  name: string;
  description?: string;
  categoryId?: string;
  unitId?: string;
  defaultLocationId?: string;
  minStockLevel?: number;
  reorderLevel?: number;
  itemType?: InventoryItemType;
  isSerialTracked?: boolean;
  isBatchTracked?: boolean;

  totalQuantity?: number;
  brand?: string;
  model?: string;
  serialNumber?: string;
  vendorId?: string;
  purchasedFromDepartmentId?: string;
  departmentId?: string;
  purchaseDate?: string | null;
  cost?: number;
  warranty?: string;
  warrantyExpiration?: string | null;
  condition?: string;
  imageUrl?: string;
  purchaseUrl?: string;
  specifications?: string;
  accessoriesIncluded?: string[];
  estimatedReplacementValue?: number;
  attachmentUrl?: string;
};

export async function createInventoryItem(input: CreateInventoryItemInput) {
  const { companyId, userId } = await getSessionContext();

  const role = await getUserRole(companyId, userId);
  const permission = checkPermission(role, "INVENTORY", "CREATE");
  if (permission === "DENY") throw new Error("Unauthorized");

  if (permission === "REQUIRE_APPROVAL") {
    await ApprovalService.createRequest({
      companyId,
      requestedById: userId,
      module: "INVENTORY",
      action: "CREATE",
      title: `Create Inventory Item: ${input.name}`,
      summary: `Request to create inventory item ${input.name}`,
      payload: input,
    });
    return { success: true, message: "Request submitted for approval" };
  }

  const res = await db.$transaction(async (tx) => {
    const cleanCategoryId = input.categoryId?.trim() || null;
    const cleanPurchasedFromId = input.purchasedFromDepartmentId?.trim() || null;
    const cleanUnitId = input.unitId?.trim() || null;
    let cleanDefaultLocationId = input.defaultLocationId?.trim() || null;
    const cleanDepartmentId = input.departmentId?.trim() || null;
    const cleanVendorId = input.vendorId?.trim() || null;

    if (cleanDefaultLocationId) {
      const mainLoc = await tx.location.findFirst({
        where: { id: cleanDefaultLocationId, companyId }
      });
      if (mainLoc) {
        let invLoc = await tx.inventoryLocation.findFirst({
          where: { companyId, name: mainLoc.name }
        });
        if (!invLoc) {
          invLoc = await tx.inventoryLocation.create({
            data: {
              companyId,
              name: mainLoc.name,
              code: mainLoc.code || null,
              description: mainLoc.description || `Auto-created matching location for inventory: ${mainLoc.name}`
            }
          });
        }
        cleanDefaultLocationId = invLoc.id;
      }
    }

    if (cleanCategoryId) {
      const assetCategory = await tx.assetCategory.findFirst({
        where: { id: cleanCategoryId, companyId },
      });
      if (!assetCategory) {
        throw new Error("Selected Category not found or does not exist for this company");
      }
    }

    if (cleanPurchasedFromId) {
      const dept = await tx.department.findFirst({
        where: { id: cleanPurchasedFromId, companyId },
      });
      if (!dept) {
        throw new Error("Selected Purchased From Company not found or does not exist for this company");
      }
    }

    let finalSku = input.sku?.trim() || "";
    if (!finalSku) {
      const company = await tx.company.update({
        where: { id: companyId },
        data: { lastInventorySequence: { increment: 1 } },
        select: { code: true, name: true, lastInventorySequence: true },
      });

      let purchasedFromCode = "GEN";
      if (cleanPurchasedFromId) {
        const dept = await tx.department.findFirst({
          where: { id: cleanPurchasedFromId, companyId },
        });
        if (dept?.code) {
          purchasedFromCode = dept.code.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
        }
      }

      let categoryCode = "CAT";
      if (cleanCategoryId) {
        const cat = await tx.assetCategory.findFirst({
          where: { id: cleanCategoryId, companyId },
        });
        if (cat?.code) {
          categoryCode = cat.code.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
        }
      }

      const seqStr = String(company.lastInventorySequence).padStart(3, '0');
      finalSku = `INV-${purchasedFromCode}-${categoryCode}-${seqStr}`;
    } else {
      const existingSku = await tx.inventoryItem.findFirst({
        where: { companyId, sku: { equals: finalSku, mode: "insensitive" } },
      });
      if (existingSku) {
        throw new Error(`Item with SKU ${finalSku} already exists.`);
      }
    }

    const item = await tx.inventoryItem.create({
      data: {
        sku: finalSku,
        name: input.name,
        description: input.description || null,
        categoryId: cleanCategoryId,
        unitId: cleanUnitId,
        defaultLocationId: cleanDefaultLocationId,
        minStockLevel: input.minStockLevel || 0,
        reorderLevel: input.reorderLevel || 0,
        itemType: input.itemType || "CONSUMABLE",
        status: "ACTIVE",
        isSerialTracked: input.isSerialTracked || false,
        isBatchTracked: input.isBatchTracked || false,
        totalQuantity: input.totalQuantity || 0,
        availableQuantity: input.totalQuantity || 0,
        assignedQuantity: 0,
        brand: input.brand || null,
        model: input.model || null,
        serialNumber: input.serialNumber || null,
        vendorId: cleanVendorId,
        purchasedFromDepartmentId: cleanPurchasedFromId,
        departmentId: cleanDepartmentId,
        purchaseDate: input.purchaseDate ? new Date(input.purchaseDate) : null,
        cost: input.cost || null,
        warranty: input.warranty || null,
        warrantyExpiration: input.warrantyExpiration ? new Date(input.warrantyExpiration) : null,
        condition: input.condition || null,
        imageUrl: input.imageUrl || null,
        purchaseUrl: input.purchaseUrl || null,
        specifications: input.specifications || null,
        accessoriesIncluded: input.accessoriesIncluded || [],
        estimatedReplacementValue: input.estimatedReplacementValue || null,
        attachmentUrl: input.attachmentUrl || null,
        companyId,
        createdById: userId,
      },
    });

    if (cleanDefaultLocationId && (input.totalQuantity || 0) > 0) {
      await tx.inventoryBalance.create({
        data: {
          companyId,
          itemId: item.id,
          locationId: cleanDefaultLocationId,
          quantityOnHand: input.totalQuantity || 0,
          availableQty: input.totalQuantity || 0,
          reservedQty: 0,
        },
      });

      await tx.inventoryTransaction.create({
        data: {
          companyId,
          itemId: item.id,
          locationId: cleanDefaultLocationId,
          direction: "IN",
          movementType: "OPENING_STOCK",
          quantity: input.totalQuantity || 0,
          unitCost: input.cost || null,
          balanceAfter: input.totalQuantity || 0,
          notes: "Opening Stock Receipt",
          createdById: userId,
        },
      });
    }

    return item;
  });

  revalidatePath("/inventory");
  return res;
}

export async function updateInventoryItem(id: string, input: Partial<CreateInventoryItemInput>) {
  const { companyId, userId } = await getSessionContext();

  const existing = await db.inventoryItem.findUnique({
    where: { id },
  });

  if (!existing || existing.companyId !== companyId) {
    throw new Error("Item not found or unauthorized.");
  }

  const role = await getUserRole(companyId, userId);
  const permission = checkPermission(role, "INVENTORY", "UPDATE");
  if (permission === "DENY") throw new Error("Unauthorized");

  if (permission === "REQUIRE_APPROVAL") {
    await ApprovalService.createRequest({
      companyId,
      requestedById: userId,
      module: "INVENTORY",
      action: "UPDATE",
      title: `Update Inventory Item: ${existing.name}`,
      summary: `Request to update inventory item ${existing.name}`,
      targetRecordId: id,
      oldData: existing,
      payload: input,
    });
    return { success: true, message: "Request submitted for approval" };
  }

  const cleanCategoryId = input.categoryId !== undefined ? (input.categoryId?.trim() || null) : existing.categoryId;
  const cleanPurchasedFromId = input.purchasedFromDepartmentId !== undefined ? (input.purchasedFromDepartmentId?.trim() || null) : existing.purchasedFromDepartmentId;
  const cleanUnitId = input.unitId !== undefined ? (input.unitId?.trim() || null) : existing.unitId;
  let cleanDefaultLocationId = input.defaultLocationId !== undefined ? (input.defaultLocationId?.trim() || null) : existing.defaultLocationId;
  const cleanDepartmentId = input.departmentId !== undefined ? (input.departmentId?.trim() || null) : existing.departmentId;
  const cleanVendorId = input.vendorId !== undefined ? (input.vendorId?.trim() || null) : existing.vendorId;

  if (input.defaultLocationId !== undefined && cleanDefaultLocationId) {
    const mainLoc = await db.location.findFirst({
      where: { id: cleanDefaultLocationId, companyId }
    });
    if (mainLoc) {
      let invLoc = await db.inventoryLocation.findFirst({
        where: { companyId, name: mainLoc.name }
      });
      if (!invLoc) {
        invLoc = await db.inventoryLocation.create({
          data: {
            companyId,
            name: mainLoc.name,
            code: mainLoc.code || null,
            description: mainLoc.description || `Auto-created matching location for inventory: ${mainLoc.name}`
          }
        });
      }
      cleanDefaultLocationId = invLoc.id;
    }
  }

  if (cleanCategoryId) {
    const assetCategory = await db.assetCategory.findFirst({
      where: { id: cleanCategoryId, companyId },
    });
    if (!assetCategory) {
      throw new Error("Selected Category not found or does not exist for this company");
    }
  }

  if (cleanPurchasedFromId) {
    const dept = await db.department.findFirst({
      where: { id: cleanPurchasedFromId, companyId },
    });
    if (!dept) {
      throw new Error("Selected Purchased From Company not found or does not exist for this company");
    }
  }

  if (input.sku && input.sku.trim().toLowerCase() !== existing.sku.toLowerCase()) {
    const dupe = await db.inventoryItem.findFirst({
      where: { companyId, sku: { equals: input.sku.trim(), mode: "insensitive" } },
    });
    if (dupe) throw new Error("SKU already taken.");
  }

  const res = await db.inventoryItem.update({
    where: { id },
    data: {
      sku: input.sku !== undefined ? (input.sku.trim() || undefined) : undefined,
      name: input.name,
      description: input.description,
      categoryId: cleanCategoryId,
      unitId: cleanUnitId,
      defaultLocationId: cleanDefaultLocationId,
      minStockLevel: input.minStockLevel,
      reorderLevel: input.reorderLevel,
      itemType: input.itemType,
      brand: input.brand,
      model: input.model,
      serialNumber: input.serialNumber,
      vendorId: cleanVendorId,
      purchasedFromDepartmentId: cleanPurchasedFromId,
      departmentId: cleanDepartmentId,
      purchaseDate: input.purchaseDate ? new Date(input.purchaseDate) : undefined,
      cost: input.cost,
      warranty: input.warranty,
      warrantyExpiration: input.warrantyExpiration ? new Date(input.warrantyExpiration) : undefined,
      condition: input.condition,
      imageUrl: input.imageUrl,
      purchaseUrl: input.purchaseUrl,
      specifications: input.specifications,
      accessoriesIncluded: input.accessoriesIncluded,
      estimatedReplacementValue: input.estimatedReplacementValue,
      attachmentUrl: input.attachmentUrl,
      updatedById: userId,
    },
  });

  revalidatePath("/inventory");
  revalidatePath(`/inventory/${id}`);
  return res;
}

export async function toggleInventoryItemActive(id: string, active: boolean) {
  const { companyId, userId } = await getSessionContext();

  // Validate existence and security
  const itm = await db.inventoryItem.findUnique({ where: { id } });
  if (!itm || itm.companyId !== companyId) throw new Error("Not found");

  const role = await getUserRole(companyId, userId);
  const permission = checkPermission(role, "INVENTORY", "UPDATE");
  if (permission === "DENY") throw new Error("Unauthorized");

  if (permission === "REQUIRE_APPROVAL") {
    await ApprovalService.createRequest({
      companyId,
      requestedById: userId,
      module: "INVENTORY",
      action: "UPDATE",
      title: `${active ? "Activate" : "Deactivate"} Inventory Item: ${itm.name}`,
      summary: `Request to ${active ? "activate" : "deactivate"} inventory item ${itm.name}`,
      targetRecordId: id,
      oldData: itm,
      payload: { status: active ? "ACTIVE" : "INACTIVE" },
    });
    return { success: true, message: "Request submitted for approval" };
  }

  const res = await db.inventoryItem.update({
    where: { id },
    data: {
      status: active ? "ACTIVE" : "INACTIVE",
      updatedById: userId,
    },
  });

  revalidatePath("/inventory");
  revalidatePath(`/inventory/${id}`);
  return res;
}

export async function getInventoryItems(params?: {
  page?: number;
  limit?: number;
  query?: string;
  categoryId?: string;
  locationId?: string;
  sortBy?: string;
  order?: "asc" | "desc";
}) {
  const { companyId } = await getSessionContext();

  const page = params?.page || 1;
  const limit = params?.limit || 10;
  const skip = (page - 1) * limit;
  const take = limit;

  const andConditions: any[] = [{ companyId }];

  if (params?.query) {
    const q = params.query.trim();
    andConditions.push({
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { sku: { contains: q, mode: "insensitive" } },
        { brand: { contains: q, mode: "insensitive" } },
        { model: { contains: q, mode: "insensitive" } },
      ],
    });
  }

  if (params?.categoryId) {
    andConditions.push({ categoryId: params.categoryId });
  }

  if (params?.locationId) {
    andConditions.push({ defaultLocationId: params.locationId });
  }

  const where = { AND: andConditions };

  const sortField = params?.sortBy || "createdAt";
  const sortOrder = params?.order || "desc";
  let orderBy: any = { createdAt: "desc" };

  if (sortField === "name") {
    orderBy = { name: sortOrder };
  } else if (sortField === "sku") {
    orderBy = { sku: sortOrder };
  } else if (sortField === "totalQuantity") {
    orderBy = { totalQuantity: sortOrder };
  } else if (sortField === "availableQuantity") {
    orderBy = { availableQuantity: sortOrder };
  } else if (sortField === "createdAt") {
    orderBy = { createdAt: sortOrder };
  }

  const [total, data] = await Promise.all([
    db.inventoryItem.count({ where }),
    db.inventoryItem.findMany({
      where,
      include: {
        category: true,
        unit: true,
        defaultLocation: true,
        balances: {
          include: { location: true },
        },
        purchasedFromDepartment: true,
        department: true,
      },
      orderBy,
      skip,
      take,
    }),
  ]);

  return { total, data };
}

export async function getInventoryItemById(id: string) {
  const { companyId } = await getSessionContext();

  const item = await db.inventoryItem.findUnique({
    where: { id },
    include: {
      category: true,
      unit: true,
      defaultLocation: true,
      purchasedFromDepartment: true,
      department: true,
      balances: {
        include: { location: true },
      },
    },
  });

  if (!item || item.companyId !== companyId) return null;
  return item;
}

export async function deleteInventoryItem(id: string) {
  const { companyId, userId } = await getSessionContext();

  const existing = await db.inventoryItem.findUnique({
    where: { id },
  });

  if (!existing || existing.companyId !== companyId) {
    throw new Error("Item not found or unauthorized.");
  }

  const role = await getUserRole(companyId, userId);
  const permission = checkPermission(role, "INVENTORY", "DELETE");
  if (permission === "DENY") throw new Error("Unauthorized");

  if (permission === "REQUIRE_APPROVAL") {
    await ApprovalService.createRequest({
      companyId,
      requestedById: userId,
      module: "INVENTORY",
      action: "DELETE",
      title: `Delete Inventory Item: ${existing.name}`,
      summary: `Request to delete inventory item ${existing.name}`,
      targetRecordId: id,
      payload: { id },
    });
    return { success: true, message: "Request submitted for approval" };
  }

  await db.$transaction(async (tx) => {
    await tx.inventoryTransaction.deleteMany({ where: { itemId: id } });
    await tx.inventoryAdjustment.deleteMany({ where: { itemId: id } });
    await tx.inventoryBalance.deleteMany({ where: { itemId: id } });
    await tx.inventoryItem.delete({ where: { id } });
  });

  revalidatePath("/inventory");
  return { success: true };
}
