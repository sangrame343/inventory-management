"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { InventoryItemStatus, InventoryItemType } from "@prisma/client";

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

export async function getInventoryItems() {
  const { companyId } = await getSessionContext();

  return db.inventoryItem.findMany({
    where: { companyId },
    include: {
      category: true,
      unit: true,
      defaultLocation: true,
      balances: true,
      purchasedFromDepartment: true,
      department: true,
    },
    orderBy: { createdAt: "desc" },
  });
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
  const { companyId } = await getSessionContext();

  const existing = await db.inventoryItem.findUnique({
    where: { id },
  });

  if (!existing || existing.companyId !== companyId) {
    throw new Error("Item not found or unauthorized.");
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
