import { db } from "@/lib/db";
import { 
  ApprovalStatus, 
  ApprovalModule, 
  ApprovalAction, 
  Prisma
} from "@prisma/client";
import { revalidatePath } from "next/cache";
import { generateAssetCode, generateAssetTag } from "@/lib/asset-utils";

export type ApprovalHandler = (tx: Prisma.TransactionClient, request: any) => Promise<any>;

export class ApprovalService {
  // Handler map for actual operations upon approval
  private static handlers: Record<string, ApprovalHandler> = {
    "ASSET_CREATE": async (tx, request) => {
      if (request.payload?.isDuplicate && request.payload?.originalId) {
        const original = await tx.asset.findUnique({
          where: { id: request.payload.originalId, companyId: request.companyId },
          include: {
            category: true,
            purchasedFromDepartment: true,
          },
        });
        if (!original) {
          throw new Error("Original asset not found for duplication");
        }

        // 1. Increment sequence
        const company = await tx.company.update({
          where: { id: request.companyId },
          data: { lastAssetSequence: { increment: 1 } },
          select: { code: true, name: true, lastAssetSequence: true },
        });

        // 2. Generate new codes
        const genCtx = {
          companyCode: company.code,
          companyName: company.name,
          purchasedFromCode: original.purchasedFromDepartment?.code,
          purchasedFromName: original.purchasedFromDepartment?.name,
          categoryCode: original.category.code,
          categoryName: original.category.name,
          sequence: company.lastAssetSequence,
        };

        const newAssetCode = generateAssetCode(genCtx);
        const newAssetTag = generateAssetTag(genCtx);

        // 3. Create duplicate
        return tx.asset.create({
          data: {
            companyId: request.companyId,
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
            imageUrl: original.imageUrl,
            purchaseUrl: original.purchaseUrl,
            purchaseDate: original.purchaseDate,
          },
        });
      }

      return tx.asset.create({ 
        data: {
            ...request.payload,
            companyId: request.companyId
        } 
      });
    },
    "ASSET_UPDATE": async (tx, request) => {
      return tx.asset.update({
        where: { id: request.targetRecordId },
        data: request.payload
      });
    },
    "ASSET_DELETE": async (tx, request) => {
      return tx.asset.delete({
        where: { id: request.targetRecordId }
      });
    },
    "ASSET_BULK_DELETE": async (tx, request) => {
      const { ids } = request.payload;
      return tx.asset.deleteMany({
        where: {
          id: { in: ids },
          companyId: request.companyId
        }
      });
    },
    "ASSET_DUPLICATE": async (tx, request) => {
        return tx.asset.create({
            data: {
                ...request.payload,
                companyId: request.companyId
            }
        });
    },
    "INVENTORY_ITEM_CREATE": async (tx, request) => {
        return tx.inventoryItem.create({
            data: {
                ...request.payload,
                companyId: request.companyId
            }
        });
    },
    "INVENTORY_ITEM_UPDATE": async (tx, request) => {
        return tx.inventoryItem.update({
            where: { id: request.targetRecordId },
            data: request.payload
        });
    },
    "EMPLOYEE_CREATE": async (tx, request) => {
        return tx.employee.create({
            data: {
                ...request.payload,
                companyId: request.companyId
            }
        });
    },
    "EMPLOYEE_UPDATE": async (tx, request) => {
        return tx.employee.update({
            where: { id: request.targetRecordId },
            data: request.payload
        });
    },


    "ASSET_ASSIGN": async (tx, request) => {
      // Create assignment record
      const assignment = await tx.assetAssignment.create({
          data: {
              ...request.payload,
              companyId: request.companyId
          }
      });
      // Update asset status
      await tx.asset.update({
          where: { id: request.payload.assetId },
          data: { status: "ASSIGNED" }
      });
      return assignment;
    },
    "INVENTORY_ISSUE": async (tx, request) => {
      // This would involve inventory transaction and balance update
      // Similar to inventory-transaction-actions.ts logic
      const { itemId, locationId, quantity, employeeId, assetId, notes } = request.payload;
      
      // Create transaction
      const txn = await tx.inventoryTransaction.create({
          data: {
              companyId: request.companyId,
              itemId,
              locationId,
              direction: "OUT",
              movementType: "ISSUE_TO_EMPLOYEE",
              quantity,
              employeeId,
              assetId,
              notes,
              createdById: request.requestedById
          }
      });

      // Update balance
      await tx.inventoryBalance.update({
          where: {
              companyId_itemId_locationId: {
                  companyId: request.companyId,
                  itemId,
                  locationId
              }
          },
          data: {
              quantityOnHand: { decrement: quantity },
              availableQty: { decrement: quantity }
          }
      });

      return txn;
    },
    // TODO: Add more handlers as we intercept more actions
  };

  static async createRequest(data: {
    companyId: string;
    requestedById: string;
    module: ApprovalModule;
    action: ApprovalAction;
    title: string;
    summary?: string;
    targetRecordId?: string;
    oldData?: any;
    payload: any;
  }) {
    return await db.approvalRequest.create({
      data: {
        companyId: data.companyId,
        requestedById: data.requestedById,
        module: data.module,
        action: data.action,
        title: data.title,
        summary: data.summary || null,
        targetRecordId: data.targetRecordId || null,
        oldData: data.oldData || Prisma.JsonNull,
        payload: data.payload,
        status: ApprovalStatus.PENDING,
      },
    });
  }

  static async reviewRequest(
    requestId: string,
    reviewedById: string,
    status: ApprovalStatus,
    reviewNote?: string
  ) {
    if (status !== ApprovalStatus.APPROVED && status !== ApprovalStatus.REJECTED) {
      throw new Error("Invalid review status");
    }

    const result = await db.$transaction(async (tx) => {
      const request = await tx.approvalRequest.findUnique({
        where: { id: requestId },
      });

      if (!request) throw new Error("Request not found");
      if (request.status !== ApprovalStatus.PENDING) {
        throw new Error("This request has already been reviewed.");
      }

      // If approved, apply the handler
      let operationResult = null;
      if (status === ApprovalStatus.APPROVED) {
        const handlerKey = `${request.module}_${request.action}`;
        const handler = this.handlers[handlerKey];
        if (!handler) {
          throw new Error(`No handler found for ${handlerKey}`);
        }
        operationResult = await handler(tx, request);
      }

      // Update request status
      const updatedRequest = await tx.approvalRequest.update({
        where: { id: requestId },
        data: {
          status,
          reviewedById,
          reviewNote,
          reviewedAt: new Date(),
        },
      });

      // Log activity
      await tx.activityLog.create({
        data: {
          companyId: request.companyId,
          userId: reviewedById,
          action: status === ApprovalStatus.APPROVED ? "APPROVE_REQUEST" : "REJECT_REQUEST",
          entity: "ApprovalRequest",
          entityId: requestId,
          details: JSON.stringify({
            module: request.module,
            action: request.action,
            status: status,
            title: request.title,
            summary: request.summary
          }),
          requestedById: request.requestedById,
          reviewedById: reviewedById,
          approvalModule: request.module,
          approvalAction: request.action,
          approvalStatus: status
        }
      });

      return { request: updatedRequest, operationResult };
    });

    // Revalidate paths after transaction
    revalidatePath("/approvals");
    revalidatePath("/dashboard");
    // Revalidate based on module
    if (result.request.module === "ASSET") revalidatePath("/assets");
    if (result.request.module === "INVENTORY") revalidatePath("/inventory");

    return result;
  }
}
