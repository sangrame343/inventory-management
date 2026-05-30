"use client"

import { useEffect, useState } from "react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Mail,
  Phone,
  Calendar,
  MapPin,
  Building2,
  Briefcase,
  ExternalLink,
  Package,
  Printer,
  Download,
} from "lucide-react"
import { format } from "date-fns"
import { Skeleton } from "@/components/ui/skeleton"

interface EmployeeDetailsSheetProps {
  employeeId: string | null
  isOpen: boolean
  onOpenChange: (open: boolean) => void
}

export function EmployeeDetailsSheet({
  employeeId,
  isOpen,
  onOpenChange,
}: EmployeeDetailsSheetProps) {
  const [data, setData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isError, setIsError] = useState(false)

  useEffect(() => {
    if (isOpen && employeeId) {
      fetchEmployeeDetails(employeeId)
    } else if (!isOpen) {
      // Delay clearing data to avoid pop-in/out during animation
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

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2)
  }

  const handlePrint = () => {
    if (!data) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const html = `
      <html>
        <head>
          <title>Employee Asset Report - ${data.fullName}</title>
          <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
          <style>
            body { font-family: sans-serif; background: white; color: black; padding: 40px; }
            @media print {
              body { padding: 20px; }
            }
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
                <p class="text-xs text-gray-500">Status: ${data.status}</p>
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
                  <thead>
                    <tr class="border-b bg-gray-50">
                      <th class="py-2 px-3 font-semibold text-gray-700">Asset Name</th>
                      <th class="py-2 px-3 font-semibold text-gray-700">Asset Tag/Code</th>
                      <th class="py-2 px-3 font-semibold text-gray-700">Category</th>
                      <th class="py-2 px-3 font-semibold text-gray-700">Brand/Model</th>
                      <th class="py-2 px-3 font-semibold text-gray-700">Condition</th>
                      <th class="py-2 px-3 font-semibold text-gray-700">Assigned Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${data.assignments.map((assignment: any) => `
                      <tr class="border-b">
                        <td class="py-2.5 px-3 font-medium text-gray-900">${assignment.asset.name}</td>
                        <td class="py-2.5 px-3 font-mono text-gray-600">
                          Tag: ${assignment.asset.assetTag}<br/>
                          Code: ${assignment.asset.assetCode || "N/A"}
                        </td>
                        <td class="py-2.5 px-3 text-gray-600">${assignment.asset.category?.name || "N/A"}</td>
                        <td class="py-2.5 px-3 text-gray-600">${assignment.asset.brand} / ${assignment.asset.model || "N/A"}</td>
                        <td class="py-2.5 px-3 text-gray-600">${assignment.physicalCondition || assignment.asset.status}</td>
                        <td class="py-2.5 px-3 text-gray-600">${new Date(assignment.assignedAt).toLocaleDateString()}</td>
                      </tr>
                    `).join("")}
                  </tbody>
                </table>
              ` : `
                <p class="text-sm text-gray-500 italic py-2">No active assets currently assigned.</p>
              `}
            </div>

            ${data.history && data.history.length > 0 ? `
              <div class="mb-8">
                <h3 class="text-base font-bold text-gray-800 border-b-2 border-gray-200 pb-1 mb-3">Assignment History & Timeline</h3>
                <table class="w-full text-left border-collapse text-xs border border-gray-200">
                  <thead>
                    <tr class="border-b bg-gray-50">
                      <th class="py-2 px-3 font-semibold text-gray-700">Asset Name</th>
                      <th class="py-2 px-3 font-semibold text-gray-700">Asset Tag</th>
                      <th class="py-2 px-3 font-semibold text-gray-700">Assigned</th>
                      <th class="py-2 px-3 font-semibold text-gray-700">Returned</th>
                      <th class="py-2 px-3 font-semibold text-gray-700">Return Condition</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${data.history.map((h: any) => `
                      <tr class="border-b">
                        <td class="py-2 px-3 font-medium text-gray-900">${h.asset.name}</td>
                        <td class="py-2 px-3 font-mono text-gray-600">${h.asset.assetTag}</td>
                        <td class="py-2 px-3 text-gray-600">${new Date(h.assignedAt).toLocaleDateString()}</td>
                        <td class="py-2 px-3 text-gray-600">${h.returnedAt ? new Date(h.returnedAt).toLocaleDateString() : "N/A"}</td>
                        <td class="py-2 px-3 text-gray-600 italic">${h.returnCondition || h.physicalCondition || "N/A"}</td>
                      </tr>
                    `).join("")}
                  </tbody>
                </table>
              </div>
            ` : ""}

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
          <script>
            window.onload = function() {
              window.print();
            }
          </script>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  }

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[700px] w-full p-0 flex flex-col">
        <SheetHeader className="p-6 pb-2">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-4">
              {isLoading ? (
                <Skeleton className="h-10 w-10 rounded-full" />
              ) : data ? (
                <Avatar size="lg">
                  <AvatarImage src={data.user?.image} />
                  <AvatarFallback>{getInitials(data.fullName)}</AvatarFallback>
                </Avatar>
              ) : (
                <div className="h-10 w-10 rounded-full bg-muted" />
              )}
              <div className="flex flex-col gap-1">
                {isLoading ? (
                  <>
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="h-4 w-32" />
                  </>
                ) : data ? (
                  <>
                    <div className="flex items-center gap-2">
                      <span className="text-xl font-bold">{data.fullName}</span>
                      <Badge 
                        variant={
                          data.status === "ACTIVE" ? "default" :
                          data.status === "TERMINATED" ? "destructive" :
                          "secondary"
                        }
                      >
                        {data.status === "ACTIVE" ? "Active" :
                         data.status === "INACTIVE" ? "Inactive" :
                         data.status === "ON_LEAVE" ? "On Leave" :
                         data.status === "ON_HOLD" ? "On Hold" :
                         data.status === "RESIGNED" ? "Resigned" :
                         data.status === "LEFT" ? "Left" :
                         data.status === "TERMINATED" ? "Terminated" : data.status}
                      </Badge>
                    </div>
                    <span className="text-sm font-mono text-muted-foreground">
                      {data.employeeCode}
                    </span>
                  </>
                ) : null}
              </div>
            </SheetTitle>
            {data && (
              <div className="flex items-center gap-2 mr-6 print:hidden">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrint}
                  className="flex items-center gap-1.5"
                >
                  <Printer className="h-4 w-4" />
                  <span>Print</span>
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={handlePrint}
                  className="flex items-center gap-1.5"
                >
                  <Download className="h-4 w-4" />
                  <span>PDF</span>
                </Button>
              </div>
            )}
          </div>
          <SheetDescription>
            Comprehensive details and asset assignments for the employee.
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1 px-6">
          {isError ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <p className="text-destructive font-medium">Failed to load employee details.</p>
              <button 
                onClick={() => employeeId && fetchEmployeeDetails(employeeId)}
                className="text-sm underline mt-2 text-primary"
              >
                Try again
              </button>
            </div>
          ) : isLoading ? (
            <div className="space-y-8 py-4">
              <div className="grid grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-lg" />
                ))}
              </div>
              <Skeleton className="h-64 w-full rounded-lg" />
            </div>
          ) : data ? (
            <div className="space-y-8 py-4">
              {/* Personal Info Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-start gap-3">
                  <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div className="flex flex-col">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Email</span>
                    <span className="text-sm">{data.email || "N/A"}</span>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Phone className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div className="flex flex-col">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Phone</span>
                    <span className="text-sm">{data.phone || "N/A"}</span>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Building2 className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div className="flex flex-col">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Department</span>
                    <span className="text-sm">{data.department?.name || "N/A"}</span>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div className="flex flex-col">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Location</span>
                    <span className="text-sm">{data.location?.name || "N/A"}</span>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Briefcase className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div className="flex flex-col">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Designation</span>
                    <span className="text-sm">{data.designation || "N/A"}</span>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div className="flex flex-col">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Joining Date</span>
                    <span className="text-sm">
                      {data.joiningDate ? format(new Date(data.joiningDate), "PPP") : "N/A"}
                    </span>
                  </div>
                </div>
                {data.exitDate && (
                  <div className="flex items-start gap-3">
                    <Calendar className="h-5 w-5 text-destructive mt-0.5" />
                    <div className="flex flex-col">
                      <span className="text-xs font-medium text-destructive uppercase tracking-wider">Exit Date</span>
                      <span className="text-sm">
                        {format(new Date(data.exitDate), "PPP")}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {data.user && (
                <div className="bg-muted/50 p-4 rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar size="sm">
                      <AvatarImage src={data.user.image} />
                      <AvatarFallback>{getInitials(data.user.name || data.fullName)}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">Linked User Account</span>
                      <span className="text-xs text-muted-foreground">{data.user.email}</span>
                    </div>
                  </div>
                  <Badge variant="outline" className="bg-background">System User</Badge>
                </div>
              )}

              <Separator />

              {/* Current Assets Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Currently Assigned Assets
                  </h3>
                  <Badge>{data.assignments?.length || 0} Assets</Badge>
                </div>

                {data.assignments && data.assignments.length > 0 ? (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader className="bg-muted/50">
                        <TableRow>
                          <TableHead className="w-[140px]">Asset / Code</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Brand/Model</TableHead>
                          <TableHead>Status/Condition</TableHead>
                          <TableHead className="text-right">Assigned</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.assignments.map((assignment: any) => (
                          <TableRow key={assignment.id}>
                            <TableCell className="py-3">
                              <div className="font-medium text-sm">{assignment.asset.name}</div>
                              <div className="text-[10px] font-mono text-muted-foreground flex flex-col">
                                <span>Tag: {assignment.asset.assetTag}</span>
                                <span>Code: {assignment.asset.assetCode || "N/A"}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary" className="text-[10px]">
                                {assignment.asset.category?.name || "N/A"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs">
                              {assignment.asset.brand} / {assignment.asset.model || "N/A"}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-1">
                                <Badge 
                                  variant={assignment.asset.status === "ACTIVE" || assignment.asset.status === "ASSIGNED" ? "default" : "outline"} 
                                  className="text-[10px] w-fit"
                                >
                                  {assignment.asset.status}
                                </Badge>
                                {assignment.physicalCondition && (
                                  <span className="text-[10px] text-muted-foreground italic">
                                    {assignment.physicalCondition}
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-right text-xs">
                              <div>{format(new Date(assignment.assignedAt), "PP")}</div>
                              {assignment.handoverType && (
                                <div className="text-[10px] text-muted-foreground">{assignment.handoverType}</div>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed rounded-lg bg-muted/20">
                    <Package className="h-10 w-10 text-muted-foreground/30 mb-2" />
                    <p className="text-sm text-muted-foreground font-medium">No active assets assigned</p>
                  </div>
                )}
              </div>

              {/* History Section (Optional) */}
              {data.history && data.history.length > 0 && (
                <div className="space-y-4 pb-8">
                  <h3 className="text-lg font-semibold text-muted-foreground">Assignment History</h3>
                  <div className="rounded-md border border-muted opacity-80">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="text-xs">Asset</TableHead>
                          <TableHead className="text-xs">Assigned</TableHead>
                          <TableHead className="text-xs">Returned</TableHead>
                          <TableHead className="text-xs text-right">Condition</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.history.map((h: any) => (
                          <TableRow key={h.id} className="text-xs">
                            <TableCell>
                              <div className="font-medium">{h.asset.name}</div>
                              <div className="text-[10px] font-mono">{h.asset.assetTag}</div>
                            </TableCell>
                            <TableCell>{format(new Date(h.assignedAt), "PP")}</TableCell>
                            <TableCell>{format(new Date(h.returnedAt), "PP")}</TableCell>
                            <TableCell className="text-right italic text-muted-foreground">
                              {h.returnCondition || h.physicalCondition || "N/A"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}
