"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileUp, Download } from "lucide-react";
import { ImportModal } from "@/components/ui/import-modal";
import { importEmployees } from "@/app/actions/import-employees-actions";
import * as xlsx from "xlsx";

export function EmployeeImportButton() {
  const [open, setOpen] = useState(false);

  const handleDownloadTemplate = () => {
    const templateData = [
      {
        "Employee Code": "EMP001",
        "Full Name": "John Doe",
        "Email": "john.doe@example.com",
        "Phone": "1234567890",
        "Department": "Engineering",
        "Location": "Headquarters",
        "Designation": "Software Engineer",
        "Status": "ACTIVE",
        "Joining Date": "2023-01-01",
      },
      {
        "Employee Code": "EMP002",
        "Full Name": "Jane Smith",
        "Email": "jane.smith@example.com",
        "Phone": "0987654321",
        "Department": "Human Resources",
        "Location": "Regional Office",
        "Designation": "HR Manager",
        "Status": "ACTIVE",
        "Joining Date": "2023-02-15",
      },
    ];

    const ws = xlsx.utils.json_to_sheet(templateData);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, "Employees Import Template");
    ws["!cols"] = [
      { wch: 15 }, { wch: 25 }, { wch: 25 }, { wch: 15 }, { wch: 20 },
      { wch: 20 }, { wch: 20 }, { wch: 10 }, { wch: 15 },
    ];
    xlsx.writeFile(wb, "Employee_Import_Template.xlsx");
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="h-9 shadow-2xs text-xs font-semibold gap-2 border-border/70 hover:border-primary/30 hover:bg-primary/5 hover:text-primary transition-all duration-200"
        onClick={() => setOpen(true)}
      >
        <FileUp className="size-3.5" />
        Import
      </Button>

      <ImportModal
        open={open}
        onOpenChange={setOpen}
        title="Import Employees"
        description="Upload an Excel/Spreadsheet file to bulk import employees. Department and Location configurations must exist prior to import."
        onImport={importEmployees}
        onDownloadTemplate={handleDownloadTemplate}
      />
    </>
  );
}
