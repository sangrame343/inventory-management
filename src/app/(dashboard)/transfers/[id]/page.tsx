import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";
import { format } from "date-fns";
import { 
  ArrowRight, 
  MapPin, 
  Users, 
  Package, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  Truck, 
  History,
  ArrowLeft,
  Edit,
  User
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";
import { TransferActions } from "@/components/transfers/transfer-actions";
import { TransferStatus } from "@prisma/client";
import { cn } from "@/lib/utils";

export default async function TransferDetailPage({ params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.activeCompanyId) redirect("/login");

  const { id } = params;
  const transfer = (await db.assetTransfer.findUnique({
    where: { id, companyId: session.user.activeCompanyId },
    include: {
      asset: true,
      fromLocation: true,
      toLocation: true,
      fromEmployee: true,
      toEmployee: true,
      requestedBy: { select: { name: true, email: true } },
      approvedBy: { select: { name: true, email: true } },
      completedBy: { select: { name: true, email: true } },
      updatedBy: { select: { name: true, email: true } },
    },
  })) as any;

  if (!transfer) notFound();

  const canAction = session.user.role === "SUPER_ADMIN";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="sm" 
            render={
              <Link href="/transfers">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
              </Link>
            }
          />
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold tracking-tight">
                {transfer.transferCode || "Draft Transfer"}
              </h2>
              <TransferStatusBadge status={transfer.status} />
            </div>
            <p className="text-sm text-muted-foreground">
              {transfer.transferType.replace(/_/g, " ")} • Requested on {format(new Date(transfer.requestedAt), "PPP")}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {canAction && (
            <>
              {/* Future: Edit button would go here */}
              <TransferActions transfer={transfer} />
            </>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Left Column: Details */}
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Package className="h-4 w-4" /> Asset Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <Link 
                    href={`/assets/${transfer.assetId}`}
                    className="text-lg font-bold hover:underline text-blue-600"
                  >
                    {transfer.asset.name}
                  </Link>
                  <p className="text-sm text-muted-foreground">{transfer.asset.assetTag} • {transfer.asset.serialNumber || "No serial"}</p>
                </div>
                <Badge variant="secondary">{transfer.asset.status}</Badge>
              </div>
              <Separator className="my-4" />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-semibold">Brand / Model</p>
                  <p className="text-sm">{transfer.asset.brand || "—"} / {transfer.asset.model || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-semibold">Standard Condition (Start)</p>
                  <p className="text-sm">{transfer.conditionBefore || "Not specified"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Truck className="h-4 w-4" /> Movement Logistics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border">
                <div className="flex flex-col items-center gap-2 flex-1">
                  <div className="p-2 bg-background rounded-full border shadow-sm">
                    {transfer.transferType.startsWith("LOCATION") ? <MapPin className="size-5 text-blue-600" /> : <User className="size-5 text-blue-600" />}
                  </div>
                  <span className="text-sm font-medium">Source</span>
                  <span className="text-xs text-muted-foreground text-center">
                    {transfer.fromLocation?.name || transfer.fromEmployee?.fullName || "Unassigned"}
                  </span>
                </div>
                
                <div className="flex flex-col items-center gap-1 px-4">
                  <ArrowRight className="size-6 text-muted-foreground/50" />
                  <Badge variant="outline" className="text-[10px] uppercase">{transfer.transferType.replace(/_/g, " ")}</Badge>
                </div>

                <div className="flex flex-col items-center gap-2 flex-1">
                  <div className="p-2 bg-background rounded-full border shadow-sm">
                    {transfer.transferType.endsWith("LOCATION") ? <MapPin className="size-5 text-green-600" /> : <User className="size-5 text-green-600" />}
                  </div>
                  <span className="text-sm font-medium">Destination</span>
                  <span className="text-xs text-muted-foreground text-center">
                    {transfer.toLocation?.name || transfer.toEmployee?.fullName || "Unknown"}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6 mt-6">
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase text-muted-foreground">Planning</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Planned Transfer:</span>
                      <span>{transfer.plannedTransferDate ? format(new Date(transfer.plannedTransferDate), "PPP") : "Not set"}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Exp. Receipt:</span>
                      <span>{transfer.expectedReceiptDate ? format(new Date(transfer.expectedReceiptDate), "PPP") : "Not set"}</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase text-muted-foreground">Actual Performance</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Dispatched:</span>
                      <span className={transfer.actualDispatchDate ? "text-blue-600 font-medium" : ""}>
                        {transfer.actualDispatchDate ? format(new Date(transfer.actualDispatchDate), "PPP") : "Pending"}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Received:</span>
                      <span className={transfer.actualReceiptDate ? "text-green-600 font-medium" : ""}>
                        {transfer.actualReceiptDate ? format(new Date(transfer.actualReceiptDate), "PPP") : "Pending"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Timeline & Meta */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <History className="h-4 w-4" /> Lifecycle Timeline
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3">
              <div className="space-y-8 relative before:absolute before:left-6 before:top-2 before:bottom-2 before:w-px before:bg-border">
                {/* Requested */}
                <TimelineItem 
                  title="Transfer Requested"
                  date={transfer.requestedAt}
                  user={transfer.requestedBy.name}
                  icon={<Clock className="size-4" />}
                  active={true}
                >
                  <p className="mt-1 text-xs text-muted-foreground italic">"{transfer.reason || "No reason provided"}"</p>
                </TimelineItem>

                {/* Approved */}
                <TimelineItem 
                  title="Approved"
                  date={transfer.approvedAt || (transfer.status !== 'REQUESTED' ? transfer.updatedAt : null)}
                  user={transfer.approvedBy?.name}
                  icon={<CheckCircle2 className="size-4" />}
                  active={transfer.status !== 'REQUESTED' && transfer.status !== 'CANCELLED' && transfer.status !== 'REJECTED'}
                  status={transfer.status === 'REJECTED' ? 'REJECTED' : undefined}
                />

                {/* Dispatched */}
                <TimelineItem 
                  title="Dispatched"
                  date={transfer.actualDispatchDate}
                  user={transfer.approvedBy?.name}
                  icon={<Truck className="size-4" />}
                  active={!!transfer.actualDispatchDate}
                />

                {/* Completed */}
                <TimelineItem 
                  title="Movement Completed"
                  date={transfer.completedAt}
                  user={transfer.completedBy?.name}
                  icon={<Package className="size-4" />}
                  active={transfer.status === 'COMPLETED'}
                >
                   {transfer.conditionAfter && (
                    <div className="mt-2 p-2 bg-green-50 text-[10px] rounded border border-green-100">
                      <strong>Condition on Receipt:</strong> {transfer.conditionAfter}
                    </div>
                   )}
                </TimelineItem>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground whitespace-pre-wrap">
                {transfer.notes || "No additional notes."}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function TimelineItem({ title, date, user, icon, active, children, status }: any) {
  if (!active && !date) {
    return (
      <div className="flex gap-4 opacity-40">
        <div className="relative z-10 flex h-6 w-6 items-center justify-center rounded-full border bg-background">
          <div className="h-2 w-2 rounded-full bg-muted" />
        </div>
        <div>
          <h4 className="text-sm font-medium text-muted-foreground">{title}</h4>
        </div>
      </div>
    );
  }

  const isRejected = status === 'REJECTED';

  return (
    <div className="flex gap-4 relative">
      <div className={cn(
        "relative z-10 flex h-6 w-6 items-center justify-center rounded-full border shadow-sm",
        active ? "bg-primary text-primary-foreground border-primary" : "bg-background",
        isRejected && "bg-red-100 text-red-600 border-red-200"
      )}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <h4 className={cn("text-sm font-semibold", isRejected && "text-red-600")}>{isRejected ? "Rejected" : title}</h4>
          {date && <span className="text-[10px] text-muted-foreground">{format(new Date(date), "MMM d")}</span>}
        </div>
        <p className="text-xs text-muted-foreground line-clamp-1">
          {user ? `by ${user}` : "Pending"}
        </p>
        {children}
      </div>
    </div>
  );
}

function TransferStatusBadge({ status }: { status: TransferStatus }) {
  const variants: Record<TransferStatus, string> = {
    REQUESTED: "bg-blue-100 text-blue-700 border-blue-200",
    APPROVED: "bg-green-100 text-green-700 border-green-200",
    IN_TRANSIT: "bg-amber-100 text-amber-700 border-amber-200",
    COMPLETED: "bg-slate-100 text-slate-700 border-slate-200",
    REJECTED: "bg-red-100 text-red-700 border-red-200",
    CANCELLED: "bg-slate-100 text-slate-400 border-slate-200",
  };

  return (
    <Badge className={`${variants[status]} border font-medium`}>
      {status}
    </Badge>
  );
}
