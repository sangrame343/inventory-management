"use client"

import { useState, useMemo } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { EmployeeForm } from "./employee-form"
import { EmployeeDetailsSheet } from "./employee-details-sheet"
import { cn } from "@/lib/utils"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { 
  Search, 
  Trash2, 
  UserX, 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown,
  FilterX,
  ChevronDown,
  AlertCircle,
  CheckCircle2
} from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useRouter } from "next/navigation"

interface EmployeeListProps {
  employees: any[]
  departments: any[]
  locations: any[]
}

type SortKey = "fullName" | "employeeCode" | "department" | "location" | "joiningDate" | "status"
type SortOrder = "asc" | "desc"

const sortOptions: { label: string; key: SortKey; order: SortOrder }[] = [
  { label: "Name (A-Z)", key: "fullName", order: "asc" },
  { label: "Name (Z-A)", key: "fullName", order: "desc" },
  { label: "Code (A-Z)", key: "employeeCode", order: "asc" },
  { label: "Code (Z-A)", key: "employeeCode", order: "desc" },
  { label: "Joining Date (Newest)", key: "joiningDate", order: "desc" },
  { label: "Joining Date (Oldest)", key: "joiningDate", order: "asc" },
  { label: "Status (Active First)", key: "status", order: "asc" },
];

