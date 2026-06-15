"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  UserPlus,
  Copy,
  Check,
  Package,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { SearchableSelector } from "@/components/ui/searchable-selector";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const assignSchema = z
  .object({
    assignmentType: z.enum(["EMPLOYEE", "DEPARTMENT"]),
    employeeId: z.string().optional(),
    departmentId: z.string().optional(),
    handoverDate: z.string().min(1, "Handover date is required"),
    notes: z.string().optional(),
    handoverType: z.string().min(1),
    physicalCondition: z.string().min(1),
    functionalStatus: z.string().min(1),
    locationId: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.assignmentType === "EMPLOYEE") return !!data.employeeId;
      if (data.assignmentType === "DEPARTMENT") return !!data.departmentId;
      return false;
    },
    {
      message: "Assignee is required",
      path: ["employeeId"],
    },
  );

interface BulkAssignModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedIds: string[];
  /** Display names of selected assets for the confirmation list */
  selectedAssets: { id: string; name: string; assetCode?: string | null }[];
  onSuccess: () => void;
}

interface AckToken {
  assetId: string;
  token: string;
  url: string;
}

export function BulkAssignModal({
  open,
  onOpenChange,
  selectedIds,
  selectedAssets,
  onSuccess,
}: BulkAssignModalProps) {
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [ackTokens, setAckTokens] = useState<AckToken[]>([]);
  const [combinedUrl, setCombinedUrl] = useState<string | null>(null);
  const [copiedCombined, setCopiedCombined] = useState(false);
  const [failedIds, setFailedIds] = useState<string[]>([]);
  const [done, setDone] = useState(false);
  const [assetsExpanded, setAssetsExpanded] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const router = useRouter();

  const form = useForm<z.infer<typeof assignSchema>>({
    resolver: zodResolver(assignSchema),
    defaultValues: {
      assignmentType: "EMPLOYEE",
      employeeId: "",
      departmentId: "",
      handoverDate: new Date().toISOString().split("T")[0],
      notes: "",
      handoverType: "NEW_HIRE",
      physicalCondition: "BRAND_NEW",
      functionalStatus: "WORKING",
      locationId: "",
    },
  });

  const assignmentType = form.watch("assignmentType");

  useEffect(() => {
    if (assignmentType === "DEPARTMENT") {
      form.setValue("handoverType", "ASSIGNED_TO_DEPARTMENT");
    } else if (assignmentType === "EMPLOYEE") {
      form.setValue("handoverType", "NEW_HIRE");
    }
  }, [assignmentType, form]);

  useEffect(() => {
    if (open) {
      fetch("/api/employees")
        .then((res) => res.json())
        .then((data) => setEmployees(data));
      fetch("/api/departments")
        .then((res) => res.json())
        .then((data) => setDepartments(data));
      fetch("/api/locations")
        .then((res) => res.json())
        .then((data) => setLocations(data));
    }
  }, [open]);

  async function onSubmit(values: z.infer<typeof assignSchema>) {
    setLoading(true);
    try {
      const res = await fetch("/api/assets/bulk-assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assetIds: selectedIds,
          ...values,
        }),
      });

      const data = await res.json();

      if (!res.ok && res.status !== 201) {
        throw new Error(data.error || "Failed to assign assets");
      }

      // Pending approval path
      if (data.pending) {
        toast.success(data.message || "Assignment request submitted for approval");
        handleClose();
        return;
      }

      // Build acknowledgement token list
      const tokens: AckToken[] = (data.results || [])
        .filter((r: any) => r.success && r.rawAcknowledgementToken)
        .map((r: any) => ({
          assetId: r.assetId,
          token: r.rawAcknowledgementToken,
          url: `${window.location.origin}/acknowledge/${r.rawAcknowledgementToken}`,
        }));

      const failed = (data.results || [])
        .filter((r: any) => !r.success)
        .map((r: any) => r.assetId);

      setAckTokens(tokens);
      if (data.combinedToken) {
        setCombinedUrl(`${window.location.origin}/acknowledge/employee/${data.combinedToken}`);
      } else {
        setCombinedUrl(null);
      }
      setFailedIds(failed);
      setDone(true);

      if (data.succeeded > 0) {
        toast.success(
          `${data.succeeded} asset${data.succeeded > 1 ? "s" : ""} assigned successfully` +
            (data.failed > 0 ? ` (${data.failed} failed)` : ""),
        );
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to assign assets");
    } finally {
      setLoading(false);
    }
  }

  const handleCopy = (url: string, idx: number) => {
    navigator.clipboard.writeText(url);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const handleCopyAll = () => {
    const text = ackTokens.map((t) => t.url).join("\n");
    navigator.clipboard.writeText(text);
    toast.success("All acknowledgement links copied!");
  };

  const handleClose = () => {
    onOpenChange(false);
    setAckTokens([]);
    setCombinedUrl(null);
    setFailedIds([]);
    setDone(false);
    setAssetsExpanded(false);
    form.reset({
      assignmentType: "EMPLOYEE",
      employeeId: "",
      departmentId: "",
      handoverDate: new Date().toISOString().split("T")[0],
      notes: "",
      handoverType: "NEW_HIRE",
      physicalCondition: "BRAND_NEW",
      functionalStatus: "WORKING",
      locationId: "",
    });
    router.refresh();
    onSuccess();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        if (!val) handleClose();
        else onOpenChange(true);
      }}
    >
      <DialogContent className="sm:max-w-[540px] max-h-[90vh] overflow-y-auto">
        {/* ── Success / Done State ── */}
        {done ? (
          <div className="space-y-5 py-2 animate-in fade-in duration-300">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                <Check className="h-5 w-5" />
                Bulk Assignment Complete
              </DialogTitle>
              <DialogDescription>
                {ackTokens.length} asset{ackTokens.length !== 1 ? "s" : ""} assigned.
                {failedIds.length > 0 && (
                  <span className="text-destructive ml-1">
                    {failedIds.length} failed.
                  </span>
                )}
              </DialogDescription>
            </DialogHeader>

            {/* Combined Handover Link */}
            {combinedUrl && (
              <div className="space-y-2 p-3.5 bg-emerald-500/5 dark:bg-emerald-400/5 rounded-xl border border-emerald-500/20 dark:border-emerald-400/20">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                    Combined Handover Link
                  </p>
                </div>
                <div className="flex items-center gap-2 mt-1.5">
                  <input
                    readOnly
                    value={combinedUrl}
                    className="flex-1 text-xs text-muted-foreground bg-card border border-border/50 rounded-lg px-3 py-2 outline-none truncate cursor-text"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(combinedUrl);
                      setCopiedCombined(true);
                      toast.success("Combined handover link copied!");
                      setTimeout(() => setCopiedCombined(false), 2000);
                    }}
                    className="shrink-0 h-9"
                  >
                    {copiedCombined ? (
                      <Check className="h-4 w-4 text-emerald-500 mr-1" />
                    ) : (
                      <Copy className="h-4 w-4 mr-1" />
                    )}
                    {copiedCombined ? "Copied" : "Copy Link"}
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Send this single link to acknowledge receipt of all assigned assets.
                </p>
              </div>
            )}

            {/* Individual Acknowledgement links */}
            {ackTokens.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground/60">
                    {combinedUrl ? "Individual Asset Links" : "Acknowledgement Links"}
                  </p>
                  {ackTokens.length > 1 && (
                    <button
                      type="button"
                      onClick={handleCopyAll}
                      className="text-xs text-primary hover:underline font-semibold flex items-center gap-1"
                    >
                      <Copy className="h-3 w-3" />
                      Copy All
                    </button>
                  )}
                </div>
                <div className="rounded-xl border border-border/50 divide-y divide-border/40 overflow-hidden max-h-[160px] overflow-y-auto">
                  {ackTokens.map((t, idx) => {
                    const asset = selectedAssets.find((a) => a.id === t.assetId);
                    return (
                      <div
                        key={t.assetId}
                        className="flex items-center gap-2 px-3 py-2 bg-card hover:bg-muted/20 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-semibold text-foreground/80 truncate">
                            {asset?.name || t.assetId}
                          </p>
                          <input
                            readOnly
                            value={t.url}
                            className="w-full text-[10px] text-muted-foreground bg-transparent border-none outline-none truncate cursor-text"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopy(t.url, idx)}
                          className="shrink-0 rounded-lg p-1.5 hover:bg-muted/60 transition-colors text-muted-foreground hover:text-foreground"
                          title="Copy link"
                        >
                          {copiedIdx === idx ? (
                            <Check className="h-3.5 w-3.5 text-emerald-500" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Failed assets */}
            {failedIds.length > 0 && (
              <div className="rounded-xl border border-destructive/20 bg-destructive/[0.04] p-3 space-y-1">
                <p className="text-xs font-bold text-destructive flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Failed to assign:
                </p>
                {failedIds.map((id) => {
                  const a = selectedAssets.find((a) => a.id === id);
                  return (
                    <p key={id} className="text-xs text-destructive/80 pl-5">
                      {a?.name || id}
                    </p>
                  );
                })}
              </div>
            )}

            <DialogFooter>
              <Button onClick={handleClose} className="w-full sm:w-auto">
                Close & Done
              </Button>
            </DialogFooter>
          </div>
        ) : (
          /* ── Form State ── */
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-primary" />
                Bulk Assign Assets
              </DialogTitle>
              <DialogDescription>
                Assign{" "}
                <span className="font-semibold text-foreground">
                  {selectedIds.length} asset{selectedIds.length !== 1 ? "s" : ""}
                </span>{" "}
                to an employee or department in one step.
              </DialogDescription>
            </DialogHeader>

            {/* Selected assets collapsible preview */}
            <div className="rounded-xl border border-border/50 overflow-hidden">
              <button
                type="button"
                onClick={() => setAssetsExpanded((v) => !v)}
                className="w-full flex items-center justify-between px-3 py-2.5 bg-muted/20 hover:bg-muted/30 transition-colors text-left"
              >
                <span className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                  <Package className="h-3.5 w-3.5" />
                  {selectedIds.length} selected assets
                </span>
                {assetsExpanded ? (
                  <ChevronUp className="h-3.5 w-3.5 text-muted-foreground/60" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground/60" />
                )}
              </button>
              {assetsExpanded && (
                <div className="max-h-[140px] overflow-y-auto divide-y divide-border/30 animate-in fade-in slide-in-from-top-1 duration-200">
                  {selectedAssets.map((a) => (
                    <div key={a.id} className="flex items-center gap-2 px-3 py-1.5">
                      <div className="h-5 w-5 rounded-md bg-primary/10 flex items-center justify-center shrink-0 text-[9px] font-bold text-primary/70">
                        {a.name.substring(0, 2).toUpperCase()}
                      </div>
                      <span className="text-[12px] text-foreground/80 font-medium truncate flex-1">
                        {a.name}
                      </span>
                      {a.assetCode && (
                        <code className="text-[9px] font-mono text-muted-foreground/60 bg-muted/50 rounded px-1.5 py-0.5 shrink-0">
                          {a.assetCode}
                        </code>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                {/* Assignment Type */}
                <FormField
                  control={form.control}
                  name="assignmentType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assign To</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select assignment type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="EMPLOYEE">Employee</SelectItem>
                          <SelectItem value="DEPARTMENT">Department</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Employee or Department selector */}
                {form.watch("assignmentType") === "EMPLOYEE" ? (
                  <FormField
                    control={form.control}
                    name="employeeId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Employee</FormLabel>
                        <FormControl>
                          <SearchableSelector
                            options={employees.map((emp) => ({
                              value: emp.id,
                              label: emp.fullName,
                              description: emp.employeeCode
                                ? `Code: ${emp.employeeCode}`
                                : undefined,
                            }))}
                            value={field.value}
                            onSelect={field.onChange}
                            placeholder="Select an employee..."
                            searchPlaceholder="Search employee name/code..."
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ) : (
                  <FormField
                    control={form.control}
                    name="departmentId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Department</FormLabel>
                        <FormControl>
                          <SearchableSelector
                            options={departments.map((dept) => ({
                              value: dept.id,
                              label: dept.name,
                            }))}
                            value={field.value}
                            onSelect={field.onChange}
                            placeholder="Select a department..."
                            searchPlaceholder="Search department..."
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {/* Location */}
                <FormField
                  control={form.control}
                  name="locationId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select current location">
                              {locations.find((loc) => loc.id === field.value)?.name}
                            </SelectValue>
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {locations.map((loc) => (
                            <SelectItem key={loc.id} value={loc.id}>
                              {loc.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  {/* Handover Date */}
                  <FormField
                    control={form.control}
                    name="handoverDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Handover Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Handover Type */}
                  <FormField
                    control={form.control}
                    name="handoverType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Handover Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="NEW_HIRE">New Hire</SelectItem>
                            <SelectItem value="REPLACEMENT">Replacement</SelectItem>
                            <SelectItem value="TEMPORARY_LOAN">Temporary Loan</SelectItem>
                            <SelectItem value="NEW_ASSET_ASSIGN">New Asset Assign</SelectItem>
                            <SelectItem value="ASSET_UPDATE">Asset Update</SelectItem>
                            <SelectItem value="ASSIGNED_TO_DEPARTMENT">
                              Assigned to Department
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Physical Condition */}
                  <FormField
                    control={form.control}
                    name="physicalCondition"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Physical Condition</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select condition" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="BRAND_NEW">Brand New</SelectItem>
                            <SelectItem value="USED_EXCELLENT">Used – Excellent</SelectItem>
                            <SelectItem value="USED_FAIR">Used – Fair</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Functional Status */}
                  <FormField
                    control={form.control}
                    name="functionalStatus"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Functional Status</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="WORKING">Working</SelectItem>
                            <SelectItem value="MINOR_ISSUES">Minor Issues</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Notes */}
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Additional Notes</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Condition details, specific accessories, etc."
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" loading={loading}>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Assign {selectedIds.length} Asset{selectedIds.length !== 1 ? "s" : ""}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
