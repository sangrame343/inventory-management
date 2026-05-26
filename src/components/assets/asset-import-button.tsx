"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileUp } from "lucide-react";
import { ImportModal } from "@/components/ui/import-modal";
import { importAssets } from "@/app/actions/import-assets-actions";
import * as xlsx from "xlsx";

export function AssetImportButton() {
  const [open, setOpen] = useState(false);

  const handleDownloadTemplate = () => {
    // Define the template structure based on the simplified modal fields
    const templateData = [
      {
        "Company Asset Tag ID": "AST-TAG-001",
        "Asset Name / Model": "MacBook Pro M3, 14-inch",
        "Asset Category": "Laptops",
        "Asset Code": "CH-LT-001",
        "Asset Department / Team": "Engineering",
        "Purchased From Company": "IBA",
        "Location": "HQ Level 1",
        "Vendor": "Apple Inc",
        "Serial Number / Service Tag": "C02DF123A",
        "Brand": "Apple",
        "Model": "M3 Pro",
        "Status": "ACTIVE",
        "General Condition": "Excellent",
        "Purchase Date": "2024-01-15",
        "Asset Price (INR)": 200000,
        "Replacement Value": 210000,
        "Warranty Details": "1 Year AppleCare",
        "Warranty Expiration": "2025-01-15",
        "Specifications": "16GB RAM, 512GB SSD",
        "Accessories Included": "Charger, Case",
        "Photos / Attachments URL": "https://example.com/photo.jpg",
        "Handover Date": "2024-01-16",
        "Handover Type": "New Hire",
        "Assigned To Employee (ID or Email)": "EMP123",
        "Assigned To Department": "",
        "Physical Condition": "Brand New",
        "Functional Status": "Working",
        "Handover Notes": "Brand new laptop for new joiner"
      }
    ];

    const ws = xlsx.utils.json_to_sheet(templateData);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, "Assets Import Template");
    
    // Auto-size columns slightly
    const colWidths = Object.keys(templateData[0]).map(() => ({ wch: 20 }));
    ws["!cols"] = colWidths;

    xlsx.writeFile(wb, "Asset_Import_Template.xlsx");
  };

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <FileUp className="mr-2 h-4 w-4" /> Import Assets
      </Button>

      <ImportModal
        open={open}
        onOpenChange={setOpen}
        title="Import Assets"
        description="Upload an Excel file to bulk import assets. Categories and Departments must exist. Company Asset Tag ID and Asset Code are auto-generated if left empty."
        onImport={importAssets}
        onDownloadTemplate={handleDownloadTemplate}
      />
    </>
  );
}
