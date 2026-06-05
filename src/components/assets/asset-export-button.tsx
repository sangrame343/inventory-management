"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileDown, ChevronDown } from "lucide-react";
import { getExportAssetsData } from "@/app/actions/asset-actions";
import * as xlsx from "xlsx";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function AssetExportButton() {
  const [exporting, setExporting] = useState(false);

  const handleExport = async (format: "friendly" | "all") => {
    setExporting(true);
    try {
      const data = await getExportAssetsData(format);
      if (!data || data.length === 0) {
        toast.info("No assets to export");
        return;
      }

      const ws = xlsx.utils.json_to_sheet(data);
      const wb = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(wb, ws, "Assets");

      // Auto-size columns
      const colWidths = Object.keys(data[0]).map(() => ({ wch: 22 }));
      ws["!cols"] = colWidths;

      const filename = format === "friendly" ? "Assets_Import_Friendly.xlsx" : "Assets_Full_Export.xlsx";
      xlsx.writeFile(wb, filename);
      toast.success("Assets exported successfully");
    } catch (error) {
      console.error(error);
      toast.error("Failed to export assets");
    } finally {
      setExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="outline" disabled={exporting}>
            <FileDown className="mr-2 h-4 w-4" /> 
            {exporting ? "Exporting..." : "Export Assets"}
            <ChevronDown className="ml-2 h-3.5 w-3.5 opacity-60" />
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-[200px]">
        <DropdownMenuItem onClick={() => handleExport("friendly")} className="cursor-pointer">
          Export (Import Friendly)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport("all")} className="cursor-pointer">
          Export All Content
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
