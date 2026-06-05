"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { MovementDirection, MovementType, AssetStatus, Role } from "@prisma/client";
import { generateAssetCode, generateAssetTag } from "@/lib/asset-utils";
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

  const role = await getUserRole(companyId, userId);
  const action = input.direction === "IN" ? "CREATE" : "ISSUE";
  const permission = checkPermission(role, "INVENTORY", action);

  if (permission === "DENY") {
    throw new Error("Unauthorized");
  }

  if (permission === "REQUIRE_APPROVAL") {
    const item = await db.inventoryItem.findUnique({
      where: { id: input.itemId },
      select: { name: true }
    });
    const itemName = item?.name || "Unknown Item";

    await ApprovalService.createRequest({
      companyId,
      requestedById: userId,
      module: "INVENTORY",
      action,
      title: `Stock movement (${input.direction}): ${input.quantity} units for ${itemName}`,
      summary: `Request to process ${input.direction} stock transaction of ${input.quantity} units for ${itemName}.`,
      payload: input,
    });
    return { success: true, message: "Request submitted for approval" };
  }
  
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

  const role = await getUserRole(companyId, userId);
  const permission = checkPermission(role, "INVENTORY", "UPDATE");

  if (permission === "DENY") {
    throw new Error("Unauthorized");
  }

  if (permission === "REQUIRE_APPROVAL") {
    const item = await db.inventoryItem.findUnique({
      where: { id: input.itemId },
      select: { name: true }
    });
    const itemName = item?.name || "Unknown Item";

    await ApprovalService.createRequest({
      companyId,
      requestedById: userId,
      module: "INVENTORY",
      action: "UPDATE",
      title: `Stock Adjustment for ${itemName}`,
      summary: `Request to adjust stock of ${itemName} to actual quantity of ${input.actualQty}. Reason: ${input.reason}`,
      payload: input,
    });
    return { success: true, message: "Request submitted for approval" };
  }

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

  const role = await getUserRole(companyId, userId);
  const permission = checkPermission(role, "INVENTORY", "ISSUE");

  if (permission === "DENY") {
    throw new Error("Unauthorized");
  }

  if (permission === "REQUIRE_APPROVAL") {
    const item = await db.inventoryItem.findUnique({
      where: { id: input.itemId },
      select: { name: true }
    });
    const itemName = item?.name || "Unknown Item";

    await ApprovalService.createRequest({
      companyId,
      requestedById: userId,
      module: "INVENTORY",
      action: "ISSUE",
      title: `Issue ${input.quantity} units of ${itemName}`,
      summary: `Request to issue ${input.quantity} units of ${itemName} to employee/department. Notes: ${input.notes || "None"}`,
      payload: input,
    });
    return { success: true, message: "Request submitted for approval" };
  }

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

export type AssignInventoryStockInput = {
  itemId: string;
  locationId: string;
  quantity: number;
  notes?: string;
  employeeId?: string | null;
  departmentId?: string | null;
  handoverType?: string;
  physicalCondition?: string;
  functionalStatus?: string;
  handoverDate?: string;
  managerUserId?: string | null;
  issuingOfficerName?: string | null;
  employeeSignatureName?: string | null;
  termsAccepted?: boolean;
  serialNumbers?: string[];
};

