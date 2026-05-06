import { db } from "@/lib/db";
import { 
  AssetStatus, 
  TicketStatus, 
  MaintenanceType, 
  Prisma 
} from "@prisma/client";

export class MaintenanceService {
  /**
   * Sync asset status based on ticket status transitions.
   */
  private static async syncAssetStatus(
    tx: Prisma.TransactionClient,
    assetId: string,
    ticketStatus: TicketStatus,
    companyId: string
  ) {
    const asset = await tx.asset.findUnique({
      where: { id: assetId },
      include: {
        assignments: {
          where: { returnedAt: null },
          take: 1
        }
      }
    });

    if (!asset) return;

    let nextStatus: AssetStatus = asset.status;

    if (ticketStatus === TicketStatus.IN_PROGRESS) {
      nextStatus = AssetStatus.REPAIR;
    } else if (
      ticketStatus === TicketStatus.RESOLVED || 
      ticketStatus === TicketStatus.CLOSED
    ) {
      // If it has an active assignment, it should be ASSIGNED, else ACTIVE
      nextStatus = asset.assignments.length > 0 ? AssetStatus.ASSIGNED : AssetStatus.ACTIVE;
    }

    if (nextStatus !== asset.status) {
      await tx.asset.update({
        where: { id: assetId },
        data: { status: nextStatus }
      });

      await tx.activityLog.create({
        data: {
          companyId,
          action: "SYSTEM_SYNC_ASSET_STATUS",
          entity: "Asset",
          entityId: assetId,
          details: `Synced asset status to ${nextStatus} due to maintenance ticket update.`
        }
      });
    }
  }

  static async createTicket(
    data: Omit<Prisma.MaintenanceTicketUncheckedCreateInput, "companyId" | "createdById">, 
    companyId: string, 
    userId: string
  ) {
    return await db.$transaction(async (tx) => {
      const ticket = await tx.maintenanceTicket.create({
        data: {
          ...data,
          companyId,
          createdById: userId,
        },
      });

      await tx.activityLog.create({
        data: {
          companyId,
          userId,
          action: "CREATE_MAINTENANCE_TICKET",
          entity: "MaintenanceTicket",
          entityId: ticket.id,
          details: JSON.stringify({ title: ticket.title, assetId: ticket.assetId }),
        },
      });

      // Trigger status sync if created in a status other than OPEN (e.g. directly IN_PROGRESS)
      await this.syncAssetStatus(tx, ticket.assetId, ticket.status, companyId);

      return ticket;
    });
  }

  static async updateTicket(
    id: string, 
    data: Omit<Prisma.MaintenanceTicketUncheckedUpdateInput, "companyId">, 
    companyId: string, 
    userId: string
  ) {
    return await db.$transaction(async (tx) => {
      const ticket = await tx.maintenanceTicket.update({
        where: { id },
        data,
      });

      await tx.activityLog.create({
        data: {
          companyId,
          userId,
          action: "UPDATE_MAINTENANCE_TICKET",
          entity: "MaintenanceTicket",
          entityId: ticket.id,
          details: JSON.stringify({ status: ticket.status, type: ticket.type }),
        },
      });

      // Sync asset status
      await this.syncAssetStatus(tx, ticket.assetId, ticket.status, companyId);

      return ticket;
    });
  }

  static async getTickets(companyId: string, filters: Prisma.MaintenanceTicketWhereInput = {}) {
    return await db.maintenanceTicket.findMany({
      where: {
        companyId,
        ...filters,
      },
      include: {
        asset: true,
        createdBy: { select: { id: true, name: true, email: true } },
        assignedTo: { select: { id: true, name: true, email: true } },
        vendor: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  static async createSchedule(
    data: Omit<Prisma.MaintenanceScheduleUncheckedCreateInput, "companyId">, 
    companyId: string, 
    userId: string
  ) {
    const schedule = await db.maintenanceSchedule.create({
      data: {
        ...data,
        companyId,
      },
    });

    await db.activityLog.create({
      data: {
        companyId,
        userId,
        action: "CREATE_MAINTENANCE_SCHEDULE",
        entity: "MaintenanceSchedule",
        entityId: schedule.id,
        details: JSON.stringify({ title: schedule.title, frequency: schedule.frequencyDays }),
      },
    });

    return schedule;
  }

  static async getSchedules(companyId: string) {
    return await db.maintenanceSchedule.findMany({
      where: { companyId },
      include: {
        asset: true,
      },
      orderBy: { nextDueDate: "asc" },
    });
  }

  /**
   * Manually generate tickets for maintenance schedules that are due or overdue.
   */
  static async generateTicketsFromSchedules(companyId: string, userId: string) {
    const now = new Date();
    const dueSchedules = await db.maintenanceSchedule.findMany({
      where: {
        companyId,
        isActive: true,
        nextDueDate: { lte: now },
      },
    });

    const generatedTickets = [];

    for (const schedule of dueSchedules) {
      const ticket = await this.createTicket({
        assetId: schedule.assetId,
        title: `Scheduled Maintenance: ${schedule.title}`,
        description: schedule.description || "Auto-generated from schedule.",
        type: MaintenanceType.PREVENTIVE,
        status: TicketStatus.OPEN,
        scheduledDate: schedule.nextDueDate,
      }, companyId, userId);

      // Update schedule's next due date
      const nextDue = new Date(now);
      nextDue.setDate(nextDue.getDate() + schedule.frequencyDays);

      await db.maintenanceSchedule.update({
        where: { id: schedule.id },
        data: {
          lastMaintenanceDate: now,
          nextDueDate: nextDue,
        }
      });

      generatedTickets.push(ticket);
    }

    return generatedTickets;
  }
}
