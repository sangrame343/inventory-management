import { db } from "@/lib/db";
import { Location, Prisma } from "@prisma/client";

export type LocationTree = (Location & {
  children: LocationTree[];
  _count?: {
    assets: number;
    employees: number;
    children?: number;
  };
});

export class LocationService {
  static async getLocations(companyId: string, isActive?: boolean) {
    return await db.location.findMany({
      where: { 
        companyId,
        ...(isActive !== undefined ? { isActive } : {})
      },
      include: {
        _count: {
          select: {
            assets: true,
            employees: true,
            children: true,
          }
        },
        parent: {
          select: {
            id: true,
            name: true,
          }
        }
      },
      orderBy: { name: "asc" },
    });
  }

  static async getLocationTree(companyId: string): Promise<LocationTree[]> {
    const locations = await db.location.findMany({
      where: { companyId },
      include: {
        _count: {
          select: {
            assets: true,
            employees: true,
          }
        }
      },
      orderBy: { name: "asc" },
    });

    const buildTree = (parentId: string | null = null): LocationTree[] => {
      // Cast to any for the filter to avoid complex Prisma intersection type mismatches in a narrow scope
      return (locations as any[])
        .filter((loc) => loc.parentLocationId === parentId)
        .map((loc) => ({
          ...loc,
          children: buildTree(loc.id),
        }));
    };

    return buildTree(null);
  }

  static async getLocationById(id: string, companyId: string) {
    const location = await db.location.findUnique({
      where: { id },
      include: {
        parent: {
          select: {
            id: true,
            name: true,
            parent: true,
          }
        },
        _count: {
          select: {
            assets: true,
            employees: true,
            children: true,
          }
        }
      },
    });

    if (!location || location.companyId !== companyId) return null;
    return location;
  }

  static async getBreadcrumbs(id: string, companyId: string) {
    const breadcrumbs: { id: string; name: string }[] = [];
    let currentId: string | null = id;

    while (currentId) {
      const loc = await db.location.findUnique({
        where: { id: currentId },
        select: { id: true, name: true, parentLocationId: true, companyId: true },
      });

      if (!loc || loc.companyId !== companyId) break;
      breadcrumbs.unshift({ id: loc.id, name: loc.name });
      currentId = loc.parentLocationId;
    }

    return breadcrumbs;
  }

  static async createLocation(data: Prisma.LocationUncheckedCreateInput, companyId: string) {
    // Normalize data: convert empty strings to null for optional relations and unique fields
    const parentId = data.parentLocationId === "" ? null : data.parentLocationId;
    const code = data.code === "" ? null : data.code;
    const description = data.description === "" ? null : data.description;

    if (parentId) {
      const parent = await db.location.findUnique({
        where: { id: parentId },
      });
      if (!parent || parent.companyId !== companyId) {
        throw new Error("Parent location must belong to the same company.");
      }
    }

    return await db.location.create({
      data: {
        ...data,
        parentLocationId: parentId,
        code,
        description,
        companyId,
      },
    });
  }

  static async updateLocation(id: string, companyId: string, data: Prisma.LocationUncheckedUpdateInput) {
    if (data.parentLocationId === id) {
      throw new Error("A location cannot be its own parent.");
    }

    if (data.parentLocationId && typeof data.parentLocationId === 'string') {
      const parent = await db.location.findUnique({
        where: { id: data.parentLocationId },
      });
      if (!parent || parent.companyId !== companyId) {
        throw new Error("Parent location must belong to the same company.");
      }

      const isDescendant = await this.isDescendant(id, data.parentLocationId, companyId);
      if (isDescendant) {
        throw new Error("Cyclic hierarchy detected. A parent cannot be a child of its own descendant.");
      }
    }

    // Verify ownership before update
    const existing = await db.location.findUnique({ where: { id } });
    if (!existing || existing.companyId !== companyId) {
      throw new Error("Location not found or access denied.");
    }

    return await db.location.update({
      where: { id },
      data,
    });
  }

  private static async isDescendant(parentId: string, potentialChildId: string, companyId: string): Promise<boolean> {
    const children = await db.location.findMany({
      where: { parentLocationId: parentId, companyId },
      select: { id: true },
    });

    for (const child of children) {
      if (child.id === potentialChildId) return true;
      if (await this.isDescendant(child.id, potentialChildId, companyId)) return true;
    }

    return false;
  }

  static async getSubtreeIds(rootId: string, companyId: string): Promise<string[]> {
    const ids = [rootId];
    const children = await db.location.findMany({
      where: { parentLocationId: rootId, companyId },
      select: { id: true },
    });

    for (const child of children) {
      const childSubtree = await this.getSubtreeIds(child.id, companyId);
      ids.push(...childSubtree);
    }

    return ids;
  }

  static async deactivateLocation(id: string, companyId: string) {
    const loc = await db.location.findUnique({
      where: { id },
    });

    if (!loc || loc.companyId !== companyId) throw new Error("Location not found.");

    // Explicit counts for active dependencies to ensure safe deactivation
    const [activeChildrenCount, activeAssetsCount, activeEmployeesCount] = await Promise.all([
      db.location.count({ where: { parentLocationId: id, isActive: true } }),
      db.asset.count({ where: { locationId: id, status: { not: 'DISPOSED' } } }),
      db.employee.count({ where: { locationId: id, status: 'ACTIVE' } }),
    ]);

    if (activeChildrenCount > 0) {
      throw new Error("Cannot deactivate a location with active child locations.");
    }
    if (activeAssetsCount > 0) {
      throw new Error("Cannot deactivate a location with active assets. Reassign them first.");
    }
    if (activeEmployeesCount > 0) {
      throw new Error("Cannot deactivate a location with active staff. Reassign them first.");
    }

    return await db.location.update({
      where: { id },
      data: { isActive: false },
    });
  }

  static async hardDeleteLocation(id: string, companyId: string) {
    const loc = await db.location.findUnique({
      where: { id },
    });

    if (!loc || loc.companyId !== companyId) throw new Error("Location not found.");
    if (loc.isActive) throw new Error("Only deactivated locations can be permanently deleted.");

    // Absolute dependency checks (including inactive/historical records)
    const [childrenCount, assetsCount, employeesCount, transfersFromCount, transfersToCount] = await Promise.all([
      db.location.count({ where: { parentLocationId: id } }),
      db.asset.count({ where: { locationId: id } }),
      db.employee.count({ where: { locationId: id } }),
      db.assetTransfer.count({ where: { fromLocationId: id } }),
      db.assetTransfer.count({ where: { toLocationId: id } }),
    ]);

    if (childrenCount > 0) {
      throw new Error("Cannot delete a location that still has child nodes. Delete children first.");
    }
    if (assetsCount > 0 || employeesCount > 0 || transfersFromCount > 0 || transfersToCount > 0) {
      throw new Error("Cannot delete permanently: Historical data (assets, staff, or transfers) is still linked to this site for audit purposes. Keep it deactivated instead.");
    }

    return await db.location.delete({
      where: { id },
    });
  }
}
