"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import * as xlsx from "xlsx";
import { ImportResult, ImportResultRow } from "@/components/ui/import-modal";

export async function importInventory(formData: FormData): Promise<{ success: boolean; result?: ImportResult; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.activeCompanyId) {
      return { success: false, error: "Unauthorized or missing company context" };
    }
    const companyId = session.user.activeCompanyId;
    const userId = session.user.id;

    const file = formData.get("file") as File;
    if (!file) {
      return { success: false, error: "No file provided" };
    }

    const buffer = await file.arrayBuffer();
    const workbook = xlsx.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    
    // Read raw JSON data
    const rawData = xlsx.utils.sheet_to_json(sheet, { defval: "" }) as any[];
    
    if (!rawData || rawData.length === 0) {
      return { success: false, error: "The provided Excel file is empty" };
    }

    // Pre-fetch masters
    const [categories, units, locations, existingItems] = await Promise.all([
      db.inventoryCategory.findMany({ where: { companyId } }),
      db.unitOfMeasure.findMany({ where: { companyId } }),
      db.inventoryLocation.findMany({ where: { companyId } }),
      db.inventoryItem.findMany({ where: { companyId }, select: { sku: true } })
    ]);

    const categoryMap = new Map(categories.filter(c => c.isActive).map(c => [c.name.toLowerCase(), c.id]));
    const unitMap = new Map(units.filter(u => u.isActive).map(u => [u.symbol.toLowerCase(), u.id]));
    const locationMap = new Map(locations.filter(l => l.isActive).map(l => [l.name.toLowerCase(), l.id]));
    const existingSkus = new Set(existingItems.map(i => i.sku.toLowerCase()));

    const results: ImportResultRow[] = [];
    let successCount = 0;
    let skippedCount = 0;
    let failedCount = 0;

    const pendingInserts: any[] = [];

    // Parse each row
    for (let i = 0; i < rawData.length; i++) {
      const row = rawData[i];
      const rowNum = i + 2; // header is row 1
      
      const sku = String(row["SKU"] || "").trim();
      const name = String(row["Item Name"] || "").trim();
      
      if (!sku || !name) {
        results.push({ rowNumber: rowNum, status: "failed", reason: "Missing required fields (SKU, Item Name)" });
        failedCount++;
        continue;
      }

      if (existingSkus.has(sku.toLowerCase())) {
        results.push({ rowNumber: rowNum, status: "skipped", reason: `SKU '${sku}' already exists` });
        skippedCount++;
        continue;
      }

      let categoryId = null;
      if (row["Category"]) {
        categoryId = categoryMap.get(String(row["Category"]).trim().toLowerCase());
        if (!categoryId) {
            results.push({ rowNumber: rowNum, status: "failed", reason: `Category '${row["Category"]}' does not exist or is inactive` });
            failedCount++;
            continue;
        }
      }

      let unitId = null;
      if (row["Unit"]) {
        // match by symbol, user might type 'pcs'
        unitId = unitMap.get(String(row["Unit"]).trim().toLowerCase());
        if (!unitId) {
            results.push({ rowNumber: rowNum, status: "failed", reason: `Unit '${row["Unit"]}' does not exist or is inactive (ensure you use the Unit Symbol)` });
            failedCount++;
            continue;
        }
      }

      let defaultLocationId = null;
      if (row["Default Location"]) {
        defaultLocationId = locationMap.get(String(row["Default Location"]).trim().toLowerCase());
        if (!defaultLocationId) {
            results.push({ rowNumber: rowNum, status: "failed", reason: `Location '${row["Default Location"]}' does not exist or is inactive` });
            failedCount++;
            continue;
        }
      }

      let itemTypeRaw = String(row["Item Type"] || "").trim().toUpperCase();
      const validTypes = ["CONSUMABLE", "SPARE", "TOOL", "OTHER"];
      let itemType: any = "CONSUMABLE";
      if (itemTypeRaw) {
          if (!validTypes.includes(itemTypeRaw)) {
              results.push({ rowNumber: rowNum, status: "failed", reason: `Invalid Item Type '${itemTypeRaw}'. Must be one of: ${validTypes.join(', ')}` });
              failedCount++;
              continue;
          }
          itemType = itemTypeRaw;
      }

      let statusRaw = String(row["Status"] || "").trim().toUpperCase();
      const validStatuses = ["ACTIVE", "INACTIVE"];
      let status: any = "ACTIVE";
      if (statusRaw) {
          if (!validStatuses.includes(statusRaw)) {
              results.push({ rowNumber: rowNum, status: "failed", reason: `Invalid Status '${statusRaw}'. Must be one of: ${validStatuses.join(', ')}` });
              failedCount++;
              continue;
          }
          status = statusRaw;
      }

      const description = String(row["Description"] || "").trim() || null;
      const minStockLevel = parseInt(row["Min Stock Level"]) || 0;
      const reorderLevel = parseInt(row["Reorder Level"]) || 0;
      
      let initialQuantity = 0;
      let unitCost = null;

      if (row["Initial Quantity"] !== "" && row["Initial Quantity"] !== undefined && row["Initial Quantity"] !== null) {
          initialQuantity = parseInt(row["Initial Quantity"]);
          if (isNaN(initialQuantity)) {
              results.push({ rowNumber: rowNum, status: "failed", reason: `Invalid Initial Quantity value` });
              failedCount++;
              continue;
          }
          if (initialQuantity < 0) {
              results.push({ rowNumber: rowNum, status: "failed", reason: `Initial Quantity cannot be negative` });
              failedCount++;
              continue;
          }
          
          if (initialQuantity > 0 && !defaultLocationId) {
              results.push({ rowNumber: rowNum, status: "failed", reason: `Default Location is required when providing an Initial Quantity` });
              failedCount++;
              continue;
          }
      }

      if (row["Unit Cost"] !== "" && row["Unit Cost"] !== undefined && row["Unit Cost"] !== null) {
          unitCost = parseFloat(row["Unit Cost"]);
          if (isNaN(unitCost)) {
              results.push({ rowNumber: rowNum, status: "failed", reason: `Invalid Unit Cost value` });
              failedCount++;
              continue;
          }
      }

      pendingInserts.push({
          rowNum,
          itemData: {
              companyId,
              createdById: userId,
              sku,
              name,
              description,
              categoryId,
              unitId,
              defaultLocationId,
              minStockLevel,
              reorderLevel,
              itemType,
              status
          },
          initialQuantity,
          unitCost
      });
    }

    if (pendingInserts.length > 0) {
      // Execute transaction to insert valid rows atomically.
      // Because we need to create related balance and transactions, we use standard loops in a TX 
      // or Prisma's nested create.
      try {
         await db.$transaction(async (tx) => {
             for (const insert of pendingInserts) {
                 const item = await tx.inventoryItem.create({
                     data: insert.itemData
                 });

                 if (insert.initialQuantity > 0 && insert.itemData.defaultLocationId) {
                     // create transaction
                     await tx.inventoryTransaction.create({
                         data: {
                             companyId,
                             itemId: item.id,
                             locationId: insert.itemData.defaultLocationId,
                             direction: "IN",
                             movementType: "OPENING_STOCK",
                             quantity: insert.initialQuantity,
                             unitCost: insert.unitCost,
                             balanceAfter: insert.initialQuantity,
                             notes: "Initial import",
                             createdById: userId
                         }
                     });
                     // create balance
                     await tx.inventoryBalance.create({
                         data: {
                             companyId,
                             itemId: item.id,
                             locationId: insert.itemData.defaultLocationId,
                             quantityOnHand: insert.initialQuantity,
                             availableQty: insert.initialQuantity,
                             reservedQty: 0
                         }
                     });
                 }
                 
                 results.push({ rowNumber: insert.rowNum, status: "success" });
                 successCount++;
             }
         });
      } catch (e: any) {
         // if the entire transaction failed, mark all pending as failed
         pendingInserts.forEach(r => {
             results.push({ rowNumber: r.rowNum, status: "failed", reason: `Database insertion failed: ${e.message}` });
             failedCount++;
         });
      }
    }

    return {
      success: true,
      result: {
        totalRows: rawData.length,
        successCount,
        skippedCount,
        failedCount,
        rows: results.sort((a,b) => a.rowNumber - b.rowNumber)
      }
    };
  } catch (error: any) {
    console.error("Inventory import error:", error);
    return { success: false, error: error.message || "Failed to process import." };
  }
}
