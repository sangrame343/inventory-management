"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { MovementDirection, MovementType, AssetStatus } from "@prisma/client";
import { generateAssetCode, generateAssetTag } from "@/lib/asset-utils";

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

export type AddStockTransactionInput = {
  itemId: string;
  locationId: string;
  direction: MovementDirection;
  movementType: MovementType;
  quantity: number;
  unitCost?: number;
  notes?: string;
  referenceType?: string;
  referenceId?: string;
  employeeId?: string;
  assetId?: string;
};

export async function addStockTransaction(input: AddStockTransactionInput) {
  const { companyId, userId } = await getSessionContext();
  
  if (input.quantity <= 0) {
    throw new Error("Quantity must be greater than zero.");
  }

  return await db.$transaction(async (tx) => {
    // Lock the balance row or just select it
    let balance = await tx.inventoryBalance.findUnique({
      where: {
        companyId_itemId_locationId: {
          companyId,
          itemId: input.itemId,
          locationId: input.locationId,
        },
      },
    });

    if (!balance) {
      if (input.direction === "OUT") {
        throw new Error("Cannot process outward move: Stock balance is zero or tracking not initialized.");
      }
      
      // Initialize if IN
      balance = await tx.inventoryBalance.create({
        data: {
          companyId,
          itemId: input.itemId,
          locationId: input.locationId,
          quantityOnHand: 0,
          availableQty: 0,
        },
      });
    }

    const newQoh =
      input.direction === "IN"
        ? balance.quantityOnHand + input.quantity
        : balance.quantityOnHand - input.quantity;

    if (newQoh < 0) {
      throw new Error(`Insufficient stock. Current balance is ${balance.quantityOnHand}.`);
    }

    const updatedBalance = await tx.inventoryBalance.update({
      where: { id: balance.id },
      data: {
        quantityOnHand: newQoh,
        availableQty: newQoh - balance.reservedQty, 
      },
    });

    const txn = await tx.inventoryTransaction.create({
      data: {
        ...input,
        companyId,
        createdById: userId,
        balanceAfter: newQoh,
      },
    });

    return { balance: updatedBalance, transaction: txn };
  });
}

export type AdjustStockInput = {
  itemId: string;
  locationId: string;
  actualQty: number;
  reason: string;
  notes?: string;
};

export async function adjustStock(input: AdjustStockInput) {
  const { companyId, userId } = await getSessionContext();

  if (input.actualQty < 0) {
    throw new Error("Actual quantity cannot be negative.");
  }

  const result = await db.$transaction(async (tx) => {
    let balance = await tx.inventoryBalance.findUnique({
      where: {
        companyId_itemId_locationId: {
          companyId,
          itemId: input.itemId,
          locationId: input.locationId,
        },
      },
    });

    const systemQty = balance?.quantityOnHand || 0;
    const diff = input.actualQty - systemQty;

    if (diff === 0) {
      throw new Error("No difference detected in stock balance.");
    }

    if (!balance) {
      balance = await tx.inventoryBalance.create({
        data: {
          companyId,
          itemId: input.itemId,
          locationId: input.locationId,
          quantityOnHand: 0,
          availableQty: 0,
        },
      });
    }

    const direction: MovementDirection = diff > 0 ? "IN" : "OUT";
    const movementType: MovementType = diff > 0 ? "ADJUSTMENT_IN" : "ADJUSTMENT_OUT";
    const absoluteDiff = Math.abs(diff);

    // Create adjustment log
    const adjustment = await tx.inventoryAdjustment.create({
      data: {
        companyId,
        itemId: input.itemId,
        locationId: input.locationId,
        systemQty,
        actualQty: input.actualQty,
        differenceQty: diff, // store raw diff
        reason: input.reason,
        notes: input.notes,
        createdById: userId,
      },
    });

    // Create the standard transaction ledger entry
    await tx.inventoryTransaction.create({
      data: {
        companyId,
        itemId: input.itemId,
        locationId: input.locationId,
        direction,
        movementType,
        quantity: absoluteDiff,
        balanceAfter: input.actualQty,
        notes: `Adjustment: ${input.reason}`,
        createdById: userId,
        referenceType: "InventoryAdjustment",
        referenceId: adjustment.id,
      },
    });

    // Update internal balance
    const updatedBalance = await tx.inventoryBalance.update({
      where: { id: balance.id },
      data: {
        quantityOnHand: input.actualQty,
        availableQty: input.actualQty - balance.reservedQty,
      },
    });

    return { balance: updatedBalance, adjustment };
  });

  revalidatePath("/inventory");
  revalidatePath(`/inventory/${input.itemId}`);
  return result;
}

