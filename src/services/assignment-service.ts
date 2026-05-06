import { db } from "@/lib/db";
import { AssetStatus, FunctionalStatus, PhysicalCondition, HandoverType, Prisma } from "@prisma/client";

export class AssignmentService {
  static async assignAsset(
    assetId: string,
    companyId: string,
    data: {
      employeeId?: string;
      departmentId?: string;
      userId?: string;
      assignedById: string;
      handoverDate?: Date;
      notes?: string;
      handoverType?: HandoverType;
      physicalCondition?: PhysicalCondition;
      functionalStatus?: FunctionalStatus;
      locationId?: string;
    },
    prisma: Prisma.TransactionClient | typeof db = db
  ) {
    const logic = async (tx: Prisma.TransactionClient) => {
      // 1. Close any existing active assignment
      await tx.assetAssignment.updateMany({
        where: {
          assetId,
          companyId,
          returnedAt: null,
        },
        data: {
          returnedAt: new Date(),
          returnReason: "REASSIGNED",
          returnCondition: "SEE_NEXT_ASSIGNMENT",
        },
      });

      // 2. Create new assignment
      const transactionId = `TXN-${Date.now()}`;

      // Enforce exactly one target
      if (!data.employeeId && !data.departmentId) {
        throw new Error("Assignee (Employee or Department) is required");
      }
      if (data.employeeId && data.departmentId) {
        throw new Error("Cannot assign to both Employee and Department simultaneously");
      }

      // Resolve userId from employeeId if not provided
      let effectiveUserId: string | undefined = data.userId || undefined;
      if (!effectiveUserId && data.employeeId) {
        const employee = await tx.employee.findUnique({
          where: { id: data.employeeId },
          select: { userId: true },
        });
        effectiveUserId = employee?.userId || undefined;
      }

      const assignment = await tx.assetAssignment.create({
        data: {
          assetId,
          companyId,
          userId: effectiveUserId,
          employeeId: data.employeeId || null,
          departmentId: data.departmentId || null,
          assignedById: data.assignedById,
          transactionId,
          assignedAt: data.handoverDate || new Date(),
          handoverDate: data.handoverDate || null,
          notes: data.notes,
          handoverType: data.handoverType,
          physicalCondition: data.physicalCondition,
          functionalStatus: data.functionalStatus,
          locationId: data.locationId || null,
        },
      });

      // 3. Update asset status and condition
      await tx.asset.update({
        where: { id: assetId },
        data: { 
          status: AssetStatus.ASSIGNED,
          condition: data.physicalCondition || undefined,
          locationId: data.locationId || undefined,
        },
      });

      // 4. Log activity
      await tx.activityLog.create({
        data: {
          companyId,
          userId: data.assignedById,
          action: "ASSIGN_ASSET",
          entity: "Asset",
          entityId: assetId,
          details: JSON.stringify({
            assignmentId: assignment.id,
            employeeId: data.employeeId,
            departmentId: data.departmentId,
            userId: data.userId,
          }),
        },
      });

      return assignment;
    };

    if (prisma === db) {
      return await db.$transaction(logic);
    } else {
      return await logic(prisma as Prisma.TransactionClient);
    }
  }

  static async returnAsset(
    assetId: string,
    companyId: string,
    userId: string,
    data: {
      returnedAt?: Date;
      returnCondition?: string;
      returnReason?: string;
      notes?: string;
    },
    prisma: Prisma.TransactionClient | typeof db = db
  ) {
    const logic = async (tx: Prisma.TransactionClient) => {
      const activeAssignment = await tx.assetAssignment.findFirst({
        where: {
          assetId,
          companyId,
          returnedAt: null,
        },
      });

      if (!activeAssignment) {
        throw new Error("No active assignment found for this asset");
      }

      const assignment = await tx.assetAssignment.update({
        where: { id: activeAssignment.id },
        data: {
          returnedAt: data.returnedAt || new Date(),
          returnCondition: data.returnCondition,
          returnReason: data.returnReason,
          notes: data.notes,
        },
      });

      // Update asset status
      await tx.asset.update({
        where: { id: assetId },
        data: { status: AssetStatus.ACTIVE },
      });

      // Log activity
      await tx.activityLog.create({
        data: {
          companyId,
          userId,
          action: "RETURN_ASSET",
          entity: "Asset",
          entityId: assetId,
          details: JSON.stringify({
            assignmentId: assignment.id,
            returnReason: data.returnReason,
          }),
        },
      });

      return assignment;
    };

    if (prisma === db) {
      return await db.$transaction(logic);
    } else {
      return await logic(prisma as Prisma.TransactionClient);
    }
  }

  static async getActiveAssignment(assetId: string, companyId: string) {
    return await db.assetAssignment.findFirst({
      where: {
        assetId,
        companyId,
        returnedAt: null,
      },
      include: {
        employee: true,
        department: true,
        user: { select: { id: true, name: true, email: true } },
      },
    });
  }

  static async getAssignmentHistory(assetId: string, companyId: string) {
    return await db.assetAssignment.findMany({
      where: { assetId, companyId },
      include: {
        employee: true,
        department: true,
        user: { select: { id: true, name: true, email: true } },
        assignedBy: { select: { id: true, name: true } },
      },
      orderBy: { assignedAt: "desc" },
    });
  }
}
