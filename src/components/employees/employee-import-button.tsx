"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileUp } from "lucide-react";
import { ImportModal } from "@/components/ui/import-modal";
import { importEmployees } from "@/app/actions/import-employees-actions";
import * as xlsx from "xlsx";

export function EmployeeImportButton() {
  const [open, setOpen] = useState(false);

  const handleDownloadTemplate = () => {
    // Define the template structure based on the import action expectations
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
        "Joining Date": "2023-01-01"
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
        "Joining Date": "2023-02-15"
      }
    ];

    const ws = xlsx.utils.json_to_sheet(templateData);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, "Employees Import Template");
    
    // Auto-size columns slightly
    const colWidths = [
      { wch: 15 }, { wch: 25 }, { wch: 25 }, { wch: 15 }, { wch: 20 }, 
      { wch: 20 }, { wch: 20 }, { wch: 10 }, { wch: 15 }
    ];
    ws["!cols"] = colWidths;

    xlsx.writeFile(wb, "Employee_Import_Template.xlsx");
  };

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <FileUp className="mr-2 h-4 w-4" /> Import Employees
      </Button>

      <ImportModal
        open={open}
        onOpenChange={setOpen}
        title="Import Employees"
        description="Upload an Excel file to bulk import employees. Make sure Department and Location exist."
        onImport={importEmployees}
        onDownloadTemplate={handleDownloadTemplate}
      />
    </>
  );
}
