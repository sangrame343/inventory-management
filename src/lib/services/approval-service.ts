import { db } from "@/lib/db";
import { 
  ApprovalStatus, 
  ApprovalModule, 
  ApprovalAction, 
  Prisma,
  MovementDirection,
  MovementType,
  AssetStatus
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
    "INVENTORY_CREATE": async (tx, request) => {
      const input = request.payload;
      const companyId = request.companyId;
      const userId = request.requestedById;

      if (input.itemId) {
        // This is addStockTransaction (direction: IN)
        const balance = await tx.inventoryBalance.findUnique({
          where: {
            companyId_itemId_locationId: {
              companyId,
              itemId: input.itemId,
              locationId: input.locationId,
            },
          },
        });

        let currentBalance = balance;
        if (!currentBalance) {
          currentBalance = await tx.inventoryBalance.create({
            data: {
              companyId,
              itemId: input.itemId,
              locationId: input.locationId,
              quantityOnHand: 0,
              availableQty: 0,
            },
          });
        }

        const newQoh = currentBalance.quantityOnHand + input.quantity;

        const updatedBalance = await tx.inventoryBalance.update({
          where: { id: currentBalance.id },
          data: {
            quantityOnHand: newQoh,
            availableQty: newQoh - currentBalance.reservedQty,
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
      } else {
        // This is createInventoryItem
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
      }
    },
    "INVENTORY_UPDATE": async (tx, request) => {
      const input = request.payload;
      const companyId = request.companyId;
      const userId = request.requestedById;

      if (input.actualQty !== undefined) {
        // This is adjustStock
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

        const adjustment = await tx.inventoryAdjustment.create({
          data: {
            companyId,
            itemId: input.itemId,
            locationId: input.locationId,
            systemQty,
            actualQty: input.actualQty,
            differenceQty: diff,
            reason: input.reason,
            notes: input.notes,
            createdById: userId,
          },
        });

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

        const updatedBalance = await tx.inventoryBalance.update({
          where: { id: balance.id },
          data: {
            quantityOnHand: input.actualQty,
            availableQty: input.actualQty - balance.reservedQty,
          },
        });

        return { balance: updatedBalance, adjustment };
      } else {
        // This is updateInventoryItem
        return tx.inventoryItem.update({
          where: { id: request.targetRecordId },
          data: input
        });
      }
    },
    "INVENTORY_DELETE": async (tx, request) => {
      const id = request.targetRecordId;
      await tx.inventoryTransaction.deleteMany({ where: { itemId: id } });
      await tx.inventoryAdjustment.deleteMany({ where: { itemId: id } });
      await tx.inventoryBalance.deleteMany({ where: { itemId: id } });
      return tx.inventoryItem.delete({ where: { id } });
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
    "INVENTORY_ASSIGN": async (tx, request) => {
      const input = request.payload;
      const companyId = request.companyId;
      const userId = request.requestedById;

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
    },
    "INVENTORY_ISSUE": async (tx, request) => {
      const input = request.payload;
      const companyId = request.companyId;
      const userId = request.requestedById;

      if (input.assignmentType !== undefined) {
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
      } else {
        // This is addStockTransaction (direction: OUT)
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
          throw new Error("Cannot process outward move: Stock balance is zero or tracking not initialized.");
        }

        const newQoh = balance.quantityOnHand - input.quantity;

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
      }
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
