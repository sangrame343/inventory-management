import { db } from "@/lib/db";
import { startOfMonth } from "date-fns";
import { AssetStatus, TicketStatus, TicketPriority, TransferStatus } from "@prisma/client";

export async function getDashboardStats(companyId: string) {
  const now = new Date();
  const startOfCurrMonth = startOfMonth(now);

  const [
    assetCounts,
    employeeCounts,
    ticketCounts,
    inventoryCounts,
    transferCounts,
    maintenanceSchedules,
  ] = await Promise.all([
    // Assets
    db.asset.groupBy({
      by: ["status"],
      where: { companyId },
      _count: { id: true },
    }),

    // Employees
    Promise.all([
      db.employee.count({ where: { companyId } }),
      db.employee.count({ where: { companyId, status: "ACTIVE" } }),
      db.employee.count({
        where: {
          companyId,
          assignments: { some: { returnedAt: null } },
        },
      }),
    ]),

    // Maintenance Tickets
    Promise.all([
      db.maintenanceTicket.count({ where: { companyId, status: TicketStatus.OPEN } }),
      db.maintenanceTicket.count({ where: { companyId, status: TicketStatus.IN_PROGRESS } }),
      db.maintenanceTicket.count({
        where: {
          companyId,
          priority: { in: [TicketPriority.CRITICAL, TicketPriority.HIGH] },
          status: { in: [TicketStatus.OPEN, TicketStatus.IN_PROGRESS] },
        },
      }),
    ]),

    // Inventory
    Promise.all([
      db.inventoryItem.count({ where: { companyId } }),
      db.inventoryItem.count({ where: { companyId, status: "INACTIVE" } }),
      // Low Stock: sum(quantityOnHand) <= minStockLevel
      db.inventoryItem.findMany({
        where: { companyId, status: "ACTIVE" },
        select: {
          id: true,
          minStockLevel: true,
          balances: {
            select: {
              quantityOnHand: true,
            },
          },
        },
      }),
    ]),

    // Transfers
    Promise.all([
      db.assetTransfer.count({
        where: { companyId, status: { in: [TransferStatus.REQUESTED, TransferStatus.APPROVED] } },
      }),
      db.assetTransfer.count({
        where: { companyId, status: TransferStatus.IN_TRANSIT },
      }),
      db.assetTransfer.count({
        where: {
          companyId,
          status: TransferStatus.COMPLETED,
          completedAt: { gte: startOfCurrMonth },
        },
      }),
    ]),

    // Maintenance Schedules (for upcoming/overdue counts)
    db.maintenanceSchedule.findMany({
      where: { companyId, isActive: true },
      select: {
        id: true,
        title: true,
        nextDueDate: true,
        asset: {
          select: {
            name: true,
          },
        },
      },
    }),
  ]);

  // Process Asset Counts
  const assets = {
    total: assetCounts.reduce((acc, curr) => acc + curr._count.id, 0),
    active: assetCounts.find((c) => c.status === AssetStatus.ACTIVE)?._count.id || 0,
    assigned: assetCounts.find((c) => c.status === AssetStatus.ASSIGNED)?._count.id || 0,
    repair: assetCounts.find((c) => c.status === AssetStatus.REPAIR)?._count.id || 0,
    disposed: assetCounts
      .filter((c) => c.status === AssetStatus.DISPOSED || c.status === AssetStatus.LOST)
      .reduce((acc, curr) => acc + curr._count.id, 0),
  };

  // Process Inventory Low Stock
  const lowStockItemsCount = inventoryCounts[2].filter((item) => {
    const totalQty = item.balances.reduce((acc, b) => acc + b.quantityOnHand, 0);
    return totalQty <= item.minStockLevel;
  }).length;

  // Process Maintenance Urgency
  const maintenance = {
    open: ticketCounts[0],
    inProgress: ticketCounts[1],
    critical: ticketCounts[2],
    overdue: maintenanceSchedules.filter((s) => s.nextDueDate <= now).length,
    upcoming: maintenanceSchedules.filter((s) => s.nextDueDate > now).length,
  };

  return {
    assets,
    employees: {
      total: employeeCounts[0],
      active: employeeCounts[1],
      withAssets: employeeCounts[2],
    },
    maintenance,
    inventory: {
      total: inventoryCounts[0],
      inactive: inventoryCounts[1],
      lowStock: lowStockItemsCount,
    },
    transfers: {
      pending: transferCounts[0],
      inTransit: transferCounts[1],
      completedThisMonth: transferCounts[2],
    },
    upcomingSchedules: maintenanceSchedules,
  };
}

export async function getDashboardCharts(companyId: string) {
  const [statusDistribution, categories] = await Promise.all([
    db.asset.groupBy({
      by: ["status"],
      where: { companyId },
      _count: { id: true },
    }),
    db.assetCategory.findMany({
      where: { companyId },
      select: {
        name: true,
        _count: {
          select: { assets: true },
        },
      },
    }),
  ]);

  return {
    statusDistribution: statusDistribution.map((d) => ({
      name: d.status,
      value: d._count.id,
    })),
    categoryDistribution: categories
      .map((c) => ({
        name: c.name,
        value: c._count.assets,
      }))
      .filter((c) => c.value > 0),
  };
}

export async function getRecentActivity(companyId: string, limit = 10) {
  return db.activityLog.findMany({
    where: { companyId },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      action: true,
      entity: true,
      details: true,
      createdAt: true,
      user: {
        select: {
          name: true,
        },
      },
    },
  });
}
