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
  DialogTrigger,
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
import { UserPlus, Copy, Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { SearchableSelector } from "@/components/ui/searchable-selector";

const assignSchema = z.object({
  assignmentType: z.enum(["EMPLOYEE", "DEPARTMENT"]),
  employeeId: z.string().optional(),
  departmentId: z.string().optional(),
  handoverDate: z.string().min(1, "Handover date is required"),
  notes: z.string().optional(),
  handoverType: z.string().min(1),
  physicalCondition: z.string().min(1),
  functionalStatus: z.string().min(1),
  locationId: z.string().optional(),
}).refine((data) => {
  if (data.assignmentType === "EMPLOYEE") return !!data.employeeId;
  if (data.assignmentType === "DEPARTMENT") return !!data.departmentId;
  return false;
}, {
  message: "Assignee is required",
  path: ["employeeId"],
});

interface AssetAssignModalProps {
  assetId: string;
  assetName: string;
}

export function AssetAssignModal({
  assetId,
  assetName,
}: AssetAssignModalProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [ackUrl, setAckUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
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
      const res = await fetch("/api/assets/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assetId,
          ...values,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to assign asset");
      }

      const data = await res.json();
      if (data.rawAcknowledgementToken) {
        const url = `${window.location.origin}/acknowledge/${data.rawAcknowledgementToken}`;
        setAckUrl(url);
      } else {
        setOpen(false);
        router.refresh();
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  const handleCopy = () => {
    if (ackUrl) {
      navigator.clipboard.writeText(ackUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setAckUrl(null);
    form.reset();
    router.refresh();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        setOpen(val);
        if (!val) {
          setAckUrl(null);
          form.reset();
        }
      }}
    >
      <DialogTrigger
        render={
          <Button>
            <UserPlus className="mr-2 h-4 w-4" />
            Assign Asset
          </Button>
        }
      />
      <DialogContent className="sm:max-w-[500px]">
        {ackUrl ? (
          <div className="space-y-6 py-4 animate-fade-in">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                Asset Assigned Successfully
              </DialogTitle>
              <DialogDescription>
                Copy this secure public link and share it with the assignee to acknowledge receipt. No login required.
              </DialogDescription>
            </DialogHeader>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
              <span className="block text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide">
                Acknowledgement Link
              </span>
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={ackUrl}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs select-all focus:outline-none dark:bg-slate-900 dark:border-slate-800 dark:text-white"
                />
                <Button size="icon" variant="outline" onClick={handleCopy} className="h-9 w-9 shrink-0">
                  {copied ? (
                    <Check className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <DialogFooter>
              <Button onClick={handleClose} className="w-full sm:w-auto">
                Close & Complete
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Assign Asset</DialogTitle>
              <DialogDescription>
                Assign <strong>{assetName}</strong> to an employee or department.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="assignmentType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assign To</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
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

                <FormField
                  control={form.control}
                  name="locationId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
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
                  <FormField
                    control={form.control}
                    name="handoverType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Handover Type</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="NEW_HIRE">New Hire</SelectItem>
                            <SelectItem value="REPLACEMENT">Replacement</SelectItem>
                            <SelectItem value="TEMPORARY_LOAN">
                              Temporary Loan
                            </SelectItem>
                            <SelectItem value="NEW_ASSET_ASSIGN">New Asset Assign</SelectItem>
                            <SelectItem value="ASSET_UPDATE">Asset Update</SelectItem>
                            <SelectItem value="ASSIGNED_TO_DEPARTMENT">Assigned to Department</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="physicalCondition"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Physical Condition</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select condition" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="BRAND_NEW">Brand New</SelectItem>
                            <SelectItem value="USED_EXCELLENT">Used - Excellent</SelectItem>
                            <SelectItem value="USED_FAIR">Used - Fair</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="functionalStatus"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Functional Status</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
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
                  <Button type="submit" loading={loading}>
                    Confirm Assignment
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