export function EmployeeList({ employees, departments, locations }: EmployeeListProps) {
  const router = useRouter()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  
  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  
  // Search and Filter
  const [searchQuery, setSearchQuery] = useState("")
  const [deptFilter, setDeptFilter] = useState("all")
  const [locFilter, setLocFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  
  // Sorting
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; order: SortOrder }>({
    key: "fullName",
    order: "asc",
  })

  const sortValue = `${sortConfig.key}-${sortConfig.order}`

  // Bulk Action States
  const [isBulkConfirmOpen, setIsBulkConfirmOpen] = useState(false)
  const [bulkActionType, setBulkActionType] = useState<"INACTIVE" | "DELETE" | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [bulkResult, setBulkResult] = useState<{
    successCount: number;
    blockedCount: number;
    details: any[];
  } | null>(null)

  const handleRowClick = (id: string) => {
    setSelectedId(id)
    setIsDetailsOpen(true)
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredAndSortedEmployees.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredAndSortedEmployees.map(e => e.id)))
    }
  }

  const toggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedIds(newSelected)
  }

  const handleSort = (key: SortKey) => {
    setSortConfig(prev => ({
      key,
      order: prev.key === key && prev.order === "asc" ? "desc" : "asc"
    }))
  }

  const handleSortValueChange = (value: string) => {
    const [key, order] = value.split("-") as [SortKey, SortOrder];
    setSortConfig({ key, order });
  };

  const filteredAndSortedEmployees = useMemo(() => {
    let result = [...employees]

    // Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter(e => 
        e.fullName.toLowerCase().includes(q) ||
        e.employeeCode.toLowerCase().includes(q) ||
        (e.email && e.email.toLowerCase().includes(q)) ||
        (e.phone && e.phone.toLowerCase().includes(q)) ||
        (e.designation && e.designation.toLowerCase().includes(q))
      )
    }

    // Filter
    if (deptFilter !== "all") {
      result = result.filter(e => e.departmentId === deptFilter)
    }
    if (locFilter !== "all") {
      result = result.filter(e => e.locationId === locFilter)
    }
    if (statusFilter !== "all") {
      result = result.filter(e => e.status === statusFilter)
    }

    // Sort
    result.sort((a, b) => {
      let valA: any = ""
      let valB: any = ""

      switch (sortConfig.key) {
        case "fullName": valA = a.fullName; valB = b.fullName; break;
        case "employeeCode": valA = a.employeeCode; valB = b.employeeCode; break;
        case "department": valA = a.department?.name || ""; valB = b.department?.name || ""; break;
        case "location": valA = a.location?.name || ""; valB = b.location?.name || ""; break;
        case "joiningDate": valA = new Date(a.joiningDate).getTime(); valB = new Date(b.joiningDate).getTime(); break;
        case "status": valA = a.status; valB = b.status; break;
      }

      if (valA < valB) return sortConfig.order === "asc" ? -1 : 1
      if (valA > valB) return sortConfig.order === "asc" ? 1 : -1
      return 0
    })

    return result
  }, [employees, searchQuery, deptFilter, locFilter, statusFilter, sortConfig])

  const handleBulkAction = async () => {
    if (!bulkActionType) return
    setIsProcessing(true)
    setBulkResult(null)

    try {
      const res = await fetch("/api/employees/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: Array.from(selectedIds),
          type: bulkActionType
        })
      })

      if (!res.ok) throw new Error("Bulk action failed")

      const data = await res.json()
      setBulkResult(data)
      
      if (data.successCount > 0) {
        router.refresh()
      }
    } catch (error) {
      console.error(error)
    } finally {
      setIsProcessing(false)
    }
  }

  const resetBulk = () => {
    setIsBulkConfirmOpen(false)
    setBulkActionType(null)
    setBulkResult(null)
    setSelectedIds(new Set())
  }

  const SortIcon = ({ column }: { column: SortKey }) => {
    if (sortConfig.key !== column) return <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />
    return sortConfig.order === "asc" ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 bg-card p-4 rounded-md border">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search employees..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <Select value={deptFilter} onValueChange={(val) => setDeptFilter(val || "all")}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Department">
              {deptFilter === "all" ? "All Departments" : departments.find(d => d.id === deptFilter)?.name}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            {departments.map(d => (
              <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={locFilter} onValueChange={(val) => setLocFilter(val || "all")}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Location">
              {locFilter === "all" ? "All Locations" : locations.find(l => l.id === locFilter)?.name}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Locations</SelectItem>
            {locations.map(l => (
              <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val || "all")}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Status">
              {statusFilter === "all" ? "All Status" : 
               statusFilter === "ACTIVE" ? "Active" : 
               statusFilter === "INACTIVE" ? "Inactive / Not Active" : 
               statusFilter === "ON_LEAVE" ? "On Leave" : 
               statusFilter === "ON_HOLD" ? "On Hold" : 
               statusFilter === "RESIGNED" ? "Resigned" : 
               statusFilter === "LEFT" ? "Left" : 
               statusFilter === "TERMINATED" ? "Terminated" : statusFilter}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="INACTIVE">Inactive / Not Active</SelectItem>
            <SelectItem value="ON_LEAVE">On Leave</SelectItem>
            <SelectItem value="ON_HOLD">On Hold</SelectItem>
            <SelectItem value="RESIGNED">Resigned</SelectItem>
            <SelectItem value="LEFT">Left</SelectItem>
            <SelectItem value="TERMINATED">Terminated</SelectItem>
          </SelectContent>
        </Select>

        <Select value={sortValue} onValueChange={(val) => val && handleSortValueChange(val)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Sort By">
              {sortOptions.find(opt => `${opt.key}-${opt.order}` === sortValue)?.label}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {sortOptions.map((opt) => (
              <SelectItem key={`${opt.key}-${opt.order}`} value={`${opt.key}-${opt.order}`}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {(searchQuery || deptFilter !== "all" || locFilter !== "all" || statusFilter !== "all") && (
          <Button variant="ghost" onClick={() => {
            setSearchQuery("")
            setDeptFilter("all")
            setLocFilter("all")
            setStatusFilter("all")
          }}>
            <FilterX className="mr-2 h-4 w-4" />
            Clear
          </Button>
        )}
      </div>

      {/* Selection Toolbar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between bg-primary/5 border border-primary/20 p-2 px-4 rounded-md animate-in fade-in slide-in-from-top-2">
          <div className="text-sm font-medium">
            {selectedIds.size} employees selected
          </div>
          <div className="flex gap-2">
            <Button 
              size="sm" 
              variant="outline" 
              className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
              onClick={() => {
                setBulkActionType("INACTIVE")
                setIsBulkConfirmOpen(true)
              }}
            >
              <UserX className="mr-2 h-4 w-4" />
              Make Inactive
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              className="text-destructive hover:text-destructive hover:bg-destructive/5"
              onClick={() => {
                setBulkActionType("DELETE")
                setIsBulkConfirmOpen(true)
              }}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="rounded-md border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40px]">
                <Checkbox 
                  checked={selectedIds.size > 0 && selectedIds.size === filteredAndSortedEmployees.length} 
                  onChange={toggleSelectAll}
                />
              </TableHead>
              <TableHead onClick={() => handleSort("employeeCode")} className="cursor-pointer">
                <div className="flex items-center">Code <SortIcon column="employeeCode" /></div>
              </TableHead>
              <TableHead onClick={() => handleSort("fullName")} className="cursor-pointer">
                <div className="flex items-center">Name <SortIcon column="fullName" /></div>
              </TableHead>
              <TableHead>Email</TableHead>
              <TableHead onClick={() => handleSort("department")} className="cursor-pointer">
                <div className="flex items-center">Dept/Loc <SortIcon column="department" /></div>
              </TableHead>
              <TableHead>Designation</TableHead>
              <TableHead onClick={() => handleSort("status")} className="cursor-pointer">
                <div className="flex items-center">Status <SortIcon column="status" /></div>
              </TableHead>
              <TableHead onClick={() => handleSort("joiningDate")} className="cursor-pointer">
                <div className="flex items-center">Joined <SortIcon column="joiningDate" /></div>
              </TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAndSortedEmployees.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                  No employees found.
                </TableCell>
              </TableRow>
            ) : (
              filteredAndSortedEmployees.map((employee) => (
                <TableRow 
                  key={employee.id} 
                  className={cn(
                    "cursor-pointer hover:bg-muted/50 transition-colors",
                    selectedIds.has(employee.id) && "bg-muted"
                  )}
                  onClick={() => handleRowClick(employee.id)}
                >
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox 
                      checked={selectedIds.has(employee.id)} 
                      onChange={(e) => toggleSelect(employee.id, e as any)} 
                    />
                  </TableCell>
                  <TableCell className="font-mono text-xs">{employee.employeeCode}</TableCell>
                  <TableCell>
                    <div className="font-medium">{employee.fullName}</div>
                    {employee.user && (
                      <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">User</div>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">{employee.email || "-"}</TableCell>
                  <TableCell>
                    <div className="text-xs font-medium">{employee.department?.name || "-"}</div>
                    <div className="text-[10px] text-muted-foreground">{employee.location?.name || "-"}</div>
                  </TableCell>
                  <TableCell className="text-sm">{employee.designation || "-"}</TableCell>
                  <TableCell>
                    <Badge 
                      variant={
                        employee.status === "ACTIVE" ? "default" :
                        employee.status === "TERMINATED" ? "destructive" :
                        "secondary"
                      }
                      className="scale-90 origin-left"
                    >
                      {employee.status === "ACTIVE" ? "Active" :
                       employee.status === "INACTIVE" ? "Inactive" :
                       employee.status === "ON_LEAVE" ? "On Leave" :
                       employee.status === "ON_HOLD" ? "On Hold" :
                       employee.status === "RESIGNED" ? "Resigned" :
                       employee.status === "LEFT" ? "Left" :
                       employee.status === "TERMINATED" ? "Terminated" : employee.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs">{format(new Date(employee.joiningDate), "PP")}</TableCell>
                  <TableCell 
                    className="text-right"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <EmployeeForm 
                      employee={employee} 
                      departments={departments}
                      locations={locations}
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <EmployeeDetailsSheet 
        employeeId={selectedId}
        isOpen={isDetailsOpen}
        onOpenChange={setIsDetailsOpen}
      />

      {/* Bulk Action Confirmation & Result Dialog */}
      <Dialog open={isBulkConfirmOpen} onOpenChange={(open) => !open && resetBulk()}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {bulkResult ? "Operation Result" : `Confirm Bulk ${bulkActionType === "DELETE" ? "Delete" : "Deactivation"}`}
            </DialogTitle>
            <DialogDescription>
              {bulkResult 
                ? `Processed ${selectedIds.size} employees.`
                : `Are you sure you want to ${bulkActionType === "DELETE" ? "permanently delete" : "deactivate"} ${selectedIds.size} selected employees? This action will be validated for dependencies.`
              }
            </DialogDescription>
          </DialogHeader>

          {bulkResult ? (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-4 bg-muted p-3 rounded-lg">
                <div className="flex-1 text-center">
                  <div className="text-2xl font-bold text-primary">{bulkResult.successCount}</div>
                  <div className="text-xs text-muted-foreground uppercase">Successful</div>
                </div>
                <div className="w-px h-8 bg-border" />
                <div className="flex-1 text-center">
                  <div className="text-2xl font-bold text-destructive">{bulkResult.blockedCount}</div>
                  <div className="text-xs text-muted-foreground uppercase">Blocked</div>
                </div>
              </div>

              {bulkResult.details.length > 0 && (
                <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2">
                  <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">Blocking Details:</p>
                  {bulkResult.details.map((d: any, i: number) => (
                    <Alert key={i} variant="destructive" className="py-2">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription className="text-xs">
                        <span className="font-semibold">{d.name}</span>: {d.reason}
                      </AlertDescription>
                    </Alert>
                  ))}
                </div>
              )}
              
              {bulkResult.successCount > 0 && bulkResult.blockedCount === 0 && (
                <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 p-3 rounded-md">
                  <CheckCircle2 className="h-4 w-4" />
                  All selected employees processed successfully.
                </div>
              )}
            </div>
          ) : (
            <div className="py-4">
              {bulkActionType === "DELETE" && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Warning</AlertTitle>
                  <AlertDescription>
                    Permanent deletion cannot be undone. System will block deletion if audit trails (transfers) or active assets exist.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          <DialogFooter>
            {bulkResult ? (
              <Button onClick={resetBulk}>Close</Button>
            ) : (
              <>
                <Button variant="ghost" onClick={() => setIsBulkConfirmOpen(false)} disabled={isProcessing}>
                  Cancel
                </Button>
                <Button 
                  variant={bulkActionType === "DELETE" ? "destructive" : "default"}
                  onClick={handleBulkAction}
                  disabled={isProcessing}
                >
                  {isProcessing ? "Processing..." : "Confirm"}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