export type IssueInventoryInput = {
  itemId: string;
  locationId: string;
  employeeId: string;
  quantity: number;
  notes?: string;
  registerAsAsset?: boolean;
  assetData?: {
    categoryId: string;
    purchasedFromDepartmentId?: string;
  };
};

export async function issueInventoryToEmployee(input: IssueInventoryInput) {
  const { companyId, userId } = await getSessionContext();

  if (input.quantity <= 0) {
    throw new Error("Quantity must be greater than zero.");
  }

  const result = await db.$transaction(async (tx) => {
    // 1. Check balance
    const balance = await tx.inventoryBalance.findUnique({
      where: {
        companyId_itemId_locationId: {
          companyId,
          itemId: input.itemId,
          locationId: input.locationId,
        },
      },
    });

    if (!balance || balance.availableQty < input.quantity) {
      throw new Error(`Insufficient stock. Available: ${balance?.availableQty || 0}`);
    }

    // 2. Reduce balance
    const newQoh = balance.quantityOnHand - input.quantity;
    const updatedBalance = await tx.inventoryBalance.update({
      where: { id: balance.id },
      data: {
        quantityOnHand: newQoh,
        availableQty: newQoh - balance.reservedQty,
      },
    });

    // 3. Create transaction
    const txn = await tx.inventoryTransaction.create({
      data: {
        companyId,
        itemId: input.itemId,
        locationId: input.locationId,
        direction: "OUT",
        movementType: "ISSUE_TO_EMPLOYEE",
        quantity: input.quantity,
        balanceAfter: newQoh,
        notes: input.notes,
        createdById: userId,
        employeeId: input.employeeId,
      },
    });

    // 4. Optional Asset Registration
    let asset = null;
    if (input.registerAsAsset && input.assetData) {
      const item = await tx.inventoryItem.findUnique({
        where: { id: input.itemId },
        select: { name: true },
      });

      // Increment sequence
      const company = await tx.company.update({
        where: { id: companyId },
        data: { lastAssetSequence: { increment: 1 } },
        select: { code: true, name: true, lastAssetSequence: true },
      });

      const [dept, cat] = await Promise.all([
        input.assetData.purchasedFromDepartmentId
          ? tx.department.findUnique({ where: { id: input.assetData.purchasedFromDepartmentId } })
          : null,
        tx.assetCategory.findUnique({ where: { id: input.assetData.categoryId } }),
      ]);

      if (!cat) throw new Error("Asset category not found");

      const genCtx = {
        companyCode: company.code,
        companyName: company.name,
        purchasedFromCode: dept?.code,
        purchasedFromName: dept?.name,
        categoryCode: cat.code,
        categoryName: cat.name,
        sequence: company.lastAssetSequence,
      };

      asset = await tx.asset.create({
        data: {
          companyId,
          categoryId: input.assetData.categoryId,
          purchasedFromDepartmentId: input.assetData.purchasedFromDepartmentId || null,
          name: item?.name || "New Asset from Inventory",
          assetCode: generateAssetCode(genCtx),
          assetTag: generateAssetTag(genCtx),
          status: AssetStatus.ASSIGNED,
          condition: "New",
        },
      });

      // Create Assignment
      await tx.assetAssignment.create({
        data: {
          companyId,
          assetId: asset.id,
          employeeId: input.employeeId,
          assignedById: userId,
          assignedAt: new Date(),
          transactionId: `TXN-ISSUE-${Date.now()}`,
          notes: `Created from inventory issue: ${txn.id}`,
        },
      });
    }

    return { transaction: txn, asset };
  });

  revalidatePath("/inventory");
  revalidatePath(`/inventory/${input.itemId}`);
  revalidatePath("/assets");
  return result;
}

export async function getInventoryLedgerSummary() {
  const { companyId } = await getSessionContext();
  return db.inventoryTransaction.findMany({
    where: { companyId },
    orderBy: { createdAt: "desc" },
    include: {
      item: { select: { sku: true, name: true } },
      location: { select: { name: true } },
      createdBy: { select: { name: true } },
    },
    take: 50,
  });
}
