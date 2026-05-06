import { Wrench, Calendar, ListChecks, History } from "lucide-react";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TicketList } from "@/components/maintenance/ticket-list";
import { ScheduleList } from "@/components/maintenance/schedule-list";
import { MaintenanceTicketForm } from "@/components/maintenance/maintenance-form";
import { GenerateTicketsButton } from "@/components/maintenance/generate-tickets-button";
import { TicketStatus } from "@prisma/client";

export default async function MaintenancePage() {
  const session = await auth();

  if (!session?.user?.activeCompanyId || !session.user.id) {
    redirect("/login");
  }

  const companyId = session.user.activeCompanyId;

  const [tickets, schedules, assets, users, vendors] = await Promise.all([
    db.maintenanceTicket.findMany({
      where: { companyId },
      include: {
        asset: true,
        vendor: true,
        assignedTo: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    db.maintenanceSchedule.findMany({
      where: { companyId },
      include: { asset: true },
      orderBy: { nextDueDate: "asc" },
    }),
    db.asset.findMany({
      where: { companyId },
      select: { id: true, name: true, assetTag: true },
    }),
    db.user.findMany({
      where: {
        OR: [
          { activeCompanyId: companyId },
          { companyRoles: { some: { companyId } } }
        ]
      },
      select: { id: true, name: true, email: true },
    }),
    db.vendor.findMany({
      where: { companyId },
      select: { id: true, name: true },
    }),
  ]);

  const activeTicketsCount = tickets.filter(t => t.status !== TicketStatus.CLOSED && t.status !== TicketStatus.RESOLVED && t.status !== TicketStatus.CANCELLED).length;
  const overdueSchedulesCount = schedules.filter(s => s.isActive && new Date(s.nextDueDate) < new Date()).length;
  const pendingPartsCount = tickets.filter(t => t.status === TicketStatus.PENDING_PARTS).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Maintenance Management</h2>
          <p className="text-sm text-muted-foreground">
            Manage asset repairs, preventive schedules, and maintenance costs.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <GenerateTicketsButton />
          <MaintenanceTicketForm 
            assets={assets}
            users={users}
            vendors={vendors}
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Tickets</CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeTicketsCount}</div>
            <p className="text-xs text-muted-foreground">Currently in progress or open</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue Schedules</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{overdueSchedulesCount}</div>
            <p className="text-xs text-muted-foreground">Assets waiting for service</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Parts</CardTitle>
            <ListChecks className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingPartsCount}</div>
            <p className="text-xs text-muted-foreground">Waiting for inventory linkage</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="tickets" className="space-y-4">
        <TabsList>
          <TabsTrigger value="tickets">Active Tickets</TabsTrigger>
          <TabsTrigger value="schedules">PM Schedules</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>
        <TabsContent value="tickets" className="space-y-4">
          <TicketList 
            initialTickets={tickets.filter(t => t.status !== TicketStatus.CLOSED && t.status !== TicketStatus.RESOLVED && t.status !== TicketStatus.CANCELLED)} 
            assets={assets}
            users={users}
            vendors={vendors}
          />
        </TabsContent>
        <TabsContent value="schedules">
          <ScheduleList schedules={schedules} assets={assets} />
        </TabsContent>
        <TabsContent value="history">
          <TicketList 
            initialTickets={tickets.filter(t => t.status === TicketStatus.CLOSED || t.status === TicketStatus.RESOLVED || t.status === TicketStatus.CANCELLED)}
            assets={assets}
            users={users}
            vendors={vendors}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
