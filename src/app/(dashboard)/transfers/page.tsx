import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { TransferStatus, TransferType } from "@prisma/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { ArrowRight, MapPin, Users, Package, Clock, Truck, CheckCircle2, AlertCircle } from "lucide-react";
import { TransferActions } from "@/components/transfers/transfer-actions";
import { AddTransferModal } from "@/components/transfers/add-transfer-modal";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default async function TransfersPage() {
  const session = await auth();

  if (!session?.user?.activeCompanyId || !session.user.id) {
    redirect("/login");
  }

  const companyId = session.user.activeCompanyId;
  const userId = session.user.id;
  const userRole = session.user.role;

  const [transfers, assets, locations, employees] = await Promise.all([
    db.assetTransfer.findMany({
      where: { companyId },
      include: {
        asset: true,
        fromLocation: true,
        toLocation: true,
        fromEmployee: true,
        toEmployee: true,
        requestedBy: { select: { name: true } },
      },
      orderBy: { requestedAt: "desc" },
    }),
    db.asset.findMany({
      where: { companyId, status: { notIn: ["DISPOSED", "LOST"] } },
      select: { id: true, name: true, assetTag: true, locationId: true },
    }),
    db.location.findMany({
      where: { companyId },
      select: { id: true, name: true },
    }),
    db.employee.findMany({
      where: { companyId, status: "ACTIVE" },
      select: { id: true, fullName: true, userId: true },
    }),
  ]);

  const pendingCount = transfers.filter(t => t.status === TransferStatus.REQUESTED).length;
  const approvedCount = transfers.filter(t => t.status === TransferStatus.APPROVED).length;
  const inTransitCount = transfers.filter(t => t.status === TransferStatus.IN_TRANSIT).length;
  const completedMonthCount = transfers.filter(t => 
    t.status === TransferStatus.COMPLETED && 
    t.completedAt &&
    new Date(t.completedAt).getMonth() === new Date().getMonth()
  ).length;

  const pendingTransfers = transfers.filter(t => t.status === TransferStatus.REQUESTED || t.status === TransferStatus.APPROVED);
  const activeTransfers = transfers.filter(t => t.status === TransferStatus.IN_TRANSIT);
  const completedTransfers = transfers.filter(t => t.status === TransferStatus.COMPLETED || t.status === TransferStatus.REJECTED || t.status === TransferStatus.CANCELLED);

  const canAction = userRole === "SUPER_ADMIN";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Asset Transfers</h2>
          <p className="text-sm text-muted-foreground">
            Manage asset movements between locations and employees.
          </p>
        </div>

        <AddTransferModal 
          assets={assets} 
          locations={locations} 
          employees={employees} 
          currentUserId={userId}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
            <Clock className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingCount}</div>
            <p className="text-xs text-muted-foreground">Awaiting approval</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{approvedCount}</div>
            <p className="text-xs text-muted-foreground">Ready for dispatch</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In-Transit</CardTitle>
            <Truck className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inTransitCount}</div>
            <p className="text-xs text-muted-foreground">Active movements</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed (Month)</CardTitle>
            <Package className="h-4 w-4 text-slate-800" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedMonthCount}</div>
            <p className="text-xs text-muted-foreground">Successfully closed</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending">Pending ({pendingTransfers.length})</TabsTrigger>
          <TabsTrigger value="active">In Transit ({activeTransfers.length})</TabsTrigger>
          <TabsTrigger value="completed">History</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          <TransferTable transfers={pendingTransfers} canAction={canAction} />
        </TabsContent>

        <TabsContent value="active" className="space-y-4">
          <TransferTable transfers={activeTransfers} canAction={canAction} />
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          <TransferTable transfers={completedTransfers} canAction={false} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function TransferTable({ transfers, canAction }: { transfers: any[], canAction: boolean }) {
  if (transfers.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-8 text-center text-muted-foreground bg-card">
        No transfers found in this category.
      </div>
    );
  }

  return (
    <div className="rounded-md border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[120px]">Ref Code</TableHead>
            <TableHead>Asset</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>From / To</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Requested By</TableHead>
            <TableHead>Date</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transfers.map((transfer) => (
            <TableRow key={transfer.id}>
              <TableCell className="font-mono text-[10px] whitespace-nowrap">
                <Link href={`/transfers/${transfer.id}`} className="hover:underline text-blue-600">
                  {transfer.transferCode || "PENDING"}
                </Link>
              </TableCell>
              <TableCell>
                <div className="flex flex-col">
                  <span className="font-medium">{transfer.asset.name}</span>
                  <span className="text-xs text-muted-foreground">{transfer.asset.assetTag}</span>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="text-[10px] uppercase">
                  {transfer.transferType.replace(/_/g, " ")}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2 text-sm">
                  <SourceDestination transfer={transfer} />
                </div>
              </TableCell>
              <TableCell>
                <TransferStatusBadge status={transfer.status} />
              </TableCell>
              <TableCell>
                <span className="text-sm">{transfer.requestedBy.name}</span>
              </TableCell>
              <TableCell>
                <span className="text-sm text-muted-foreground">
                  {format(new Date(transfer.requestedAt), "MMM d, yyyy")}
                </span>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-2">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    render={<Link href={`/transfers/${transfer.id}`}>Details</Link>}
                  />
                  {canAction && <TransferActions transfer={transfer} />}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function SourceDestination({ transfer }: { transfer: any }) {
  const isLocationTo = transfer.transferType.endsWith("LOCATION");
  const isEmployeeTo = transfer.transferType.endsWith("EMPLOYEE");
  const isLocationFrom = transfer.transferType.startsWith("LOCATION");
  const isEmployeeFrom = transfer.transferType.startsWith("EMPLOYEE");

  return (
    <div className="flex items-center gap-2">
      <div className="flex flex-col items-end">
        {isLocationFrom ? 
          <span className="flex items-center gap-1 text-xs"><MapPin className="size-3" /> {transfer.fromLocation?.name || "Unknown"}</span> :
          <span className="flex items-center gap-1 text-xs"><Users className="size-3" /> {transfer.fromEmployee?.fullName || "Unassigned"}</span>
        }
      </div>
      <ArrowRight className="size-3 text-muted-foreground" />
      <div className="flex flex-col items-start font-medium">
        {isLocationTo ? 
          <span className="flex items-center gap-1"><MapPin className="size-3" /> {transfer.toLocation?.name}</span> :
          <span className="flex items-center gap-1"><Users className="size-3" /> {transfer.toEmployee?.fullName}</span>
        }
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
