"use client";

import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileUp, File, X, CheckCircle2, AlertCircle, Loader2, Download } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export type ImportResultRow = {
  rowNumber: number;
  status: "success" | "skipped" | "failed";
  reason?: string;
};

export type ImportResult = {
  totalRows: number;
  successCount: number;
  skippedCount: number;
  failedCount: number;
  rows: ImportResultRow[];
};

interface ImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  onImport: (formData: FormData) => Promise<{ success: boolean; result?: ImportResult; error?: string }>;
  onDownloadTemplate: () => void;
}

export function ImportModal({
  open,
  onOpenChange,
  title,
  description,
  onImport,
  onDownloadTemplate,
}: ImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      if (
        selected.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
        selected.type === "application/vnd.ms-excel" ||
        selected.name.endsWith('.xlsx') ||
        selected.name.endsWith('.xls')
      ) {
        setFile(selected);
        setError(null);
        setResult(null);
      } else {
        setError("Please select a valid Excel file (.xlsx or .xls)");
        setFile(null);
      }
    }
  };

  const clearFile = () => {
    setFile(null);
    setResult(null);
    setError(null);
    if (fileInputRef.current) {
        fileInputRef.current.value = '';
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await onImport(formData);
      if (response.success && response.result) {
        setResult(response.result);
      } else {
        setError(response.error || "An unknown error occurred during import.");
      }
    } catch (err: any) {
       setError(err.message || "Failed to process import request.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    // Reset state after closing animation
    setTimeout(() => {
        clearFile();
    }, 200);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); else onOpenChange(o); }}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {!result && !error && (
            <div className="flex justify-end mt-[-32px] relative z-10">
                <Button variant="outline" size="sm" onClick={onDownloadTemplate} type="button">
                    <Download className="mr-2 h-4 w-4" /> Download Template
                </Button>
            </div>
        )}

        <div className="grid gap-4 py-4">
          {!result ? (
            <>
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center text-center space-y-4 bg-muted/20">
                {!file ? (
                  <>
                    <div className="p-4 bg-muted rounded-full">
                      <FileUp className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Click or drag Excel file to upload</p>
                      <p className="text-xs text-muted-foreground mt-1">.xlsx or .xls files only</p>
                    </div>
                    <Button 
                      variant="secondary" 
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                    >
                      Select File
                    </Button>
                  </>
                ) : (
                  <>
                    <div className="p-4 bg-primary/10 rounded-full text-primary">
                      <File className="h-8 w-8" />
                    </div>
                    <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate max-w-[200px]">{file.name}</p>
                        <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full" onClick={clearFile} disabled={isUploading}>
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </>
                )}
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  onChange={handleFileChange}
                  accept=".xlsx, .xls, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={handleClose} disabled={isUploading}>Cancel</Button>
                <Button onClick={handleUpload} disabled={!file || isUploading}>
                  {isUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isUploading ? "Processing..." : "Import"}
                </Button>
              </div>
            </>
          ) : (
             <div className="space-y-4">
                <Alert variant={result.failedCount === 0 ? "default" : "destructive"} className={result.failedCount === 0 ? "border-green-500 bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-400" : ""}>
                    {result.failedCount === 0 ? <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-500" /> : <AlertCircle className="h-4 w-4" />}
                    <AlertTitle>Import Complete</AlertTitle>
                    <AlertDescription>
                        Processed {result.totalRows} rows. 
                        {result.successCount > 0 && <span className="font-semibold text-green-700 dark:text-green-400 ml-1">{result.successCount} successful.</span>}
                        {result.skippedCount > 0 && <span className="font-semibold text-yellow-600 dark:text-yellow-500 ml-1">{result.skippedCount} skipped.</span>}
                        {result.failedCount > 0 && <span className="font-semibold text-red-600 dark:text-red-500 ml-1">{result.failedCount} failed.</span>}
                    </AlertDescription>
                </Alert>

                {result.rows && result.rows.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Row Details</h4>
                    <ScrollArea className="h-[250px] border rounded-md p-2">
                         <div className="space-y-2">
                             {result.rows.map((r, i) => (
                                 <div key={i} className="flex flex-col text-sm border-b pb-2 last:border-0 last:pb-0">
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium min-w-[50px]">Row {r.rowNumber}</span>
                                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                            r.status === 'success' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                            r.status === 'skipped' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                                            'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                        }`}>
                                            {r.status.toUpperCase()}
                                        </span>
                                    </div>
                                    {(r.reason) && (
                                        <div className="text-muted-foreground mt-1 text-xs pl-14">
                                            {r.reason}
                                        </div>
                                    )}
                                 </div>
                             ))}
                         </div>
                    </ScrollArea>
                  </div>
                )}

                <div className="flex justify-end pt-2">
                    <Button onClick={handleClose}>Close</Button>
                </div>
             </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
