"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import * as xlsx from "xlsx";
import { ImportResult, ImportResultRow } from "@/components/ui/import-modal";

export async function importEmployees(formData: FormData): Promise<{ success: boolean; result?: ImportResult; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user?.activeCompanyId) {
      return { success: false, error: "Unauthorized or missing company context" };
    }
    const companyId = session.user.activeCompanyId;

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

    // Pre-fetch all necessary company data for validation
    const [departments, locations, existingEmployees] = await Promise.all([
      db.department.findMany({ where: { companyId } }),
      db.location.findMany({ where: { companyId } }),
      db.employee.findMany({ where: { companyId }, select: { employeeCode: true } })
    ]);

    const departmentMap = new Map(departments.filter(d => d.isActive).map(d => [d.name.toLowerCase(), d.id]));
    const locationMap = new Map(locations.filter(l => l.isActive).map(l => [l.name.toLowerCase(), l.id]));
    const existingCodes = new Set(existingEmployees.map(e => e.employeeCode.toLowerCase()));

    const results: ImportResultRow[] = [];
    let successCount = 0;
    let skippedCount = 0;
    let failedCount = 0;

    const rowsToInsert: any[] = [];

    // Parse each row
    for (let i = 0; i < rawData.length; i++) {
      const row = rawData[i];
      const rowNum = i + 2; // header is row 1
      
      const employeeCode = String(row["Employee Code"] || "").trim();
      const fullName = String(row["Full Name"] || "").trim();
      const joiningDateRaw = row["Joining Date"];
      
      if (!employeeCode || !fullName || !joiningDateRaw) {
        results.push({ rowNumber: rowNum, status: "failed", reason: "Missing required fields (Employee Code, Full Name, Joining Date)" });
        failedCount++;
        continue;
      }

      if (existingCodes.has(employeeCode.toLowerCase())) {
        results.push({ rowNumber: rowNum, status: "skipped", reason: `Employee Code '${employeeCode}' already exists` });
        skippedCount++;
        continue;
      }

      let joiningDate = null;
      // Try parse date
      if (typeof joiningDateRaw === 'number') {
          const parsed = xlsx.SSF.parse_date_code(joiningDateRaw);
          joiningDate = new Date(parsed.y, parsed.m - 1, parsed.d);
      } else {
          joiningDate = new Date(joiningDateRaw);
          if (isNaN(joiningDate.getTime())) {
              results.push({ rowNumber: rowNum, status: "failed", reason: `Invalid Joining Date format` });
              failedCount++;
              continue;
          }
      }

      let departmentId = null;
      if (row["Department"]) {
        departmentId = departmentMap.get(String(row["Department"]).trim().toLowerCase());
        if (!departmentId) {
          results.push({ rowNumber: rowNum, status: "failed", reason: `Department '${row["Department"]}' does not exist or is inactive` });
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

      rowsToInsert.push({
        companyId,
        employeeCode,
        fullName,
        email: String(row["Email"] || "").trim() || null,
        phone: String(row["Phone"] || "").trim() || null,
        designation: String(row["Designation"] || "").trim() || null,
        departmentId,
        locationId,
        status: String(row["Status"] || "ACTIVE").trim().toUpperCase() || "ACTIVE",
        joiningDate,
        // _rowNum to trace back the success result
        _rowNum: rowNum 
      });
    }

    if (rowsToInsert.length > 0) {
      try {
         await db.$transaction(async (tx) => {
             const payload = rowsToInsert.map(({ _rowNum, ...data }) => data);
             await tx.employee.createMany({
                 data: payload
             });
         });
         
         rowsToInsert.forEach(r => {
             results.push({ rowNumber: r._rowNum, status: "success" });
             successCount++;
         });
      } catch (e: any) {
         rowsToInsert.forEach(r => {
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
    console.error("Employee import error:", error);
    return { success: false, error: error.message || "Failed to process import." };
  }
}
