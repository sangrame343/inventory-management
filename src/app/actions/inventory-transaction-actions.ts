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
  quantity: number;
  notes?: string;
  registerAsAsset?: boolean;
  assignmentType: "NONE" | "EMPLOYEE" | "DEPARTMENT" | "LOCATION";
  targetEmployeeId?: string | null;
  targetDepartmentId?: string | null;
  targetLocationId?: string | null;
  assetData?: {
    categoryId: string;
    departmentId?: string | null;
    purchasedFromDepartmentId?: string | null;
    vendorId?: string | null;
    locationId?: string | null;
    handoverDate?: string | null;
    handoverType?: string | null;
    managerUserId?: string | null;
    issuingOfficerName?: string | null;
    employeeSignatureName?: string | null;
    termsAccepted?: boolean;
    cost?: number | null;
    purchaseDate?: string | null;
    warranty?: string | null;
    warrantyExpiration?: string | null;
    specifications?: string | null;
    accessoriesIncluded?: string | null;
    estimatedReplacementValue?: number | null;
  };
  pieces?: {
    serialNumber?: string | null;
    assetTag?: string | null;
    assetCode?: string | null;
    brand?: string | null;
    model?: string | null;
    condition?: string | null;
    physicalCondition?: string | null;
    functionalStatus?: string | null;
    specifications?: string | null;
    accessoriesIncluded?: string | null;
    attachmentUrl?: string | null;
    notes?: string | null;
  }[];
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

    // Resolve employee user ID for transaction logging if assigned to employee
    let transUserLink = null;
    if (input.assignmentType === "EMPLOYEE" && input.targetEmployeeId) {
      const emp = await tx.employee.findUnique({
        where: { id: input.targetEmployeeId },
        select: { userId: true },
      });
      transUserLink = emp?.userId || null;
    }

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
        employeeId: transUserLink,
      },
    });

    // 4. Optional Asset Registration
    let assets = [];
    if (input.registerAsAsset && input.assetData) {
      const item = await tx.inventoryItem.findUnique({
        where: { id: input.itemId },
        select: { name: true },
      });

      const [dept, cat] = await Promise.all([
        input.assetData.purchasedFromDepartmentId
          ? tx.department.findUnique({ where: { id: input.assetData.purchasedFromDepartmentId } })
          : null,
        tx.assetCategory.findUnique({ where: { id: input.assetData.categoryId } }),
      ]);

      if (!cat) throw new Error("Asset category not found");

      for (let i = 0; i < input.quantity; i++) {
        // Increment sequence
        const company = await tx.company.update({
          where: { id: companyId },
          data: { lastAssetSequence: { increment: 1 } },
          select: { code: true, name: true, lastAssetSequence: true },
        });

        const genCtx = {
          companyCode: company.code,
          companyName: company.name,
          purchasedFromCode: dept?.code,
          purchasedFromName: dept?.name,
          categoryCode: cat.code,
          categoryName: cat.name,
          sequence: company.lastAssetSequence,
        };

        const pieceData = input.pieces?.[i] || {};
        const pieceAssetCode = pieceData.assetCode?.trim() || generateAssetCode(genCtx);
        const pieceAssetTag = pieceData.assetTag?.trim() || generateAssetTag(genCtx);

        // Determine target status
        let targetStatus: AssetStatus = AssetStatus.ACTIVE;
        if (input.assignmentType === "EMPLOYEE") {
          targetStatus = AssetStatus.ASSIGNED;
        }

        const newAsset = await tx.asset.create({
          data: {
            companyId,
            categoryId: input.assetData.categoryId,
            departmentId: input.assetData.departmentId || (input.assignmentType === "DEPARTMENT" ? input.targetDepartmentId : null),
            purchasedFromDepartmentId: input.assetData.purchasedFromDepartmentId || null,
            locationId: input.assetData.locationId || (input.assignmentType === "LOCATION" ? input.targetLocationId : (input.locationId || null)),
            vendorId: input.assetData.vendorId || null,
            name: pieceData.model || item?.name || "New Asset from Inventory",
            brand: pieceData.brand || null,
            model: pieceData.model || null,
            serialNumber: pieceData.serialNumber || null,
            cost: input.assetData.cost || null,
            purchaseDate: input.assetData.purchaseDate ? new Date(input.assetData.purchaseDate) : null,
            warranty: input.assetData.warranty || null,
            warrantyExpiration: input.assetData.warrantyExpiration ? new Date(input.assetData.warrantyExpiration) : null,
            specifications: pieceData.specifications || input.assetData.specifications || null,
            accessoriesIncluded: pieceData.accessoriesIncluded 
              ? pieceData.accessoriesIncluded.split(",").map((x: string) => x.trim()).filter(Boolean)
              : (input.assetData.accessoriesIncluded 
                  ? input.assetData.accessoriesIncluded.split(",").map((x: string) => x.trim()).filter(Boolean)
                  : []),
            estimatedReplacementValue: input.assetData.estimatedReplacementValue || null,
            attachmentUrl: pieceData.attachmentUrl || null,
            assetCode: pieceAssetCode,
            assetTag: pieceAssetTag,
            status: targetStatus,
            condition: pieceData.condition || "New",
          },
        });

        assets.push(newAsset);

        // Create Assignment record if assigned to Employee or Department
        if (input.assignmentType === "EMPLOYEE" && input.targetEmployeeId) {
          await tx.assetAssignment.create({
            data: {
              companyId,
              assetId: newAsset.id,
              employeeId: input.targetEmployeeId,
              userId: transUserLink,
              assignedById: userId,
              assignedAt: new Date(),
              transactionId: `TXN-ISSUE-${Date.now()}-${i}`,
              notes: pieceData.notes || input.notes || `Created from inventory issue: ${txn.id}`,
              physicalCondition: (pieceData.physicalCondition as any) || "BRAND_NEW",
              functionalStatus: (pieceData.functionalStatus as any) || "WORKING",
              termsAccepted: input.assetData.termsAccepted || false,
              handoverDate: input.assetData.handoverDate ? new Date(input.assetData.handoverDate) : new Date(),
              handoverType: (input.assetData.handoverType as any) || "NEW_HIRE",
              managerUserId: input.assetData.managerUserId || null,
              issuingOfficerName: input.assetData.issuingOfficerName || null,
              employeeSignatureName: input.assetData.employeeSignatureName || null,
              attachmentUrl: pieceData.attachmentUrl || null,
              condition: pieceData.condition || "New",
            },
          });
        } else if (input.assignmentType === "DEPARTMENT" && input.targetDepartmentId) {
          await tx.assetAssignment.create({
            data: {
              companyId,
              assetId: newAsset.id,
              departmentId: input.targetDepartmentId,
              assignedById: userId,
              assignedAt: new Date(),
              transactionId: `TXN-ISSUE-DEPT-${Date.now()}-${i}`,
              notes: pieceData.notes || input.notes || `Created from inventory issue to department: ${txn.id}`,
              physicalCondition: (pieceData.physicalCondition as any) || "BRAND_NEW",
              functionalStatus: (pieceData.functionalStatus as any) || "WORKING",
              termsAccepted: false,
              handoverDate: input.assetData.handoverDate ? new Date(input.assetData.handoverDate) : new Date(),
              handoverType: (input.assetData.handoverType as any) || "NEW_HIRE",
              condition: pieceData.condition || "New",
            },
          });
        }
      }
    }

    return { transaction: txn, assets };
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
