"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileDown } from "lucide-react";
import { getExportAssetsData } from "@/app/actions/asset-actions";
import * as xlsx from "xlsx";
import { toast } from "sonner";

export function AssetExportButton() {
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const data = await getExportAssetsData();
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

      xlsx.writeFile(wb, "Assets_Export.xlsx");
      toast.success("Assets exported successfully");
    } catch (error) {
      console.error(error);
      toast.error("Failed to export assets");
    } finally {
      setExporting(false);
    }
  };

  return (
    <Button variant="outline" onClick={handleExport} disabled={exporting}>
      <FileDown className="mr-2 h-4 w-4" /> {exporting ? "Exporting..." : "Export Assets"}
    </Button>
  );
}
