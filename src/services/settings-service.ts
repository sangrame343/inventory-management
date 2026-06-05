import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { unstable_cache, revalidateTag } from "next/cache";

export class SettingsService {
  static async getSettings(companyId: string) {
    return unstable_cache(
      async () => {
        let settings = await db.companySettings.findUnique({
          where: { companyId },
        });

        if (!settings) {
          settings = await db.companySettings.create({
            data: {
              companyId,
              assetCodePrefix: "ASSET",
              currency: "INR",
              dateFormat: "DD-MM-YYYY",
              maintenanceReminderDays: 7,
              requireTransferApproval: true,
              requireMaintenanceApproval: false,
              autoGenerateAssetCode: true,
            },
          });
        }

        return settings;
      },
      [`settings-${companyId}`],
      { tags: [`settings-${companyId}`] }
    )();
  }

  static async updateSettings(companyId: string, data: Prisma.CompanySettingsUncheckedUpdateInput) {
    const res = await db.companySettings.update({
      where: { companyId },
      data,
    });
    revalidateTag(`settings-${companyId}`, 'max');
    return res;
  }

  // Master Data: Departments
  static async getDepartments(companyId: string, isActive?: boolean) {
    return unstable_cache(
      async () => {
        return await db.department.findMany({
          where: { 
            companyId,
            ...(isActive !== undefined ? { isActive } : {})
          },
          orderBy: { name: "asc" },
        });
      },
      [`departments-${companyId}-${isActive}`],
      { tags: [`departments-${companyId}`] }
    )();
  }

  static async updateDepartment(id: string, companyId: string, data: Prisma.DepartmentUncheckedUpdateInput) {
    const res = await db.department.update({
      where: { id, companyId },
      data,
    });
    revalidateTag(`departments-${companyId}`, 'max');
    return res;
  }

  // Master Data: Asset Categories
  static async getAssetCategories(companyId: string, isActive?: boolean) {
    return unstable_cache(
      async () => {
        return await db.assetCategory.findMany({
          where: { 
            companyId,
            ...(isActive !== undefined ? { isActive } : {})
          },
          orderBy: { name: "asc" },
        });
      },
      [`asset-categories-${companyId}-${isActive}`],
      { tags: [`asset-categories-${companyId}`] }
    )();
  }

  static async updateAssetCategory(id: string, companyId: string, data: Prisma.AssetCategoryUncheckedUpdateInput) {
    const res = await db.assetCategory.update({
      where: { id, companyId },
      data,
    });
    revalidateTag(`asset-categories-${companyId}`, 'max');
    return res;
  }

  // Master Data: Vendors
  static async getVendors(companyId: string, isActive?: boolean) {
    return unstable_cache(
      async () => {
        return await db.vendor.findMany({
          where: { 
            companyId,
            ...(isActive !== undefined ? { isActive } : {})
          },
          orderBy: { name: "asc" },
        });
      },
      [`vendors-${companyId}-${isActive}`],
      { tags: [`vendors-${companyId}`] }
    )();
  }

  static async updateVendor(id: string, companyId: string, data: Prisma.VendorUncheckedUpdateInput) {
    const res = await db.vendor.update({
      where: { id, companyId },
      data,
    });
    revalidateTag(`vendors-${companyId}`, 'max');
    return res;
  }

  // Master Data: Inventory Categories
  static async getInventoryCategories(companyId: string, isActive?: boolean) {
    return unstable_cache(
      async () => {
        return await db.inventoryCategory.findMany({
          where: { 
            companyId,
            ...(isActive !== undefined ? { isActive } : {})
          },
          orderBy: { name: "asc" },
        });
      },
      [`inventory-categories-${companyId}-${isActive}`],
      { tags: [`inventory-categories-${companyId}`] }
    )();
  }

  // Master Data: Units of Measure
  static async getUnitsOfMeasure(companyId: string, isActive?: boolean) {
    return unstable_cache(
      async () => {
        return await db.unitOfMeasure.findMany({
          where: { 
            companyId,
            ...(isActive !== undefined ? { isActive } : {})
          },
          orderBy: { name: "asc" },
        });
      },
      [`units-of-measure-${companyId}-${isActive}`],
      { tags: [`units-of-measure-${companyId}`] }
    )();
  }

  // Master Data: Inventory Locations
  static async getInventoryLocations(companyId: string, isActive?: boolean) {
    return unstable_cache(
      async () => {
        return await db.inventoryLocation.findMany({
          where: { 
            companyId,
            ...(isActive !== undefined ? { isActive } : {})
          },
          orderBy: { name: "asc" },
        });
      },
      [`inventory-locations-${companyId}-${isActive}`],
      { tags: [`inventory-locations-${companyId}`] }
    )();
  }

