import { db } from "@/lib/db";
import { 
  TransferStatus, 
  TransferType, 
  AssetStatus, 
  HandoverType, 
  PhysicalCondition, 
  FunctionalStatus,
  Prisma
} from "@prisma/client";
import { AssignmentService } from "./assignment-service";

export class TransferService {
  static async requestTransfer(data: {
    companyId: string;
    assetId: string;
    transferType: TransferType;
    fromLocationId?: string;
    toLocationId?: string;
    fromEmployeeId?: string;
    toEmployeeId?: string;
    requestedById: string;
    reason?: string;
    notes?: string;
    conditionBefore?: string;
    plannedTransferDate?: Date;
    expectedReceiptDate?: Date;
  }) {
    return await db.$transaction(async (tx) => {
      // 0. Get company and increment sequence for transferCode
      const company = await tx.company.update({
        where: { id: data.companyId },
        data: { lastTransferSequence: { increment: 1 } },
        select: { name: true, code: true, lastTransferSequence: true }
      });

      const year = new Date().getFullYear();
      const companyCode = company.code || company.name.substring(0, 3).toUpperCase();
      const sequence = company.lastTransferSequence.toString().padStart(4, "0");
      const transferCode = `TRN-${companyCode}-${year}-${sequence}`;

      // 1. Validate asset exists and belongs to company
      const asset = await tx.asset.findUnique({
        where: { id: data.assetId, companyId: data.companyId },
      });

      if (!asset) {
        throw new Error("Asset not found or access denied");
      }

      // 2. Cannot transfer disposed or lost assets
      if (asset.status === AssetStatus.DISPOSED || asset.status === AssetStatus.LOST) {
        throw new Error(`Cannot transfer asset with status ${asset.status}`);
      }

      // 2.5 Block if destination is same as source (basic check)
      if (data.transferType === TransferType.LOCATION_TO_LOCATION && data.fromLocationId === data.toLocationId) {
        throw new Error("Source and destination locations cannot be the same");
      }
      if (data.transferType === TransferType.EMPLOYEE_TO_EMPLOYEE && data.fromEmployeeId === data.toEmployeeId) {
        throw new Error("Source and destination employees cannot be the same");
      }

      // 3. Check for active transfers
      const activeTransfer = await tx.assetTransfer.findFirst({
        where: {
          assetId: data.assetId,
          companyId: data.companyId,
          status: {
            in: [TransferStatus.REQUESTED, TransferStatus.APPROVED, TransferStatus.IN_TRANSIT]
          }
        }
      });

      if (activeTransfer) {
        throw new Error("Asset already has an active transfer request");
      }

      // 4. Create transfer record
      const transfer = await tx.assetTransfer.create({
        data: {
          companyId: data.companyId,
          assetId: data.assetId,
          transferCode,
          transferType: data.transferType,
          status: TransferStatus.REQUESTED,
          fromLocationId: data.fromLocationId || null,
          toLocationId: data.toLocationId || null,
          fromEmployeeId: data.fromEmployeeId || null,
          toEmployeeId: data.toEmployeeId || null,
          requestedById: data.requestedById,
          reason: data.reason,
          notes: data.notes,
          conditionBefore: data.conditionBefore,
          plannedTransferDate: data.plannedTransferDate || null,
          expectedReceiptDate: data.expectedReceiptDate || null,
        },
      });

      // 5. Log activity
      await tx.activityLog.create({
        data: {
          companyId: data.companyId,
          userId: data.requestedById,
          action: "TRANSFER_REQUESTED",
          entity: "AssetTransfer",
          entityId: transfer.id,
          details: JSON.stringify({
            assetId: data.assetId,
            transferType: data.transferType,
          }),
        },
      });

      return transfer;
    });
  }

