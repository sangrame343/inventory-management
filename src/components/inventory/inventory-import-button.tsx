"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileUp } from "lucide-react";
import { ImportModal } from "@/components/ui/import-modal";
import { importInventory } from "@/app/actions/import-inventory-actions";
import * as xlsx from "xlsx";

export function InventoryImportButton() {
  const [open, setOpen] = useState(false);

  const handleDownloadTemplate = () => {
    // Define the template structure based on the import action expectations
    const templateData = [
      {
        "SKU": "IT-MO-001",
        "Item Name": "Wireless Mouse",
        "Category": "Peripherals",
        "Unit": "pcs",
        "Default Location": "Main Warehouse",
        "Description": "Logitech MX Master 3",
        "Min Stock Level": 5,
        "Reorder Level": 10,
        "Item Type": "CONSUMABLE",
        "Status": "ACTIVE",
        "Initial Quantity": 50,
        "Unit Cost": 99.99
      }
    ];

    const ws = xlsx.utils.json_to_sheet(templateData);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, "Inventory Import Template");
    
    // Auto-size columns slightly
    const colWidths = [
      { wch: 15 }, { wch: 25 }, { wch: 15 }, { wch: 10 }, { wch: 20 }, 
      { wch: 30 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 10 },
      { wch: 15 }, { wch: 12 }
    ];
    ws["!cols"] = colWidths;

    xlsx.writeFile(wb, "Inventory_Import_Template.xlsx");
  };

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <FileUp className="mr-2 h-4 w-4" /> Import Excel
      </Button>

      <ImportModal
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) {
            // refresh page on close to see the newly imported inventory
            window.location.reload();
          }
        }}
        title="Import Inventory"
        description="Upload an Excel file to bulk import inventory items. If Initial Quantity is > 0, make sure Default Location is provided."
        onImport={importInventory}
        onDownloadTemplate={handleDownloadTemplate}
      />
    </>
  );
}
