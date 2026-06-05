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
  ChevronDown,
  AlertCircle,
  CheckCircle2,
  X,
  Check,
  RotateCcw,
  SlidersHorizontal,
  Tag,
  MapPin,
  Building2,
  Users,
  UserCheck,
  UserMinus,
  Clock,
  Sparkles,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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

/* ── Status config palette ── */
const STATUS_CONFIG: Record<
  string,
  { label: string; bg: string; text: string; dot: string; ring: string; pulse?: boolean }
> = {
  ACTIVE: {
    label: "Active",
    bg: "bg-emerald-500/10",
    text: "text-emerald-600 dark:text-emerald-400",
    dot: "bg-emerald-500",
    ring: "ring-emerald-500/20",
    pulse: true,
  },
  INACTIVE: {
    label: "Inactive",
    bg: "bg-zinc-500/10",
    text: "text-zinc-500 dark:text-zinc-400",
    dot: "bg-zinc-400",
    ring: "ring-zinc-400/20",
  },
  ON_LEAVE: {
    label: "On Leave",
    bg: "bg-amber-500/10",
    text: "text-amber-600 dark:text-amber-400",
    dot: "bg-amber-500",
    ring: "ring-amber-500/20",
  },
  ON_HOLD: {
    label: "On Hold",
    bg: "bg-orange-500/10",
    text: "text-orange-600 dark:text-orange-400",
    dot: "bg-orange-500",
    ring: "ring-orange-500/20",
  },
  RESIGNED: {
    label: "Resigned",
    bg: "bg-violet-500/10",
    text: "text-violet-600 dark:text-violet-400",
    dot: "bg-violet-500",
    ring: "ring-violet-500/20",
  },
  LEFT: {
    label: "Left",
    bg: "bg-slate-500/10",
    text: "text-slate-500 dark:text-slate-400",
    dot: "bg-slate-400",
    ring: "ring-slate-400/20",
  },
  TERMINATED: {
    label: "Terminated",
    bg: "bg-rose-500/10",
    text: "text-rose-600 dark:text-rose-400",
    dot: "bg-rose-500",
    ring: "ring-rose-500/20",
  },
}

const sortOptions = [
  { label: "Name A → Z", value: "fullName" as SortKey, order: "asc" as SortOrder, icon: ArrowUp },
  { label: "Name Z → A", value: "fullName" as SortKey, order: "desc" as SortOrder, icon: ArrowDown },
  { label: "Code A → Z", value: "employeeCode" as SortKey, order: "asc" as SortOrder, icon: ArrowUp },
  { label: "Code Z → A", value: "employeeCode" as SortKey, order: "desc" as SortOrder, icon: ArrowDown },
  { label: "Joining Date ↓ (Newest)", value: "joiningDate" as SortKey, order: "desc" as SortOrder, icon: ArrowDown },
  { label: "Joining Date ↑ (Oldest)", value: "joiningDate" as SortKey, order: "asc" as SortOrder, icon: ArrowUp },
  { label: "Status ↑", value: "status" as SortKey, order: "asc" as SortOrder, icon: ArrowUp },
  { label: "Status ↓", value: "status" as SortKey, order: "desc" as SortOrder, icon: ArrowDown },
]

const quickFilters = [
  { label: "All", value: null, icon: Users },
  { label: "Active", value: "ACTIVE", icon: UserCheck },
  { label: "On Leave", value: "ON_LEAVE", icon: Clock },
  { label: "Inactive", value: "INACTIVE", icon: UserMinus },
  { label: "Terminated", value: "TERMINATED", icon: Sparkles },
]

/* Avatar initials helper */
function getInitials(name: string) {
  const parts = name.trim().split(" ")
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

/* Deterministic hue from a string */
function getAvatarHue(str: string) {
  let hash = 0
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash)
  return Math.abs(hash) % 360
}