  // Standardized Two-Step Deletion Flow
  static async processMasterItemDeletion(model: 'department' | 'assetCategory' | 'vendor' | 'inventoryCategory' | 'unitOfMeasure' | 'inventoryLocation', id: string, companyId: string) {
    const dbModel: any = db[model];
    if (!dbModel) throw new Error(`Model ${model} not found in database.`);

    const existing = await dbModel.findUnique({ where: { id, companyId } });
    if (!existing) throw new Error("Item not found.");

    if (existing.isActive) {
      // Step 1: DEACTIVATE (Soft-Delete)
      let usage: { label: string; count: number }[] = [];
      
      switch (model) {
        case 'department':
          const deptAssets = await db.asset.count({ where: { departmentId: id, companyId } });
          const deptEmployees = await db.employee.count({ where: { departmentId: id, companyId } });
          if (deptAssets > 0) usage.push({ label: 'assets', count: deptAssets });
          if (deptEmployees > 0) usage.push({ label: 'employees', count: deptEmployees });
          break;
        case 'assetCategory':
          const catAssets = await db.asset.count({ where: { categoryId: id, companyId } });
          if (catAssets > 0) usage.push({ label: 'assets', count: catAssets });
          break;
        case 'vendor':
          const vendorAssets = await db.asset.count({ where: { vendorId: id, companyId } });
          const vendorTickets = await db.maintenanceTicket.count({ where: { vendorId: id, companyId } });
          if (vendorAssets > 0) usage.push({ label: 'assets', count: vendorAssets });
          if (vendorTickets > 0) usage.push({ label: 'maintenance tickets', count: vendorTickets });
          break;
        case 'inventoryCategory':
          const invCatItems = await db.inventoryItem.count({ where: { categoryId: id, companyId } });
          if (invCatItems > 0) usage.push({ label: 'inventory items', count: invCatItems });
          break;
        case 'unitOfMeasure':
          const uomItems = await db.inventoryItem.count({ where: { unitId: id, companyId } });
          if (uomItems > 0) usage.push({ label: 'inventory items', count: uomItems });
          break;
        case 'inventoryLocation':
          const locItems = await db.inventoryItem.count({ where: { defaultLocationId: id, companyId } });
          const locBalances = await db.inventoryBalance.count({ where: { locationId: id, companyId } });
          if (locItems > 0) usage.push({ label: 'default item locations', count: locItems });
          if (locBalances > 0) usage.push({ label: 'stock balances', count: locBalances });
          break;
      }

      if (usage.length > 0) {
        const reasons = usage.map(u => `${u.count} ${u.label}`).join(', ');
        throw new Error(`Usage Blocked: This item is currently linked to ${reasons}. Reassign these records before deactivating.`);
      }

      const tagMap = {
        department: 'departments',
        assetCategory: 'asset-categories',
        vendor: 'vendors',
        inventoryCategory: 'inventory-categories',
        unitOfMeasure: 'units-of-measure',
        inventoryLocation: 'inventory-locations'
      } as const;

      const res = await dbModel.update({ where: { id, companyId }, data: { isActive: false } });
      revalidateTag(`${tagMap[model]}-${companyId}`, 'max');
      return res;
    } else {
      // Step 2: HARD DELETE (Purge)
      // Exhaustive check including historical/archived dependencies
      let dependencies: string[] = [];
      
      switch (model) {
        case 'department':
          const [dAssets, dEmployees] = await Promise.all([
            db.asset.count({ where: { departmentId: id } }),
            db.employee.count({ where: { departmentId: id } }),
          ]);
          if (dAssets > 0 || dEmployees > 0) dependencies.push("historical asset or staff allocation");
          break;
        case 'assetCategory':
          const cAssets = await db.asset.count({ where: { categoryId: id } });
          if (cAssets > 0) dependencies.push("historical asset records");
          break;
        case 'vendor':
          const [vAssets, vTickets] = await Promise.all([
            db.asset.count({ where: { vendorId: id } }),
            db.maintenanceTicket.count({ where: { vendorId: id } }),
          ]);
          if (vAssets > 0 || vTickets > 0) dependencies.push("historical asset purchases or repair tickets");
          break;
        case 'inventoryCategory':
          const iItems = await db.inventoryItem.count({ where: { categoryId: id } });
          if (iItems > 0) dependencies.push("historical inventory definitions");
          break;
        case 'unitOfMeasure':
          const iUoms = await db.inventoryItem.count({ where: { unitId: id } });
          if (iUoms > 0) dependencies.push("historical inventory stock units");
          break;
        case 'inventoryLocation':
          const [lItems, lBalances, lTrans, lAdj] = await Promise.all([
            db.inventoryItem.count({ where: { defaultLocationId: id } }),
            db.inventoryBalance.count({ where: { locationId: id } }),
            db.inventoryTransaction.count({ where: { locationId: id } }),
            db.inventoryAdjustment.count({ where: { locationId: id } }),
          ]);
          if (lItems > 0 || lBalances > 0 || lTrans > 0 || lAdj > 0) dependencies.push("historical stock movements or balances");
          break;
      }

      if (dependencies.length > 0) {
        throw new Error(`Permanent Deletion Blocked: Historical data (${dependencies.join(', ')}) is linked to this item for audit purposes. Keep it deactivated instead.`);
      }

      const tagMap = {
        department: 'departments',
        assetCategory: 'asset-categories',
        vendor: 'vendors',
        inventoryCategory: 'inventory-categories',
        unitOfMeasure: 'units-of-measure',
        inventoryLocation: 'inventory-locations'
      } as const;

      const res = await dbModel.delete({ where: { id, companyId } });
      revalidateTag(`${tagMap[model]}-${companyId}`, 'max');
      return res;
    }
  }

}
