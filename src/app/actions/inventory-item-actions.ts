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
  sku: string;
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
};

export async function createInventoryItem(input: CreateInventoryItemInput) {
  const { companyId, userId } = await getSessionContext();

  const existingSku = await db.inventoryItem.findFirst({
    where: { companyId, sku: input.sku },
  });

  if (existingSku) {
    throw new Error(`Item with SKU ${input.sku} already exists.`);
  }

  const res = await db.inventoryItem.create({
    data: {
      ...input,
      companyId,
      createdById: userId,
      status: "ACTIVE",
    },
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
      ...input,
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

  // include aggregates like balances
  return db.inventoryItem.findMany({
    where: { companyId },
    include: {
      category: true,
      unit: true,
      defaultLocation: true,
      balances: true,
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