  static async updateTransfer(id: string, companyId: string, userId: string, data: {
    transferType?: TransferType;
    fromLocationId?: string;
    toLocationId?: string;
    fromEmployeeId?: string;
    toEmployeeId?: string;
    reason?: string;
    notes?: string;
    conditionBefore?: string;
    plannedTransferDate?: Date;
    expectedReceiptDate?: Date;
  }, userRole: string) {
    return await db.$transaction(async (tx) => {
      const transfer = await tx.assetTransfer.findUnique({
        where: { id, companyId },
      });

      if (!transfer) throw new Error("Transfer not found");

      // Editability Rules:
      // 1. REQUESTED: Editable by anyone involved? (Actually user said only SUPER_ADMIN can control lifecycle, 
      // but "all other users can only create transfer requests". Let's assume ONLY SUPER_ADMIN can EDIT as well per point 1)
      if (userRole !== "SUPER_ADMIN") {
        throw new Error("Only SUPER_ADMIN can edit transfers");
      }

      const immutableStatuses: TransferStatus[] = [TransferStatus.IN_TRANSIT, TransferStatus.COMPLETED, TransferStatus.REJECTED, TransferStatus.CANCELLED];
      if (immutableStatuses.includes(transfer.status)) {
        throw new Error(`Cannot edit transfer in ${transfer.status} status`);
      }

      const updatedTransfer = await tx.assetTransfer.update({
        where: { id },
        data: {
          ...data,
          updatedById: userId,
        },
      });

      await tx.activityLog.create({
        data: {
          companyId,
          userId,
          action: "TRANSFER_UPDATED",
          entity: "AssetTransfer",
          entityId: id,
          details: JSON.stringify(data),
        },
      });

      return updatedTransfer;
    });
  }

  static async approveTransfer(id: string, companyId: string, userId: string) {
    return await db.$transaction(async (tx) => {
      const transfer = await tx.assetTransfer.findUnique({ where: { id, companyId } });
      if (!transfer || transfer.status !== TransferStatus.REQUESTED) {
        throw new Error("Only REQUESTED transfers can be approved");
      }

      const result = await tx.assetTransfer.update({
        where: { id },
        data: {
          status: TransferStatus.APPROVED,
          approvedById: userId,
        },
      });

      await tx.activityLog.create({
        data: {
          companyId,
          userId,
          action: "TRANSFER_APPROVED",
          entity: "AssetTransfer",
          entityId: id,
        },
      });

      return result;
    });
  }

  static async markInTransit(id: string, companyId: string, userId: string) {
    return await db.$transaction(async (tx) => {
      const transfer = await tx.assetTransfer.findUnique({ where: { id, companyId } });
      if (!transfer || transfer.status !== TransferStatus.APPROVED) {
        throw new Error("Only APPROVED transfers can be marked in transit");
      }

      const result = await tx.assetTransfer.update({
        where: { id, companyId },
        data: {
          status: TransferStatus.IN_TRANSIT,
          actualDispatchDate: new Date(),
        },
      });

      await tx.activityLog.create({
        data: {
          companyId,
          userId,
          action: "TRANSFER_IN_TRANSIT",
          entity: "AssetTransfer",
          entityId: id,
        },
      });

      return result;
    });
  }

  static async completeTransfer(id: string, companyId: string, userId: string, data?: { conditionAfter?: string; notes?: string }) {
    return await db.$transaction(async (tx) => {
      const transfer = await tx.assetTransfer.findFirst({
        where: { id, companyId },
        include: { asset: true }
      });

      if (!transfer || transfer.status !== TransferStatus.IN_TRANSIT) {
        throw new Error("Only IN_TRANSIT transfers can be completed");
      }

      // 1. Update transfer status
      await tx.assetTransfer.update({
        where: { id },
        data: {
          status: TransferStatus.COMPLETED,
          completedById: userId,
          completedAt: new Date(),
          actualReceiptDate: new Date(),
          conditionAfter: data?.conditionAfter,
          notes: data?.notes ? `${transfer.notes || ""}\nCompletion Notes: ${data.notes}` : transfer.notes,
        },
      });

      // 2. Perform state synchronization based on transfer type
      switch (transfer.transferType) {
        case TransferType.LOCATION_TO_LOCATION:
          if (transfer.toLocationId) {
            await tx.asset.update({
              where: { id: transfer.assetId },
              data: { locationId: transfer.toLocationId },
            });
          }
          break;

        case TransferType.EMPLOYEE_TO_EMPLOYEE:
          if (transfer.toEmployeeId) {
            // Reuse AssignmentService logic
            await AssignmentService.assignAsset(
              transfer.assetId,
              companyId,
              {
                employeeId: transfer.toEmployeeId,
                assignedById: userId,
                notes: `Transfer complete. ${data?.notes || ""}`,
                handoverType: HandoverType.REPLACEMENT,
                physicalCondition: PhysicalCondition.USED_FAIR,
                functionalStatus: FunctionalStatus.WORKING,
              },
              tx
            );
          }
          break;

        case TransferType.EMPLOYEE_TO_LOCATION:
          // Close existing assignment
          await AssignmentService.returnAsset(
            transfer.assetId,
            companyId,
            userId,
            {
              returnReason: "TRANSFER_TO_LOCATION",
              returnCondition: data?.conditionAfter,
              notes: data?.notes,
            },
            tx
          );

          // Update asset location
          await tx.asset.update({
            where: { id: transfer.assetId },
            data: { 
              locationId: transfer.toLocationId || transfer.asset?.locationId 
            },
          });
          break;

        case TransferType.LOCATION_TO_EMPLOYEE:
          if (transfer.toEmployeeId) {
            // Create new assignment
            await AssignmentService.assignAsset(
              transfer.assetId,
              companyId,
              {
                employeeId: transfer.toEmployeeId,
                assignedById: userId,
                notes: `Transfer from location complete. ${data?.notes || ""}`,
                handoverType: HandoverType.NEW_HIRE,
                physicalCondition: PhysicalCondition.USED_FAIR,
                functionalStatus: FunctionalStatus.WORKING,
              },
              tx
            );

            // Update asset location if specified
            if (transfer.toLocationId) {
              await tx.asset.update({
                where: { id: transfer.assetId },
                data: { locationId: transfer.toLocationId },
              });
            }
          }
          break;
      }

      // 3. Log activity
      await tx.activityLog.create({
        data: {
          companyId,
          userId,
          action: "TRANSFER_COMPLETED",
          entity: "AssetTransfer",
          entityId: id,
          details: JSON.stringify({
            assetId: transfer.assetId,
            transferType: transfer.transferType,
          }),
        },
      });

      return transfer;
    });
  }

