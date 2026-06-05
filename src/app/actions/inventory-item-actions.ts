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
    let finalSku = input.sku?.trim();
    if (!finalSku) {
      const count = await tx.inventoryItem.count({ where: { companyId } });
      finalSku = `IBA-ABPL-SKU-${String(count + 1).padStart(3, '0')}`;
    } else {
      const existingSku = await tx.inventoryItem.findFirst({
        where: { companyId, sku: finalSku },
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
        categoryId: input.categoryId || null,
        unitId: input.unitId || null,
        defaultLocationId: input.defaultLocationId || null,
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
        vendorId: input.vendorId || null,
        purchasedFromDepartmentId: input.purchasedFromDepartmentId || null,
        departmentId: input.departmentId || null,
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

    if (input.defaultLocationId && (input.totalQuantity || 0) > 0) {
      await tx.inventoryBalance.create({
        data: {
          companyId,
          itemId: item.id,
          locationId: input.defaultLocationId,
          quantityOnHand: input.totalQuantity || 0,
          availableQty: input.totalQuantity || 0,
          reservedQty: 0,
        },
      });

      await tx.inventoryTransaction.create({
        data: {
          companyId,
          itemId: item.id,
          locationId: input.defaultLocationId,
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

  if (input.sku && input.sku !== existing.sku) {
    const dupe = await db.inventoryItem.findFirst({
      where: { companyId, sku: input.sku },
    });
    if (dupe) throw new Error("SKU already taken.");
  }

  const res = await db.inventoryItem.update({
    where: { id },
    data: {
      sku: input.sku,
      name: input.name,
      description: input.description,
      categoryId: input.categoryId,
      unitId: input.unitId,
      defaultLocationId: input.defaultLocationId,
      minStockLevel: input.minStockLevel,
      reorderLevel: input.reorderLevel,
      itemType: input.itemType,
      brand: input.brand,
      model: input.model,
      serialNumber: input.serialNumber,
      vendorId: input.vendorId,
      purchasedFromDepartmentId: input.purchasedFromDepartmentId,
      departmentId: input.departmentId,
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
        balances: true,
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
