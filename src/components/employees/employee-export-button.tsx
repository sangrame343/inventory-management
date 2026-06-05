"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileDown, ChevronDown, Download, FileSpreadsheet } from "lucide-react";
import { getExportEmployeesData } from "@/app/actions/employee-actions";
import * as xlsx from "xlsx";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function EmployeeExportButton() {
  const [exporting, setExporting] = useState(false);

  const handleExport = async (format: "friendly" | "all") => {
    setExporting(true);
    try {
      const data = await getExportEmployeesData(format);
      if (!data || data.length === 0) {
        toast.info("No employees to export");
        return;
      }

      const ws = xlsx.utils.json_to_sheet(data);
      const wb = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(wb, ws, "Employees");
      const colWidths = Object.keys(data[0]).map(() => ({ wch: 20 }));
      ws["!cols"] = colWidths;

      const filename =
        format === "friendly"
          ? "Employees_Import_Friendly.xlsx"
          : "Employees_Full_Export.xlsx";
      xlsx.writeFile(wb, filename);
      toast.success("Employees exported successfully");
    } catch (error) {
      console.error(error);
      toast.error("Failed to export employees");
    } finally {
      setExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            className="h-9 shadow-2xs text-xs font-semibold gap-2 border-border/70 hover:border-primary/30 hover:bg-primary/5 hover:text-primary transition-all duration-200"
            disabled={exporting}
          >
            <FileDown className="size-3.5" />
            {exporting ? "Exporting…" : "Export"}
            <ChevronDown className="size-3 opacity-50 ml-0.5" />
          </Button>
        }
      />
      <DropdownMenuContent
        align="end"
        className="w-[220px] rounded-xl border border-border/50 p-1.5 shadow-lg"
      >
        <p className="px-2 pb-1 pt-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground/60">
          Export Format
        </p>
        <DropdownMenuSeparator className="my-1 opacity-40" />
        <DropdownMenuItem
          onClick={() => handleExport("friendly")}
          className="cursor-pointer rounded-lg flex items-start gap-3 py-2.5 px-3 group"
        >
          <FileSpreadsheet className="h-4 w-4 mt-0.5 text-emerald-500 shrink-0" />
          <div className="flex flex-col gap-0.5">
            <span className="text-[13px] font-semibold">Import Friendly</span>
            <span className="text-[10px] text-muted-foreground/60 leading-tight">
              Clean format for re-importing
            </span>
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleExport("all")}
          className="cursor-pointer rounded-lg flex items-start gap-3 py-2.5 px-3 group"
        >
          <Download className="h-4 w-4 mt-0.5 text-primary shrink-0" />
          <div className="flex flex-col gap-0.5">
            <span className="text-[13px] font-semibold">Full Export</span>
            <span className="text-[10px] text-muted-foreground/60 leading-tight">
              All fields and metadata
            </span>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
