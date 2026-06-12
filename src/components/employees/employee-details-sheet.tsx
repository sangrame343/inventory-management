"use client"

import { useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Mail,
  Phone,
  Calendar,
  MapPin,
  Building2,
  Briefcase,
  Package,
  Printer,
  Download,
  Link2,
  Loader2,
  History,
  User2,
  CheckCircle2,
  Clock,
  XCircle,
  Tag,
  CalendarDays,
  Info,
  ChevronRight,
} from "lucide-react"
import { format } from "date-fns"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"

interface EmployeeDetailsSheetProps {
  employeeId: string | null
  isOpen: boolean
  onOpenChange: (open: boolean) => void
}

const AVATAR_PALETTES = [
  "from-violet-500 to-indigo-600",
  "from-emerald-500 to-teal-600",
  "from-amber-500 to-orange-600",
  "from-rose-500 to-pink-600",
  "from-sky-500 to-blue-600",
  "from-fuchsia-500 to-purple-600",
]

const STATUS_CONFIG: Record<string, { label: string; badge: string; dot: string }> = {
  ACTIVE:      { label: "Active",      dot: "bg-emerald-400", badge: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800/50" },
  INACTIVE:    { label: "Inactive",    dot: "bg-slate-400",   badge: "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700" },
  ON_LEAVE:    { label: "On Leave",    dot: "bg-amber-400",   badge: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800/50" },
  ON_HOLD:     { label: "On Hold",     dot: "bg-orange-400",  badge: "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/30 dark:text-orange-300 dark:border-orange-800/50" },
  RESIGNED:    { label: "Resigned",    dot: "bg-rose-400",    badge: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-300 dark:border-rose-800/50" },
  LEFT:        { label: "Left",        dot: "bg-rose-400",    badge: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-300 dark:border-rose-800/50" },
  TERMINATED:  { label: "Terminated",  dot: "bg-red-500",     badge: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-300 dark:border-red-800/50" },
}

const CONDITION_CONFIG: Record<string, string> = {
  EXCELLENT: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300",
  GOOD:      "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300",
  FAIR:      "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300",
  POOR:      "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-300",
  DAMAGED:   "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-300",
}

type Tab = "info" | "assets" | "history"

export function EmployeeDetailsSheet({
  employeeId,
  isOpen,
  onOpenChange,
}: EmployeeDetailsSheetProps) {
  const [data, setData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isError, setIsError] = useState(false)
  const [generatingLink, setGeneratingLink] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>("info")

  useEffect(() => {
    if (isOpen && employeeId) {
      setActiveTab("info")
      fetchEmployeeDetails(employeeId)
    } else if (!isOpen) {
      const timer = setTimeout(() => setData(null), 300)
      return () => clearTimeout(timer)
    }
  }, [isOpen, employeeId])

  const fetchEmployeeDetails = async (id: string) => {
    setIsLoading(true)
    setIsError(false)
    try {
      const response = await fetch(`/api/employees/${id}`)
      if (!response.ok) throw new Error("Failed to fetch")
      const result = await response.json()
      setData(result)
    } catch (error) {
      console.error(error)
      setIsError(true)
    } finally {
      setIsLoading(false)
    }
  }

  const getInitials = (name: string) =>
    name.split(" ").map((n) => n[0]).join("").toUpperCase().substring(0, 2)

  const avatarGradient =
    AVATAR_PALETTES[(data?.fullName?.charCodeAt(0) ?? 0) % AVATAR_PALETTES.length]

  const statusCfg = STATUS_CONFIG[data?.status] ?? {
    label: data?.status ?? "",
    dot: "bg-slate-400",
    badge: "bg-slate-100 text-slate-600 border-slate-200",
  }

  const hasPendingHandovers = data?.assignments?.some(
    (a: any) => !a.acknowledgement || a.acknowledgement.status !== "ACKNOWLEDGED"
  )

  const handlePrint = () => {
    if (!data) return
    const printWindow = window.open("", "_blank")
    if (!printWindow) return

    const html = `
      <html>
        <head>
          <title>Employee Asset Report - ${data.fullName}</title>
          <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
          <style>
            body { font-family: sans-serif; background: white; color: black; padding: 40px; }
            @media print { body { padding: 20px; } }
          </style>
        </head>
        <body>
          <div class="max-w-4xl mx-auto">
            <div class="flex justify-between items-start border-b-2 border-gray-900 pb-6 mb-6">
              <div>
                <h1 class="text-3xl font-bold tracking-tight text-gray-900">${data.fullName}</h1>
                <p class="text-sm font-mono text-gray-500 mt-1">Employee Code: ${data.employeeCode}</p>
                <p class="text-sm text-gray-600 mt-0.5">${data.designation || ""} • ${data.department?.name || "N/A"}</p>
              </div>
              <div class="text-right">
                <h2 class="text-lg font-bold text-gray-800 uppercase tracking-wide">Employee Asset Report</h2>
                <p class="text-xs text-gray-500 mt-1">Generated: ${new Date().toLocaleDateString()}</p>
              </div>
            </div>
            <div class="grid grid-cols-2 gap-6 mb-8 text-sm">
              <div class="border border-gray-200 p-4 rounded">
                <h3 class="font-bold text-gray-800 border-b pb-1 mb-2">Profile Details</h3>
                <p class="py-1"><span class="font-semibold text-gray-600">Email:</span> ${data.email || "N/A"}</p>
                <p class="py-1"><span class="font-semibold text-gray-600">Phone:</span> ${data.phone || "N/A"}</p>
                <p class="py-1"><span class="font-semibold text-gray-600">Location:</span> ${data.location?.name || "N/A"}</p>
              </div>
              <div class="border border-gray-200 p-4 rounded">
                <h3 class="font-bold text-gray-800 border-b pb-1 mb-2">Employment Details</h3>
                <p class="py-1"><span class="font-semibold text-gray-600">Department:</span> ${data.department?.name || "N/A"}</p>
                <p class="py-1"><span class="font-semibold text-gray-600">Designation:</span> ${data.designation || "N/A"}</p>
                <p class="py-1"><span class="font-semibold text-gray-600">Joining Date:</span> ${data.joiningDate ? new Date(data.joiningDate).toLocaleDateString() : "N/A"}</p>
              </div>
            </div>
            <div class="mb-8">
              <h3 class="text-base font-bold text-gray-800 border-b-2 border-gray-200 pb-1 mb-3">Currently Assigned Assets (${data.assignments?.length || 0})</h3>
              ${data.assignments && data.assignments.length > 0 ? `
                <table class="w-full text-left border-collapse text-xs border border-gray-200">
                  <thead><tr class="border-b bg-gray-50">
                    <th class="py-2 px-3 font-semibold text-gray-700">Asset Name</th>
                    <th class="py-2 px-3 font-semibold text-gray-700">Tag/Code</th>
                    <th class="py-2 px-3 font-semibold text-gray-700">Category</th>
                    <th class="py-2 px-3 font-semibold text-gray-700">Brand/Model</th>
                    <th class="py-2 px-3 font-semibold text-gray-700">Condition</th>
                    <th class="py-2 px-3 font-semibold text-gray-700">Assigned Date</th>
                  </tr></thead>
                  <tbody>
                    ${data.assignments.map((a: any) => `<tr class="border-b">
                      <td class="py-2.5 px-3 font-medium text-gray-900">${a.asset.name}</td>
                      <td class="py-2.5 px-3 font-mono text-gray-600">Tag: ${a.asset.assetTag}<br/>Code: ${a.asset.assetCode || "N/A"}</td>
                      <td class="py-2.5 px-3 text-gray-600">${a.asset.category?.name || "N/A"}</td>
                      <td class="py-2.5 px-3 text-gray-600">${a.asset.brand} / ${a.asset.model || "N/A"}</td>
                      <td class="py-2.5 px-3 text-gray-600">${a.physicalCondition || a.asset.status}</td>
                      <td class="py-2.5 px-3 text-gray-600">${new Date(a.assignedAt).toLocaleDateString()}</td>
                    </tr>`).join("")}
                  </tbody>
                </table>
              ` : `<p class="text-sm text-gray-500 italic py-2">No active assets currently assigned.</p>`}
            </div>
            <div class="mt-20 grid grid-cols-2 gap-12 text-xs">
              <div class="border-t border-gray-400 pt-3 text-center">
                <p class="font-semibold text-gray-800">Employee Signature</p>
                <p class="text-[10px] text-gray-400 mt-2">Date: __________________</p>
              </div>
              <div class="border-t border-gray-400 pt-3 text-center">
                <p class="font-semibold text-gray-800">Authorized Signatory / IT Admin</p>
                <p class="text-[10px] text-gray-400 mt-2">Date: __________________</p>
              </div>
            </div>
          </div>
          <script>window.onload = function() { window.print(); }</script>
        </body>
      </html>
    `
    printWindow.document.open()
    printWindow.document.write(html)
    printWindow.document.close()
  }

  const handleGetHandoverLink = async () => {
    if (!employeeId) return
    setGeneratingLink(true)
    try {
      const res = await fetch(`/api/employees/${employeeId}/acknowledgement-batch`, {
        method: "POST",
      })
      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || "Failed to generate handover link")
      }
      const resData = await res.json()
      const fullUrl = `${window.location.origin}${resData.link}`
      await navigator.clipboard.writeText(fullUrl)
      toast.success("Combined handover link copied to clipboard!")
    } catch (err: any) {
      toast.error(err.message || "Failed to generate link.")
    } finally {
      setGeneratingLink(false)
    }
  }

  const TABS: { key: Tab; label: string; icon: React.ElementType; count?: number }[] = [
    { key: "info",    label: "Profile Info", icon: Info },
    { key: "assets",  label: "Assets",       icon: Package, count: data?.assignments?.length ?? 0 },
    { key: "history", label: "History",      icon: History, count: data?.history?.length ?? 0 },
  ]

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={true}
        className="p-0 gap-0 w-full max-w-5xl sm:max-w-5xl overflow-hidden rounded-2xl border border-border/60 shadow-2xl"
      >
        {/* ── Visually-hidden required a11y title ── */}
        <DialogTitle className="sr-only">
          {data?.fullName ?? "Employee Details"}
        </DialogTitle>
        <DialogDescription className="sr-only">
          Comprehensive profile, assigned assets, and history for this employee.
        </DialogDescription>

        {/* ── Hero Header ─────────────────────────────── */}
        <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-8 pt-8 pb-0">
          {/* Decorative blobs */}
          <div className="pointer-events-none absolute -top-12 -right-12 h-56 w-56 rounded-full bg-violet-500/15 blur-3xl" />
          <div className="pointer-events-none absolute bottom-0 left-24 h-32 w-32 rounded-full bg-indigo-500/10 blur-2xl" />

          {isLoading ? (
            <div className="flex items-center gap-5 pb-6">
              <Skeleton className="h-20 w-20 rounded-2xl shrink-0" />
              <div className="space-y-2.5 flex-1">
                <Skeleton className="h-7 w-56" />
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-64" />
              </div>
            </div>
          ) : data ? (
            /* ── 3-column hero row: avatar | info | buttons ── */
            <div className="relative flex items-start gap-6 pb-6">

              {/* Col 1 – Avatar */}
              <div className={`flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${avatarGradient} text-2xl font-black text-white shadow-2xl ring-4 ring-white/10`}>
                {getInitials(data.fullName)}
              </div>

              {/* Col 2 – Name, code, meta, chips */}
              <div className="flex-1 min-w-0 pt-1">
                {/* Row 1: name + status badge */}
                <div className="flex items-center gap-3 flex-wrap">
                  <h2 className="text-2xl font-black text-white tracking-tight leading-none">
                    {data.fullName}
                  </h2>
                  <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-widest ${statusCfg.badge}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${statusCfg.dot}`} />
                    {statusCfg.label}
                  </span>
                </div>

                {/* Row 2: code · designation · department */}
                <div className="mt-2 flex items-center gap-2 text-[13px] text-slate-400 flex-wrap">
                  <span className="font-mono font-bold text-slate-300 tracking-wide">{data.employeeCode}</span>
                  {data.designation && (
                    <>
                      <span className="text-slate-600">·</span>
                      <span className="text-slate-300">{data.designation}</span>
                    </>
                  )}
                  {data.department?.name && (
                    <>
                      <span className="text-slate-600">·</span>
                      <span className="flex items-center gap-1.5 text-slate-400">
                        <Building2 className="h-3.5 w-3.5 text-slate-500" />
                        {data.department.name}
                      </span>
                    </>
                  )}
                  {data.location?.name && (
                    <>
                      <span className="text-slate-600">·</span>
                      <span className="flex items-center gap-1.5 text-slate-400">
                        <MapPin className="h-3.5 w-3.5 text-slate-500" />
                        {data.location.name}
                      </span>
                    </>
                  )}
                </div>

                {/* Row 3: stat chips */}
                <div className="mt-3 flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5 rounded-lg bg-white/5 border border-white/10 px-3 py-1.5 text-[12px] text-slate-300 whitespace-nowrap">
                    <Package className="h-3.5 w-3.5 text-violet-400" />
                    <span className="font-bold text-white">{data.assignments?.length ?? 0}</span>
                    <span className="text-slate-400">assets assigned</span>
                  </div>
                  <div className="flex items-center gap-1.5 rounded-lg bg-white/5 border border-white/10 px-3 py-1.5 text-[12px] text-slate-300 whitespace-nowrap">
                    <History className="h-3.5 w-3.5 text-slate-400" />
                    <span className="font-bold text-white">{data.history?.length ?? 0}</span>
                    <span className="text-slate-400">past assignments</span>
                  </div>
                  {data.joiningDate && (
                    <div className="flex items-center gap-1.5 rounded-lg bg-white/5 border border-white/10 px-3 py-1.5 text-[12px] text-slate-300 whitespace-nowrap">
                      <CalendarDays className="h-3.5 w-3.5 text-slate-400" />
                      <span className="text-slate-400">Joined</span>
                      <span className="font-bold text-white">{format(new Date(data.joiningDate), "MMM yyyy")}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Col 3 – Action buttons (top-right, no wrap) */}
              <div className="flex shrink-0 items-center gap-2 pt-1">
                {hasPendingHandovers && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleGetHandoverLink}
                    disabled={generatingLink}
                    className="h-8 border-violet-400/40 bg-violet-500/10 text-violet-300 hover:bg-violet-500/20 hover:text-violet-200 text-xs whitespace-nowrap"
                  >
                    {generatingLink ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Link2 className="h-3.5 w-3.5" />}
                    Handover Link
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrint}
                  className="h-8 border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white text-xs"
                >
                  <Printer className="h-3.5 w-3.5" />
                  Print
                </Button>
                <Button
                  size="sm"
                  onClick={handlePrint}
                  className="h-8 bg-white text-slate-900 hover:bg-slate-100 text-xs font-bold"
                >
                  <Download className="h-3.5 w-3.5" />
                  PDF
                </Button>
              </div>
            </div>
          ) : null}

          {/* ── Tab bar ── */}
          {data && !isLoading && (
            <div className="relative flex gap-1 border-b border-white/10">
              {TABS.map(({ key, label, icon: Icon, count }) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={`relative flex items-center gap-2 px-5 pb-3.5 pt-1 text-[13px] font-semibold transition-colors whitespace-nowrap ${
                    activeTab === key
                      ? "text-white"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                  {count !== undefined && (
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-black tabular-nums ${
                      activeTab === key
                        ? "bg-white/20 text-white"
                        : "bg-white/8 text-slate-500"
                    }`}>
                      {count}
                    </span>
                  )}
                  {activeTab === key && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-gradient-to-r from-violet-400 to-indigo-400" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Body ─────────────────────────────────────── */}
        <ScrollArea className="max-h-[calc(100vh-280px)] min-h-[280px]">
          {/* Error state */}
          {isError && (
            <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-dashed border-border/60 bg-muted/30">
                <XCircle className="h-7 w-7 text-muted-foreground/40" />
              </div>
              <p className="font-semibold text-muted-foreground">Failed to load employee details.</p>
              <button
                onClick={() => employeeId && fetchEmployeeDetails(employeeId)}
                className="text-sm text-primary underline underline-offset-2"
              >
                Try again
              </button>
            </div>
          )}

          {/* Loading skeleton */}
          {isLoading && (
            <div className="space-y-5 p-7">
              <div className="grid grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-xl" />
                ))}
              </div>
              <Skeleton className="h-56 w-full rounded-xl" />
            </div>
          )}

          {/* ── Tab: Profile Info ── */}
          {data && !isLoading && activeTab === "info" && (
            <div className="p-7 space-y-6">
              {/* Linked user account */}
              {data.user && (
                <div className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/20 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Avatar size="sm">
                      <AvatarImage src={data.user.image} />
                      <AvatarFallback>{getInitials(data.user.name || data.fullName)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-semibold">Linked User Account</p>
                      <p className="text-xs text-muted-foreground">{data.user.email}</p>
                    </div>
                  </div>
                  <span className="rounded-full border border-border/60 bg-background px-2.5 py-0.5 text-[11px] font-bold text-muted-foreground">
                    System User
                  </span>
                </div>
              )}

              {/* Info grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { icon: Mail,      label: "Email",       value: data.email },
                  { icon: Phone,     label: "Phone",       value: data.phone },
                  { icon: Building2, label: "Department",  value: data.department?.name },
                  { icon: MapPin,    label: "Location",    value: data.location?.name },
                  { icon: Briefcase, label: "Designation", value: data.designation },
                  {
                    icon: Calendar,
                    label: "Joining Date",
                    value: data.joiningDate ? format(new Date(data.joiningDate), "PPP") : null,
                  },
                  ...(data.exitDate
                    ? [{ icon: Calendar, label: "Exit Date", value: format(new Date(data.exitDate), "PPP"), danger: true }]
                    : []),
                ].map(({ icon: Icon, label, value, danger }: any) => (
                  <div
                    key={label}
                    className="flex items-start gap-3 rounded-xl border border-border/50 bg-card px-4 py-3"
                  >
                    <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                      danger ? "bg-red-100/80 dark:bg-red-950/30" : "bg-muted/60"
                    }`}>
                      <Icon className={`h-4 w-4 ${danger ? "text-red-500" : "text-muted-foreground"}`} />
                    </div>
                    <div>
                      <p className={`text-[10px] font-bold uppercase tracking-widest ${
                        danger ? "text-red-500" : "text-muted-foreground"
                      }`}>
                        {label}
                      </p>
                      <p className="text-sm font-medium text-foreground mt-0.5">
                        {value || "—"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Tab: Assets ── */}
          {data && !isLoading && activeTab === "assets" && (
            <div className="p-7 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Package className="h-4 w-4 text-violet-500" />
                  Currently Assigned Assets
                </h3>
                <span className="rounded-full bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 px-2.5 py-0.5 text-[11px] font-bold">
                  {data.assignments?.length ?? 0} assets
                </span>
              </div>

              {data.assignments && data.assignments.length > 0 ? (
                <div className="divide-y divide-border/50 rounded-xl border border-border/60 overflow-hidden">
                  {data.assignments.map((assignment: any, idx: number) => {
                    const condKey = (assignment.physicalCondition || "GOOD").toUpperCase()
                    const condClass = CONDITION_CONFIG[condKey] ?? "bg-slate-100 text-slate-600 border-slate-200"
                    const isAcked = assignment.acknowledgement?.status === "ACKNOWLEDGED"

                    return (
                      <div
                        key={assignment.id}
                        className="group flex flex-col gap-3 px-5 py-4 transition-colors hover:bg-muted/20"
                      >
                        <div className="flex items-start gap-3">
                          {/* Asset icon */}
                          <div className="relative shrink-0">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-violet-200/60 dark:border-violet-700/40 bg-gradient-to-br from-violet-50 to-indigo-100/80 dark:from-violet-950/40 dark:to-indigo-900/20">
                              <Tag className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                            </div>
                            {isAcked && (
                              <div className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 ring-2 ring-card">
                                <CheckCircle2 className="h-2.5 w-2.5 text-white" />
                              </div>
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="font-bold text-sm text-foreground truncate">
                                {assignment.asset.name}
                              </span>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${condClass}`}>
                                  {assignment.physicalCondition || "GOOD"}
                                </span>
                                {isAcked ? (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800/40 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                                    <CheckCircle2 className="h-2.5 w-2.5" /> Signed
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 dark:bg-amber-950/30 dark:border-amber-800/40 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-300">
                                    <Clock className="h-2.5 w-2.5" /> Pending
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                              <span className="font-mono font-bold text-slate-500 dark:text-slate-400">
                                #{assignment.asset.assetTag}
                              </span>
                              {assignment.asset.assetCode && (
                                <span className="font-mono">{assignment.asset.assetCode}</span>
                              )}
                              {assignment.asset.category?.name && (
                                <span className="flex items-center gap-1">
                                  <span className="text-border">·</span>
                                  {assignment.asset.category.name}
                                </span>
                              )}
                              {assignment.asset.brand && (
                                <span className="flex items-center gap-1">
                                  <span className="text-border">·</span>
                                  {assignment.asset.brand}
                                  {assignment.asset.model ? ` / ${assignment.asset.model}` : ""}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground pl-13 ml-[52px]">
                          <CalendarDays className="h-3 w-3" />
                          Assigned {format(new Date(assignment.assignedAt), "PP")}
                          {assignment.handoverType && (
                            <>
                              <span className="text-border">·</span>
                              <span className="capitalize">{assignment.handoverType.toLowerCase().replace(/_/g, " ")}</span>
                            </>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 rounded-xl border-2 border-dashed border-border/50 bg-muted/10">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/50">
                    <Package className="h-7 w-7 text-muted-foreground/30" />
                  </div>
                  <p className="mt-3 font-semibold text-muted-foreground">No active assets assigned</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">
                    Assign assets from the Assets module.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ── Tab: History ── */}
          {data && !isLoading && activeTab === "history" && (
            <div className="p-7 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <History className="h-4 w-4 text-slate-500" />
                  Assignment History
                </h3>
                <span className="rounded-full bg-muted text-muted-foreground px-2.5 py-0.5 text-[11px] font-bold">
                  {data.history?.length ?? 0} records
                </span>
              </div>

              {data.history && data.history.length > 0 ? (
                <div className="divide-y divide-border/50 rounded-xl border border-border/60 overflow-hidden">
                  {data.history.map((h: any) => (
                    <div
                      key={h.id}
                      className="flex items-start gap-3 px-5 py-4 hover:bg-muted/20 transition-colors"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted/50 border border-border/50 mt-0.5">
                        <History className="h-4 w-4 text-muted-foreground/60" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-bold text-sm text-foreground">{h.asset.name}</span>
                          <span className="font-mono text-[11px] text-muted-foreground">
                            #{h.asset.assetTag}
                          </span>
                        </div>
                        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <CalendarDays className="h-3 w-3" />
                            Assigned {format(new Date(h.assignedAt), "PP")}
                          </span>
                          {h.returnedAt && (
                            <span className="flex items-center gap-1">
                              <span className="text-border">→</span>
                              Returned {format(new Date(h.returnedAt), "PP")}
                            </span>
                          )}
                          {(h.returnCondition || h.physicalCondition) && (
                            <span className="flex items-center gap-1 italic">
                              <span className="text-border">·</span>
                              {h.returnCondition || h.physicalCondition}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 rounded-xl border-2 border-dashed border-border/50 bg-muted/10">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/50">
                    <History className="h-7 w-7 text-muted-foreground/30" />
                  </div>
                  <p className="mt-3 font-semibold text-muted-foreground">No assignment history</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">Past assignments will appear here.</p>
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
