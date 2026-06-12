"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import * as xlsx from "xlsx";
import { ImportResult, ImportResultRow } from "@/components/ui/import-modal";
import { generateAssetCode, generateAssetTag } from "@/lib/asset-utils";

export async function importAssets(formData: FormData): Promise<{ success: boolean; result?: ImportResult; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user?.activeCompanyId || !session.user.id) {
      return { success: false, error: "Unauthorized or missing company context" };
    }
    const companyId = session.user.activeCompanyId;
    const currentUserId = session.user.id;

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

    // Pre-fetch all necessary company data for validation to avoid N+1 queries during validation
    const [categories, departments, locations, vendors, existingAssets, employees, settings, company] = await Promise.all([
      db.assetCategory.findMany({ where: { companyId } }),
      db.department.findMany({ where: { companyId } }),
      db.location.findMany({ where: { companyId } }),
      db.vendor.findMany({ where: { companyId } }),
      db.asset.findMany({ where: { companyId }, select: { assetTag: true, assetCode: true } }),
      db.employee.findMany({ where: { companyId }, select: { id: true, employeeCode: true, email: true, userId: true } }),
      db.companySettings.findUnique({ where: { companyId } }),
      db.company.findUnique({ where: { id: companyId }, select: { code: true, name: true, lastAssetSequence: true } })
    ]);

    if (!company) {
      return { success: false, error: "Company context not found" };
    }

    const categoryMap = new Map(categories.filter(c => c.isActive).map(c => [c.name.toLowerCase(), c.id]));
    const departmentMap = new Map(departments.filter(d => d.isActive).map(d => [d.name.toLowerCase(), d.id]));
    const locationMap = new Map(locations.filter(l => l.isActive).map(l => [l.name.toLowerCase(), l.id]));
    const vendorMap = new Map(vendors.filter(v => v.isActive).map(v => [v.name.toLowerCase(), v.id]));
    const employeeMap = new Map();
    employees.forEach(e => {
        if (e.employeeCode) employeeMap.set(e.employeeCode.toLowerCase(), e);
        if (e.email) employeeMap.set(e.email.toLowerCase(), e);
    });

    const existingTags = new Set(existingAssets.map(a => a.assetTag.toLowerCase()));
    const existingCodes = new Set(existingAssets.filter(a => a.assetCode).map(a => a.assetCode!.toLowerCase()));

    const results: ImportResultRow[] = [];
    let successCount = 0;
    let skippedCount = 0;
    let failedCount = 0;
    
    const processedTags = new Set<string>();
    const processedCodes = new Set<string>();

    const assetsToInsert: any[] = [];
    const handoversToCreate: any[] = [];

    // Enums mapping
    const physicalConditionMap: any = {
      "brand new": "BRAND_NEW",
      "used - excellent": "USED_EXCELLENT",
      "used excellent": "USED_EXCELLENT",
      "used - fair": "USED_FAIR",
      "used fair": "USED_FAIR"
    };

    const functionalStatusMap: any = {
      "working": "WORKING",
      "minor issues": "MINOR_ISSUES"
    };

    const handoverTypeMap: any = {
      "new hire": "NEW_HIRE",
      "replacement": "REPLACEMENT",
      "temporary loan": "TEMPORARY_LOAN",
      "new asset assign": "NEW_ASSET_ASSIGN",
      "asset update": "ASSET_UPDATE",
      "assigned to department": "ASSIGNED_TO_DEPARTMENT",
      "assigned to Department": "ASSIGNED_TO_DEPARTMENT"
    };

    // Parse each row
    for (let i = 0; i < rawData.length; i++) {
      const row = rawData[i];
      const rowNum = i + 2; // header is row 1
      
      const tag = String(row["Company Asset Tag ID"] || row["Asset Tag"] || "").trim();
      const name = String(row["Asset Name / Model"] || row["Asset Name"] || "").trim();
      const code = String(row["Asset Code"] || "").trim();
      const categoryName = String(row["Asset Category"] || row["Category"] || "").trim();
      
      const isTagRequired = !settings?.autoGenerateAssetCode;
      
      if ((isTagRequired && !tag) || !name || !categoryName) {
        results.push({ 
          rowNumber: rowNum, 
          status: "failed", 
          reason: `Missing required fields (${isTagRequired ? "Asset Tag, " : ""}Asset Name, Category)` 
        });
        failedCount++;
        continue;
      }

      if (tag) {
        const tagLower = tag.toLowerCase();
        if (existingTags.has(tagLower) || processedTags.has(tagLower)) {
          results.push({ rowNumber: rowNum, status: "skipped", reason: `Asset Tag '${tag}' already exists or is duplicate in file` });
          skippedCount++;
          continue;
        }
        processedTags.add(tagLower);
      }

      if (code) {
        const codeLower = code.toLowerCase();
        if (existingCodes.has(codeLower) || processedCodes.has(codeLower)) {
          results.push({ rowNumber: rowNum, status: "skipped", reason: `Asset Code '${code}' already exists or is duplicate in file` });
          skippedCount++;
          continue;
        }
        processedCodes.add(codeLower);
      }

      const categoryId = categoryMap.get(categoryName.toLowerCase());
      if (!categoryId) {
        results.push({ rowNumber: rowNum, status: "failed", reason: `Category '${categoryName}' does not exist or is inactive` });
        failedCount++;
        continue;
      }

      let departmentId = null;
      const deptVal = row["Asset Department / Team"] || row["Department"];
      if (deptVal) {
        departmentId = departmentMap.get(String(deptVal).trim().toLowerCase());
        if (!departmentId) {
          results.push({ rowNumber: rowNum, status: "failed", reason: `Asset Department '${deptVal}' does not exist or is inactive` });
          failedCount++;
          continue;
        }
      }

      let purchasedFromDepartmentId = null;
      const purchasedFromVal = row["Purchased From Company"];
      if (purchasedFromVal) {
        purchasedFromDepartmentId = departmentMap.get(String(purchasedFromVal).trim().toLowerCase());
        if (!purchasedFromDepartmentId) {
          results.push({ rowNumber: rowNum, status: "failed", reason: `Purchased From Company '${purchasedFromVal}' does not exist or is inactive` });
          failedCount++;
          continue;
        }
      }

      let locationId = null;
      if (row["Location"]) {
        locationId = locationMap.get(String(row["Location"]).trim().toLowerCase());
        if (!locationId) {
          results.push({ rowNumber: rowNum, status: "failed", reason: `Location '${row["Location"]}' does not exist or is inactive` });
          failedCount++;
          continue;
        }
      }

      let vendorId = null;
      if (row["Vendor"]) {
        vendorId = vendorMap.get(String(row["Vendor"]).trim().toLowerCase());
        if (!vendorId) {
          results.push({ rowNumber: rowNum, status: "failed", reason: `Vendor '${row["Vendor"]}' does not exist or is inactive` });
          failedCount++;
          continue;
        }
      }

      // Handover validations
      let handoverEmployeeId = null;
      let handoverUserId = null;
      const handoverEmpVal = row["Assigned To Employee (ID or Email)"];
      if (handoverEmpVal) {
          const emp = employeeMap.get(String(handoverEmpVal).trim().toLowerCase());
          if (!emp) {
              results.push({ rowNumber: rowNum, status: "failed", reason: `Employee '${handoverEmpVal}' not found` });
              failedCount++;
              continue;
          }
          handoverEmployeeId = emp.id;
          handoverUserId = emp.userId;
      }

      let handoverDeptId = null;
      const handoverDeptVal = row["Assigned To Department"];
      if (handoverDeptVal) {
          handoverDeptId = departmentMap.get(String(handoverDeptVal).trim().toLowerCase());
          if (!handoverDeptId) {
              results.push({ rowNumber: rowNum, status: "failed", reason: `Handover Department '${handoverDeptVal}' not found` });
              failedCount++;
              continue;
          }
      }

      if (handoverEmployeeId && handoverDeptId) {
          results.push({ rowNumber: rowNum, status: "failed", reason: `Cannot assign to both Employee and Department in initial handover` });
          failedCount++;
          continue;
      }

      // Dates parsing
      const parseDate = (val: any) => {
          if (!val) return null;
          const parsed = typeof val === 'number' ? xlsx.SSF.parse_date_code(val) : null;
          if (parsed) return new Date(parsed.y, parsed.m - 1, parsed.d);
          const dt = new Date(val);
          return isNaN(dt.getTime()) ? null : dt;
      };

      const purchaseDate = parseDate(row["Purchase Date"]);
      const warrantyExpiration = parseDate(row["Warranty Expiration"]);
      const handoverDate = parseDate(row["Handover Date"]);

      // Numeric values
      const parseNum = (val: any) => {
          const n = parseFloat(val);
          return isNaN(n) ? null : n;
      };

      const cost = parseNum(row["Asset Price (INR)"] || row["Cost"]);
      const replacementValue = parseNum(row["Replacement Value"]);
      
      // Status
      let statusRaw = String(row["Status"] || "").trim().toUpperCase();
      const validStatuses = ["ACTIVE", "ASSIGNED", "REPAIR", "DISPOSED", "LOST"];
      let status: any = (handoverEmployeeId || handoverDeptId) ? "ASSIGNED" : "ACTIVE";
      if (statusRaw && validStatuses.includes(statusRaw)) {
          status = statusRaw;
      }

      // Accessories
      let accessories: string[] = [];
      const accVal = row["Accessories Included"];
      if (accVal) {
          accessories = String(accVal).split(",").map(s => s.trim()).filter(Boolean);
      }

      const assetRow = {
        companyId,
        assetTag: tag || "",
        name,
        categoryId,
        assetCode: code || null,
        departmentId,
        purchasedFromDepartmentId,
        locationId,
        vendorId,
        serialNumber: String(row["Serial Number / Service Tag"] || row["Serial Number"] || "").trim() || null,
        brand: String(row["Brand"] || "").trim() || null,
        model: String(row["Model"] || "").trim() || null,
        status,
        condition: String(row["General Condition"] || row["Condition"] || "").trim() || null,
        purchaseDate,
        cost,
        specifications: String(row["Specifications"] || "").trim() || null,
        accessoriesIncluded: accessories,
        estimatedReplacementValue: replacementValue,
        warranty: String(row["Warranty Details"] || "").trim() || null,
        warrantyExpiration,
        attachmentUrl: String(row["Photos / Attachments URL"] || "").trim() || null,
        _rowNum: rowNum 
      };

      assetsToInsert.push(assetRow);

      if (handoverEmployeeId || handoverDeptId) {
          handoversToCreate.push({
              _tag: tag,
              _rowNum: rowNum,
              employeeId: handoverEmployeeId,
              userId: handoverUserId,
              departmentId: handoverDeptId,
              handoverDate,
              handoverType: handoverTypeMap[String(row["Handover Type"] || "").toLowerCase()] || null,
              physicalCondition: physicalConditionMap[String(row["Physical Condition"] || "").toLowerCase()] || null,
              functionalStatus: functionalStatusMap[String(row["Functional Status"] || "").toLowerCase()] || null,
              notes: String(row["Handover Notes"] || "").trim() || null,
              assignedById: currentUserId,
              termsAccepted: true, // Auto-accepted on import or set to false? Modal requires manual check. Let's assume true for import.
          });
      }
    }

      if (assetsToInsert.length > 0) {
      try {
         await db.$transaction(async (tx) => {
             // 1. Generate code and tag if needed
             let lastAssetSequence = company.lastAssetSequence;
             for (const asset of assetsToInsert) {
                 if (!asset.assetCode || !asset.assetTag) {
                     lastAssetSequence++;
                     const cat = categories.find(c => c.id === asset.categoryId);
                     const dept = departments.find(d => d.id === asset.purchasedFromDepartmentId);
                      const genCtx = {
                        companyCode: company.code,
                        companyName: company.name,
                        purchasedFromCode: dept?.code || null,
                        purchasedFromName: dept?.name || null,
                        categoryCode: cat?.code || null,
                        categoryName: cat?.name || "",
                        sequence: lastAssetSequence,
                      };
                     
                     if (!asset.assetCode) asset.assetCode = generateAssetCode(genCtx);
                     if (!asset.assetTag) asset.assetTag = generateAssetTag(genCtx);
                 }
             }

             // Update the last sequence on company record
             if (lastAssetSequence !== company.lastAssetSequence) {
                 await tx.company.update({
                     where: { id: companyId },
                     data: { lastAssetSequence }
                 });
             }

             // 2. Create assets
             const assetPayload = assetsToInsert.map(({ _rowNum, ...data }) => data);
             await tx.asset.createMany({
                 data: assetPayload
             });
             
             // 3. Fetch created assets to get IDs for handovers
             const createdAssets = await tx.asset.findMany({
                 where: {
                     companyId,
                     assetTag: { in: assetsToInsert.map(a => a.assetTag) }
                 },
                 select: { id: true, assetTag: true }
             });

             const tagToIdMap = new Map(createdAssets.map(a => [a.assetTag.toLowerCase(), a.id]));

             // 4. Create handovers
             if (handoversToCreate.length > 0) {
                 const assignmentPayload = handoversToCreate.map(({ _tag, _rowNum, ...data }) => {
                     const correspondingAsset = assetsToInsert.find(a => a._rowNum === _rowNum);
                     const finalTag = correspondingAsset ? correspondingAsset.assetTag : _tag;
                     return {
                         ...data,
                         companyId,
                         assetId: tagToIdMap.get(finalTag.toLowerCase()) as string,
                         transactionId: `TXN-IMP-${Date.now()}-${_rowNum}`
                     };
                 });

                 await tx.assetAssignment.createMany({
                     data: assignmentPayload
                 });
             }

             // 5. Log activity
             await tx.activityLog.create({
                 data: {
                     companyId,
                     userId: currentUserId,
                     action: "BULK_IMPORT_ASSETS",
                     entity: "Asset",
                     entityId: "BULK",
                     details: `Imported ${assetsToInsert.length} assets and ${handoversToCreate.length} assignments.`
                 }
             });
         });
         
         // Mark all rows as success
         assetsToInsert.forEach(r => {
             results.push({ rowNumber: r._rowNum, status: "success" });
             successCount++;
         });
      } catch (e: any) {
          console.error("Transation Error:", e);
         // If transaction failed, factor in all rows.
         assetsToInsert.forEach(r => {
             results.push({ rowNumber: r._rowNum, status: "failed", reason: `Database insertion failed: ${e.message}` });
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
    console.error("Asset import error:", error);
    return { success: false, error: error.message || "Failed to process import." };
  }
}