  static async rejectTransfer(id: string, companyId: string, userId: string, reason: string) {
    return await db.$transaction(async (tx) => {
      const transfer = await tx.assetTransfer.findUnique({ where: { id, companyId } });
      if (!transfer || transfer.status !== TransferStatus.REQUESTED) {
        throw new Error("Only REQUESTED transfers can be rejected");
      }

      const result = await tx.assetTransfer.update({
        where: { id, companyId },
        data: {
          status: TransferStatus.REJECTED,
          notes: `Rejected Reason: ${reason}`,
        },
      });

      await tx.activityLog.create({
        data: {
          companyId,
          userId,
          action: "TRANSFER_REJECTED",
          entity: "AssetTransfer",
          entityId: id,
          details: JSON.stringify({ reason }),
        },
      });

      return result;
    });
  }

  static async cancelTransfer(id: string, companyId: string, userId: string) {
    return await db.$transaction(async (tx) => {
      const transfer = await tx.assetTransfer.findUnique({ where: { id, companyId } });
      if (!transfer) throw new Error("Transfer not found");

      const allowedStatuses: TransferStatus[] = [TransferStatus.REQUESTED, TransferStatus.APPROVED];
      if (!allowedStatuses.includes(transfer.status)) {
        throw new Error(`Cannot cancel transfer in ${transfer.status} status`);
      }

      const result = await tx.assetTransfer.update({
        where: { id, companyId },
        data: {
          status: TransferStatus.CANCELLED,
        },
      });

      await tx.activityLog.create({
        data: {
          companyId,
          userId,
          action: "TRANSFER_CANCELLED",
          entity: "AssetTransfer",
          entityId: id,
        },
      });

      return result;
    });
  }

  static async getTransfers(companyId: string, filters?: { status?: TransferStatus; assetId?: string }) {
    return await db.assetTransfer.findMany({
      where: {
        companyId,
        ...(filters?.status && { status: filters.status }),
        ...(filters?.assetId && { assetId: filters.assetId }),
      },
      include: {
        asset: true,
        fromLocation: true,
        toLocation: true,
        fromEmployee: true,
        toEmployee: true,
        requestedBy: { select: { name: true, email: true } },
        approvedBy: { select: { name: true, email: true } },
        completedBy: { select: { name: true, email: true } },
      },
      orderBy: { requestedAt: "desc" },
    });
  }

  static async getAssetTransferHistory(assetId: string, companyId: string) {
    return await db.assetTransfer.findMany({
      where: { assetId, companyId },
      include: {
        fromLocation: true,
        toLocation: true,
        fromEmployee: true,
        toEmployee: true,
        requestedBy: { select: { name: true } },
        completedBy: { select: { name: true } },
      },
      orderBy: { requestedAt: "desc" },
    });
  }
}