export function EmployeeList({ employees, departments, locations }: EmployeeListProps) {
  const router = useRouter()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Search
  const [searchQuery, setSearchQuery] = useState("")

  // Filters
  const [statusFilters, setStatusFilters] = useState<string[]>([])
  const [deptFilter, setDeptFilter] = useState<string | null>(null)
  const [locFilter, setLocFilter] = useState<string | null>(null)
  const [quickFilter, setQuickFilter] = useState<string | null>(null)

  // Filter panel
  const [filtersExpanded, setFiltersExpanded] = useState(false)

  // Sorting
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; order: SortOrder }>({
    key: "fullName",
    order: "asc",
  })

  // Bulk Action States
  const [isBulkConfirmOpen, setIsBulkConfirmOpen] = useState(false)
  const [bulkActionType, setBulkActionType] = useState<"INACTIVE" | "DELETE" | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [bulkResult, setBulkResult] = useState<{
    successCount: number
    blockedCount: number
    details: any[]
  } | null>(null)

  const handleRowClick = (id: string) => {
    setSelectedId(id)
    setIsDetailsOpen(true)
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredAndSortedEmployees.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredAndSortedEmployees.map((e) => e.id)))
    }
  }

  const toggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) newSelected.delete(id)
    else newSelected.add(id)
    setSelectedIds(newSelected)
  }

  const handleSort = (key: SortKey) => {
    setSortConfig((prev) => ({
      key,
      order: prev.key === key && prev.order === "asc" ? "desc" : "asc",
    }))
  }

  const toggleStatusFilter = (status: string) => {
    setQuickFilter(null)
    setStatusFilters((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]
    )
  }

  const applyQuickFilter = (value: string | null) => {
    setQuickFilter(value)
    setStatusFilters([])
  }

  const totalActiveFilters =
    statusFilters.length +
    (deptFilter ? 1 : 0) +
    (locFilter ? 1 : 0)

  const clearAllFilters = () => {
    setSearchQuery("")
    setStatusFilters([])
    setDeptFilter(null)
    setLocFilter(null)
    setQuickFilter(null)
  }

  const filteredAndSortedEmployees = useMemo(() => {
    let result = [...employees]

    // Quick filter
    if (quickFilter) {
      result = result.filter((e) => e.status === quickFilter)
    }

    // Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter(
        (e) =>
          e.fullName.toLowerCase().includes(q) ||
          e.employeeCode.toLowerCase().includes(q) ||
          (e.email && e.email.toLowerCase().includes(q)) ||
          (e.phone && e.phone.toLowerCase().includes(q)) ||
          (e.designation && e.designation.toLowerCase().includes(q))
      )
    }

    // Status multi-filter
    if (statusFilters.length > 0) {
      result = result.filter((e) => statusFilters.includes(e.status))
    }

    // Dept filter
    if (deptFilter) result = result.filter((e) => e.departmentId === deptFilter)

    // Loc filter
    if (locFilter) result = result.filter((e) => e.locationId === locFilter)

    // Sort
    result.sort((a, b) => {
      let valA: any = ""
      let valB: any = ""

      switch (sortConfig.key) {
        case "fullName": valA = a.fullName; valB = b.fullName; break
        case "employeeCode": valA = a.employeeCode; valB = b.employeeCode; break
        case "department": valA = a.department?.name || ""; valB = b.department?.name || ""; break
        case "location": valA = a.location?.name || ""; valB = b.location?.name || ""; break
        case "joiningDate": valA = new Date(a.joiningDate).getTime(); valB = new Date(b.joiningDate).getTime(); break
        case "status": valA = a.status; valB = b.status; break
      }

      if (valA < valB) return sortConfig.order === "asc" ? -1 : 1
      if (valA > valB) return sortConfig.order === "asc" ? 1 : -1
      return 0
    })

    return result
  }, [employees, searchQuery, statusFilters, deptFilter, locFilter, quickFilter, sortConfig])

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
          type: bulkActionType,
        }),
      })
      if (!res.ok) throw new Error("Bulk action failed")
      const data = await res.json()
      setBulkResult(data)
      if (data.successCount > 0) router.refresh()
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
    if (sortConfig.key !== column) return <ArrowUpDown className="ml-1 h-3.5 w-3.5 opacity-40" />
    return sortConfig.order === "asc"
      ? <ArrowUp className="ml-1 h-3.5 w-3.5 text-primary" />
      : <ArrowDown className="ml-1 h-3.5 w-3.5 text-primary" />
  }

  /* ── Shared trigger style ── */
  const triggerCls = (active: boolean) =>
    cn(
      "inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs font-semibold uppercase tracking-wider",
      "border shadow-2xs cursor-pointer select-none",
      "transition-all duration-300 ease-out",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      "hover:shadow-xs hover:border-muted-foreground/30",
      active
        ? "border-primary/20 bg-primary/8 text-primary shadow-xs"
        : "border-border/60 bg-card text-muted-foreground/80 hover:text-foreground hover:bg-muted/30"
    )

  const countBubble = (n: number) =>
    n > 0 ? (
      <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground leading-none px-1 shadow-sm">
        {n}
      </span>
    ) : null

  const menuLabel = (text: string) => (
    <p className="px-2 pb-1 pt-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground/70">
      {text}
    </p>
  )

  const activeSortOption = sortOptions.find(
    (s) => s.value === sortConfig.key && s.order === sortConfig.order
  )

  /* ── Active filter chips ── */
  const filterChips: { label: string; key: string; value?: string }[] = []
  statusFilters.forEach((s) => {
    filterChips.push({ label: STATUS_CONFIG[s]?.label || s, key: "status", value: s })
  })
  if (deptFilter) {
    const dept = departments.find((d) => d.id === deptFilter)
    filterChips.push({ label: dept?.name || deptFilter, key: "dept" })
  }
  if (locFilter) {
    const loc = locations.find((l) => l.id === locFilter)
    filterChips.push({ label: loc?.name || locFilter, key: "loc" })
  }

  return (
    <div className="space-y-0">
      {/* ══════════════════════════════════════
           SEARCH + QUICK FILTERS ROW
         ══════════════════════════════════════ */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between py-3 pb-3">
        {/* Search Input */}
        <div className="relative flex-1 max-w-sm group/search">
          <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-focus-within/search:opacity-100 transition-opacity duration-300 -m-0.5 pointer-events-none" />
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50 pointer-events-none transition-colors group-focus-within/search:text-primary" />
          <Input
            placeholder="Search name, code, email, designation…"
            className="pl-10 pr-10 h-10 rounded-xl border-border/60 bg-card shadow-sm text-sm focus-visible:border-primary/40 focus-visible:ring-2 focus-visible:ring-primary/10 transition-all duration-200"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground/60 hover:text-foreground hover:bg-muted/80 transition-all duration-150"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Quick Filter Pills */}
        <div className="flex items-center gap-0.5 rounded-xl bg-muted/40 p-0.5 border border-border/40 shadow-3xs overflow-x-auto no-scrollbar">
          {quickFilters.map((q) => {
            const Icon = q.icon
            const isActive =
              quickFilter === q.value ||
              (q.value === null && !quickFilter && statusFilters.length === 0)
            return (
              <button
                key={q.label}
                onClick={() => applyQuickFilter(q.value)}
                className={cn(
                  "relative inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider whitespace-nowrap",
                  "transition-all duration-200 ease-out",
                  isActive
                    ? "bg-background text-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-background/40"
                )}
              >
                <Icon className={cn("h-3 w-3", isActive ? "text-primary scale-110" : "text-muted-foreground/80")} />
                {q.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* ══════════════════════════════════════
           FILTERS + SORT ROW
         ══════════════════════════════════════ */}
      <div className="space-y-2 pb-3">
        <div className="flex items-center justify-between gap-2">
          {/* Filters Toggle */}
          <button
            onClick={() => setFiltersExpanded((v) => !v)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold uppercase tracking-wider",
              "border border-border/60 bg-card shadow-2xs cursor-pointer",
              "transition-all duration-200 hover:shadow-xs hover:border-muted-foreground/30",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              filtersExpanded && "bg-primary/8 border-primary/20 text-primary"
            )}
          >
            <SlidersHorizontal className={cn("h-3 w-3", filtersExpanded ? "text-primary scale-110" : "text-muted-foreground/80")} />
            Filters
            {totalActiveFilters > 0 && (
              <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground leading-none px-1">
                {totalActiveFilters}
              </span>
            )}
            <ChevronDown
              className={cn(
                "h-3 w-3 opacity-50 transition-transform duration-200",
                filtersExpanded && "rotate-180"
              )}
            />
          </button>

          <div className="flex items-center gap-2">
            {/* Sort Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger className={triggerCls(!!activeSortOption)}>
                <ArrowUpDown className="h-3.5 w-3.5" />
                <span className="hidden sm:inline max-w-[130px] truncate">
                  {activeSortOption?.label || "Sort"}
                </span>
                <ChevronDown className="h-3 w-3 opacity-40" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[230px] p-1.5">
                {menuLabel("Sort By")}
                <DropdownMenuSeparator className="my-1 opacity-50" />
                {sortOptions.map((opt) => {
                  const isActive = sortConfig.key === opt.value && sortConfig.order === opt.order
                  const Icon = opt.icon
                  return (
                    <DropdownMenuItem
                      key={`${opt.value}-${opt.order}`}
                      className={cn(
                        "rounded-lg flex items-center gap-2 py-2 px-2.5 cursor-pointer",
                        isActive && "bg-primary/[0.07] text-primary"
                      )}
                      onClick={() => setSortConfig({ key: opt.value, order: opt.order })}
                    >
                      <Icon className="h-3.5 w-3.5 shrink-0 opacity-50" />
                      <span className="flex-1 text-[13px]">{opt.label}</span>
                      {isActive && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                    </DropdownMenuItem>
                  )
                })}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Bulk selection chip */}
            {selectedIds.size > 0 && (
              <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-3 duration-200 rounded-xl border border-amber-500/20 bg-amber-500/[0.04] px-3 py-1.5 shadow-sm">
                <span className="text-xs font-bold text-amber-600 tabular-nums">{selectedIds.size}</span>
                <span className="text-xs text-amber-600/70">selected</span>
                <div className="h-3.5 w-px bg-amber-500/20" />
                <Button
                  size="sm"
                  variant="outline"
                  className="h-6 text-[11px] px-2 rounded-md shadow-sm border-amber-500/30 text-amber-700 hover:text-amber-800 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950/30"
                  onClick={() => { setBulkActionType("INACTIVE"); setIsBulkConfirmOpen(true) }}
                >
                  <UserX className="h-3 w-3 mr-1" />
                  Deactivate
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  className="h-6 text-[11px] px-2 rounded-md shadow-sm"
                  onClick={() => { setBulkActionType("DELETE"); setIsBulkConfirmOpen(true) }}
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Delete
                </Button>
                <button
                  onClick={() => setSelectedIds(new Set())}
                  className="text-[11px] text-muted-foreground hover:text-foreground transition-colors px-1"
                >
                  Clear
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Expandable filter panel */}
        <div
          className={cn(
            "grid transition-all duration-300 ease-[cubic-bezier(.4,0,.2,1)]",
            filtersExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
          )}
        >
          <div className="overflow-hidden">
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/50 bg-muted/20 p-3 backdrop-blur-sm shadow-inner">
              {/* Status multi-filter */}
              <DropdownMenu>
                <DropdownMenuTrigger className={triggerCls(statusFilters.length > 0)}>
                  <Tag className="h-3.5 w-3.5" />
                  Status
                  {countBubble(statusFilters.length)}
                  <ChevronDown className="h-3 w-3 opacity-40" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-[210px] p-1.5">
                  {menuLabel("Filter by Status")}
                  <DropdownMenuSeparator className="my-1 opacity-50" />
                  {Object.entries(STATUS_CONFIG).map(([value, cfg]) => (
                    <DropdownMenuCheckboxItem
                      key={value}
                      checked={statusFilters.includes(value)}
                      onCheckedChange={() => toggleStatusFilter(value)}
                      className="rounded-lg py-2 px-2 cursor-pointer"
                    >
                      <span className={cn("inline-flex items-center gap-2 text-[13px] font-medium", cfg.text)}>
                        <span className={cn("h-2 w-2 rounded-full ring-2 shadow-sm", cfg.dot, cfg.ring)} />
                        {cfg.label}
                      </span>
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Department filter */}
              <DropdownMenu>
                <DropdownMenuTrigger className={triggerCls(!!deptFilter)}>
                  <Building2 className="h-3.5 w-3.5" />
                  {deptFilter ? departments.find((d) => d.id === deptFilter)?.name || "Department" : "Department"}
                  {deptFilter && <span className="h-1.5 w-1.5 rounded-full bg-primary animate-in zoom-in duration-200" />}
                  <ChevronDown className="h-3 w-3 opacity-40" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-[220px] max-h-[280px] overflow-y-auto p-1.5">
                  {menuLabel("Filter by Department")}
                  <DropdownMenuSeparator className="my-1 opacity-50" />
                  <DropdownMenuItem
                    onClick={() => setDeptFilter(null)}
                    className="rounded-lg flex items-center justify-between py-1.5 cursor-pointer"
                  >
                    All Departments
                    {!deptFilter && <Check className="h-3.5 w-3.5 text-primary" />}
                  </DropdownMenuItem>
                  {departments.map((d) => (
                    <DropdownMenuItem
                      key={d.id}
                      className="rounded-lg flex items-center justify-between py-1.5 cursor-pointer"
                      onClick={() => setDeptFilter(d.id)}
                    >
                      {d.name}
                      {deptFilter === d.id && <Check className="h-3.5 w-3.5 text-primary" />}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Location filter */}
              <DropdownMenu>
                <DropdownMenuTrigger className={triggerCls(!!locFilter)}>
                  <MapPin className="h-3.5 w-3.5" />
                  {locFilter ? locations.find((l) => l.id === locFilter)?.name || "Location" : "Location"}
                  {locFilter && <span className="h-1.5 w-1.5 rounded-full bg-primary animate-in zoom-in duration-200" />}
                  <ChevronDown className="h-3 w-3 opacity-40" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-[220px] max-h-[280px] overflow-y-auto p-1.5">
                  {menuLabel("Filter by Location")}
                  <DropdownMenuSeparator className="my-1 opacity-50" />
                  <DropdownMenuItem
                    onClick={() => setLocFilter(null)}
                    className="rounded-lg flex items-center justify-between py-1.5 cursor-pointer"
                  >
                    All Locations
                    {!locFilter && <Check className="h-3.5 w-3.5 text-primary" />}
                  </DropdownMenuItem>
                  {locations.map((l) => (
                    <DropdownMenuItem
                      key={l.id}
                      className="rounded-lg flex items-center justify-between py-1.5 cursor-pointer"
                      onClick={() => setLocFilter(l.id)}
                    >
                      {l.name}
                      {locFilter === l.id && <Check className="h-3.5 w-3.5 text-primary" />}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Clear all */}
              {(totalActiveFilters > 0 || quickFilter) && (
                <>
                  <div className="h-5 w-px bg-border/40 mx-1" />
                  <button
                    onClick={clearAllFilters}
                    className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-medium text-muted-foreground hover:text-foreground hover:bg-background/80 transition-all duration-150"
                  >
                    <RotateCcw className="h-3 w-3" />
                    Clear all
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════
           ACTIVE FILTER CHIPS
         ══════════════════════════════════════ */}
      {(filterChips.length > 0 || searchQuery || quickFilter) && (
        <div className="flex flex-wrap items-center gap-1.5 pb-3 animate-in fade-in slide-in-from-top-2 duration-300">
          <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground/50 mr-1">
            Showing
          </span>

          {searchQuery && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-card border border-border/60 px-2.5 py-1 text-xs font-medium shadow-sm transition-all hover:shadow-md">
              <Search className="h-3 w-3 text-muted-foreground/60" />
              <span className="max-w-[140px] truncate">&ldquo;{searchQuery}&rdquo;</span>
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="rounded-full p-0.5 text-muted-foreground/40 hover:text-foreground hover:bg-muted transition-all"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}

          {quickFilter && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/15 bg-primary/[0.04] px-2.5 py-1 text-xs font-medium text-primary shadow-sm transition-all hover:shadow-md hover:bg-primary/[0.08]">
              <Sparkles className="h-3 w-3 opacity-50" />
              {quickFilters.find((q) => q.value === quickFilter)?.label || quickFilter}
              <button
                type="button"
                onClick={() => setQuickFilter(null)}
                className="rounded-full p-0.5 text-primary/40 hover:text-primary hover:bg-primary/10 transition-all"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}

          {filterChips.map((chip, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1.5 rounded-full border border-primary/15 bg-primary/[0.04] px-2.5 py-1 text-xs font-medium text-primary shadow-sm transition-all hover:shadow-md hover:bg-primary/[0.08] animate-in fade-in zoom-in-95 duration-200"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              {chip.key === "status" ? <Tag className="h-3 w-3 opacity-50" /> :
               chip.key === "dept" ? <Building2 className="h-3 w-3 opacity-50" /> :
               <MapPin className="h-3 w-3 opacity-50" />}
              {chip.label}
              <button
                type="button"
                onClick={() => {
                  if (chip.key === "status" && chip.value) toggleStatusFilter(chip.value)
                  else if (chip.key === "dept") setDeptFilter(null)
                  else if (chip.key === "loc") setLocFilter(null)
                }}
                className="rounded-full p-0.5 text-primary/40 hover:text-primary hover:bg-primary/10 transition-all"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* ══════════════════════════════════════
           TABLE
         ══════════════════════════════════════ */}
      <div className="rounded-xl border border-border/40 bg-card overflow-hidden shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/20 border-b border-border/40 hover:bg-muted/20">
              <TableHead className="w-[44px] pl-4">
                <Checkbox
                  checked={selectedIds.size > 0 && selectedIds.size === filteredAndSortedEmployees.length}
                  onChange={toggleSelectAll}
                />
              </TableHead>
              <TableHead
                onClick={() => handleSort("employeeCode")}
                className="cursor-pointer text-[10px] font-bold tracking-wider uppercase text-muted-foreground/70 select-none w-[110px]"
              >
                <div className="flex items-center">Code <SortIcon column="employeeCode" /></div>
              </TableHead>
              <TableHead
                onClick={() => handleSort("fullName")}
                className="cursor-pointer text-[10px] font-bold tracking-wider uppercase text-muted-foreground/70 select-none"
              >
                <div className="flex items-center">Employee <SortIcon column="fullName" /></div>
              </TableHead>
              <TableHead className="text-[10px] font-bold tracking-wider uppercase text-muted-foreground/70">
                Contact
              </TableHead>
              <TableHead
                onClick={() => handleSort("department")}
                className="cursor-pointer text-[10px] font-bold tracking-wider uppercase text-muted-foreground/70 select-none"
              >
                <div className="flex items-center">Dept / Location <SortIcon column="department" /></div>
              </TableHead>
              <TableHead className="text-[10px] font-bold tracking-wider uppercase text-muted-foreground/70">
                Designation
              </TableHead>
              <TableHead
                onClick={() => handleSort("status")}
                className="cursor-pointer text-[10px] font-bold tracking-wider uppercase text-muted-foreground/70 select-none"
              >
                <div className="flex items-center">Status <SortIcon column="status" /></div>
              </TableHead>
              <TableHead
                onClick={() => handleSort("joiningDate")}
                className="cursor-pointer text-[10px] font-bold tracking-wider uppercase text-muted-foreground/70 select-none whitespace-nowrap"
              >
                <div className="flex items-center">Joined <SortIcon column="joiningDate" /></div>
              </TableHead>
              <TableHead className="sticky right-0 bg-muted/20 z-20 text-right border-l border-border/40 pr-4 text-[10px] font-bold tracking-wider uppercase text-muted-foreground/70">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAndSortedEmployees.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={9} className="h-48">
                  <div className="flex flex-col items-center justify-center gap-3 text-center py-8">
                    <div className="h-14 w-14 rounded-full bg-muted/60 flex items-center justify-center">
                      <Users className="h-7 w-7 text-muted-foreground/40" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-muted-foreground">No employees found</p>
                      <p className="text-xs text-muted-foreground/60 mt-1">Try adjusting your search or filter criteria</p>
                    </div>
                    {(searchQuery || statusFilters.length > 0 || deptFilter || locFilter || quickFilter) && (
                      <button
                        onClick={clearAllFilters}
                        className="text-xs text-primary hover:underline flex items-center gap-1"
                      >
                        <RotateCcw className="h-3 w-3" /> Clear all filters
                      </button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredAndSortedEmployees.map((employee) => {
                const statusCfg = STATUS_CONFIG[employee.status] || STATUS_CONFIG["INACTIVE"]
                const hue = getAvatarHue(employee.id)
                const isSelected = selectedIds.has(employee.id)

                return (
                  <TableRow
                    key={employee.id}
                    className={cn(
                      "cursor-pointer border-b border-border/30 group/row",
                      "transition-all duration-150 ease-out",
                      "hover:bg-primary/[0.025] hover:shadow-[inset_3px_0_0_0] hover:shadow-primary/30",
                      isSelected && "bg-primary/[0.04] shadow-[inset_3px_0_0_0] shadow-primary/50"
                    )}
                    onClick={() => handleRowClick(employee.id)}
                  >
                    {/* Checkbox */}
                    <TableCell onClick={(e) => e.stopPropagation()} className="pl-4">
                      <Checkbox
                        checked={isSelected}
                        onChange={(e) => toggleSelect(employee.id, e as any)}
                      />
                    </TableCell>

                    {/* Code */}
                    <TableCell>
                      <code className="rounded-md bg-muted/70 px-1.5 py-0.5 text-[11px] font-mono font-semibold tracking-tight text-muted-foreground/80 border border-border/40">
                        {employee.employeeCode}
                      </code>
                    </TableCell>

                    {/* Employee (avatar + name) */}
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        {/* Avatar circle */}
                        <div
                          className="h-8 w-8 shrink-0 rounded-full flex items-center justify-center text-[11px] font-bold text-white shadow-sm ring-2 ring-white/10 dark:ring-black/20"
                          style={{
                            background: `linear-gradient(135deg, hsl(${hue} 60% 55%), hsl(${(hue + 40) % 360} 60% 45%))`,
                          }}
                        >
                          {getInitials(employee.fullName)}
                        </div>
                        <div className="flex flex-col gap-0.5 min-w-0">
                          <span className="font-semibold text-[13px] text-foreground/90 leading-tight truncate max-w-[160px]">
                            {employee.fullName}
                          </span>
                          {employee.user && (
                            <span className="text-[9px] text-primary bg-primary/8 border border-primary/15 px-1 py-px rounded font-bold uppercase tracking-wider w-fit">
                              Portal User
                            </span>
                          )}
                        </div>
                      </div>
                    </TableCell>

                    {/* Contact */}
                    <TableCell>
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <span className="text-xs text-muted-foreground truncate max-w-[180px]">
                          {employee.email || "—"}
                        </span>
                        {employee.phone && (
                          <span className="text-[10px] text-muted-foreground/60">
                            {employee.phone}
                          </span>
                        )}
                      </div>
                    </TableCell>

                    {/* Dept / Location */}
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs font-semibold text-foreground/80 leading-tight">
                          {employee.department?.name || "—"}
                        </span>
                        <span className="text-[10px] text-muted-foreground/60 flex items-center gap-0.5">
                          {employee.location?.name && <MapPin className="h-2.5 w-2.5 shrink-0" />}
                          {employee.location?.name || "—"}
                        </span>
                      </div>
                    </TableCell>

                    {/* Designation */}
                    <TableCell>
                      <span className="text-xs text-muted-foreground">
                        {employee.designation || "—"}
                      </span>
                    </TableCell>

                    {/* Status badge */}
                    <TableCell>
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full px-2 py-[3px] text-[10px] font-semibold tracking-wider uppercase border shadow-2xs",
                          statusCfg.bg,
                          statusCfg.text,
                          `ring-1 ${statusCfg.ring}`
                        )}
                      >
                        <span
                          className={cn(
                            "h-[5px] w-[5px] rounded-full",
                            statusCfg.dot,
                            statusCfg.pulse && "animate-pulse duration-1000"
                          )}
                        />
                        {statusCfg.label}
                      </span>
                    </TableCell>

                    {/* Joining date */}
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {format(new Date(employee.joiningDate), "dd MMM yyyy")}
                    </TableCell>

                    {/* Actions (sticky) */}
                    <TableCell
                      className="sticky right-0 bg-card z-10 text-right border-l border-border/30 pr-3 shadow-[-4px_0_12px_-4px_rgba(0,0,0,0.05)]"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex justify-end items-center gap-1">
                        <EmployeeForm
                          employee={employee}
                          departments={departments}
                          locations={locations}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>

        {/* Table footer summary */}
        {filteredAndSortedEmployees.length > 0 && (
          <div className="flex items-center justify-between px-4 py-2.5 border-t border-border/30 bg-muted/10">
            <span className="text-[11px] text-muted-foreground/60">
              Showing{" "}
              <span className="font-semibold text-foreground/70">{filteredAndSortedEmployees.length}</span>
              {" "}of{" "}
              <span className="font-semibold text-foreground/70">{employees.length}</span>
              {" "}employees
            </span>
            {selectedIds.size > 0 && (
              <span className="text-[11px] font-semibold text-primary">
                {selectedIds.size} selected
              </span>
            )}
          </div>
        )}
      </div>

      <EmployeeDetailsSheet
        employeeId={selectedId}
        isOpen={isDetailsOpen}
        onOpenChange={setIsDetailsOpen}
      />

      {/* ══════════════════════════════════════
           BULK ACTION DIALOG
         ══════════════════════════════════════ */}
      <Dialog open={isBulkConfirmOpen} onOpenChange={(open) => !open && resetBulk()}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {bulkResult
                ? "Operation Result"
                : `Confirm Bulk ${bulkActionType === "DELETE" ? "Delete" : "Deactivation"}`}
            </DialogTitle>
            <DialogDescription>
              {bulkResult
                ? `Processed ${selectedIds.size} employees.`
                : `Are you sure you want to ${bulkActionType === "DELETE" ? "permanently delete" : "deactivate"} ${selectedIds.size} selected employees? This action will be validated for dependencies.`}
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
                <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 dark:bg-green-950/30 dark:text-green-400 p-3 rounded-md">
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
                    Permanent deletion cannot be undone. System will block deletion if audit trails
                    (transfers) or active assets exist.
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
                  {isProcessing ? "Processing…" : "Confirm"}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