export async function assignInventoryStock(input: AssignInventoryStockInput) {
  const { companyId, userId } = await getSessionContext();

  const role = await getUserRole(companyId, userId);
  const permission = checkPermission(role, "INVENTORY", "ASSIGN");

  if (permission === "DENY") {
    throw new Error("Unauthorized");
  }

  if (permission === "REQUIRE_APPROVAL") {
    const item = await db.inventoryItem.findUnique({
      where: { id: input.itemId },
      select: { name: true }
    });
    const itemName = item?.name || "Unknown Item";

    await ApprovalService.createRequest({
      companyId,
      requestedById: userId,
      module: "INVENTORY",
      action: "ASSIGN",
      title: `Assign ${input.quantity} units of ${itemName}`,
      summary: `Request to assign ${input.quantity} units of ${itemName}. Notes: ${input.notes || "None"}`,
      payload: input,
    });
    return { success: true, message: "Request submitted for approval" };
  }

  if (input.quantity <= 0) {
    throw new Error("Quantity to assign must be greater than zero.");
  }

  if (!input.employeeId && !input.departmentId) {
    throw new Error("Either Employee or Department is required for assignment.");
  }
  if (input.employeeId && input.departmentId) {
    throw new Error("Cannot assign to both Employee and Department simultaneously.");
  }

  const result = await db.$transaction(async (tx) => {
    const item = await tx.inventoryItem.findUnique({
      where: { id: input.itemId },
    });
    if (!item || item.companyId !== companyId) {
      throw new Error("Inventory Item not found.");
    }
    if (item.availableQuantity < input.quantity) {
      throw new Error(`Insufficient available inventory stock. Requested: ${input.quantity}, Available: ${item.availableQuantity}`);
    }

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
      throw new Error(`Insufficient location stock. Requested: ${input.quantity}, Available at location: ${balance?.availableQty || 0}`);
    }

    const updatedItem = await tx.inventoryItem.update({
      where: { id: item.id },
      data: {
        availableQuantity: { decrement: input.quantity },
        assignedQuantity: { increment: input.quantity },
      },
    });

    const updatedBalance = await tx.inventoryBalance.update({
      where: { id: balance.id },
      data: {
        quantityOnHand: { decrement: input.quantity },
        availableQty: { decrement: input.quantity },
      },
    });

    const invAssignment = await tx.inventoryAssignment.create({
      data: {
        inventoryItemId: input.itemId,
        employeeId: input.employeeId || null,
        departmentId: input.departmentId || null,
        quantity: input.quantity,
        handoverType: input.handoverType || null,
        physicalCondition: input.physicalCondition || null,
        functionalStatus: input.functionalStatus || null,
        notes: input.notes || null,
        createdById: userId,
      },
    });

    let transUserLink = null;
    if (input.employeeId) {
      const emp = await tx.employee.findUnique({
        where: { id: input.employeeId },
        select: { userId: true },
      });
      transUserLink = emp?.userId || null;
    }

    const txn = await tx.inventoryTransaction.create({
      data: {
        companyId,
        itemId: input.itemId,
        locationId: input.locationId,
        direction: "OUT",
        movementType: input.employeeId ? "ISSUE_TO_EMPLOYEE" : "ISSUE_TO_ASSET",
        quantity: input.quantity,
        balanceAfter: updatedBalance.quantityOnHand,
        notes: input.notes || `Stock assigned to ${input.employeeId ? "employee" : "department"}`,
        createdById: userId,
        employeeId: transUserLink,
      },
    });

    const cat = item.categoryId
      ? await tx.assetCategory.findUnique({ where: { id: item.categoryId } })
      : null;
    if (!cat) throw new Error("Asset category not linked or not found.");

    const dept = item.purchasedFromDepartmentId
      ? await tx.department.findUnique({ where: { id: item.purchasedFromDepartmentId } })
      : null;

    // Map InventoryLocation to physical Asset Location by name
    let resolvedAssetLocationId: string | null = null;
    const targetLocId = item.defaultLocationId || input.locationId;
    if (targetLocId) {
      const invLoc = await tx.inventoryLocation.findUnique({
        where: { id: targetLocId }
      });
      if (invLoc) {
        let loc = await tx.location.findFirst({
          where: { companyId, name: invLoc.name }
        });
        if (!loc) {
          loc = await tx.location.create({
            data: {
              companyId,
              name: invLoc.name,
              code: invLoc.code || null,
              description: invLoc.description || `Auto-created matching location for inventory: ${invLoc.name}`,
              isActive: true
            }
          });
        }
        resolvedAssetLocationId = loc.id;
      }
    }

    const assets = [];
    for (let i = 0; i < input.quantity; i++) {
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

      const serialNum = input.serialNumbers?.[i] || item.serialNumber || null;
      const pieceAssetCode = generateAssetCode(genCtx);
      const pieceAssetTag = generateAssetTag(genCtx);

      const targetStatus = input.employeeId ? AssetStatus.ASSIGNED : AssetStatus.ACTIVE;

      const newAsset = await tx.asset.create({
        data: {
          companyId,
          categoryId: item.categoryId!,
          departmentId: item.departmentId || (input.departmentId ? input.departmentId : null),
          purchasedFromDepartmentId: item.purchasedFromDepartmentId || null,
          locationId: resolvedAssetLocationId,
          vendorId: item.vendorId || null,
          name: item.name,
          brand: item.brand || null,
          model: item.model || null,
          serialNumber: serialNum,
          cost: item.cost || null,
          purchaseDate: item.purchaseDate ? new Date(item.purchaseDate) : null,
          warranty: item.warranty || null,
          warrantyExpiration: item.warrantyExpiration ? new Date(item.warrantyExpiration) : null,
          specifications: item.specifications || null,
          accessoriesIncluded: item.accessoriesIncluded || [],
          estimatedReplacementValue: item.estimatedReplacementValue || null,
          attachmentUrl: item.attachmentUrl || null,
          imageUrl: item.imageUrl || null,
          purchaseUrl: item.purchaseUrl || null,
          assetCode: pieceAssetCode,
          assetTag: pieceAssetTag,
          status: targetStatus,
          condition: item.condition || "New",
          sourceInventoryItemId: item.id,
          sourceInventoryAssignmentId: invAssignment.id,
        },
      });

      assets.push(newAsset);

      if (input.employeeId) {
        await tx.assetAssignment.create({
          data: {
            companyId,
            assetId: newAsset.id,
            employeeId: input.employeeId,
            userId: transUserLink,
            assignedById: userId,
            assignedAt: new Date(),
            transactionId: `TXN-ASSIGN-${Date.now()}-${i}`,
            notes: input.notes || `Created from inventory assignment: ${invAssignment.id}`,
            physicalCondition: (input.physicalCondition as any) || "BRAND_NEW",
            functionalStatus: (input.functionalStatus as any) || "WORKING",
            termsAccepted: input.termsAccepted || false,
            handoverDate: input.handoverDate ? new Date(input.handoverDate) : new Date(),
            handoverType: (input.handoverType as any) || "NEW_HIRE",
            managerUserId: input.managerUserId || null,
            issuingOfficerName: input.issuingOfficerName || null,
            employeeSignatureName: input.employeeSignatureName || null,
            condition: item.condition || "New",
          },
        });
      } else if (input.departmentId) {
        await tx.assetAssignment.create({
          data: {
            companyId,
            assetId: newAsset.id,
            departmentId: input.departmentId,
            assignedById: userId,
            assignedAt: new Date(),
            transactionId: `TXN-ASSIGN-DEPT-${Date.now()}-${i}`,
            notes: input.notes || `Created from inventory assignment to department: ${invAssignment.id}`,
            physicalCondition: (input.physicalCondition as any) || "BRAND_NEW",
            functionalStatus: (input.functionalStatus as any) || "WORKING",
            termsAccepted: false,
            handoverDate: input.handoverDate ? new Date(input.handoverDate) : new Date(),
            handoverType: (input.handoverType as any) || "NEW_HIRE",
            condition: item.condition || "New",
          },
        });
      }
    }

    return { item: updatedItem, balance: updatedBalance, transaction: txn, assignment: invAssignment, assets };
  });

  revalidatePath("/inventory");
  revalidatePath(`/inventory/${input.itemId}`);
  revalidatePath("/assets");
  return result;
}
