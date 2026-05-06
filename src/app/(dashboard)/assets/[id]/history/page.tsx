import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { format } from "date-fns";

interface AssetHistoryPageProps {
  params: Promise<{ id: string }>;
}

type TimelineItem = {
  id: string;
  date: Date;
  title: string;
  description: string;
  type: "handover" | "return" | "maintenance" | "created";
};

export default async function AssetHistoryPage({
  params,
}: AssetHistoryPageProps) {
  const session = await auth();

  if (!session?.user?.activeCompanyId) {
    redirect("/login");
  }

  const { id } = await params;

  const asset = await db.asset.findFirst({
    where: {
      id,
      companyId: session.user.activeCompanyId,
    },
    include: {
      assignments: {
        include: {
          user: true,
          employee: true,
          assignedBy: true,
          manager: true,
          department: true,
          location: true,
        },
        orderBy: {
          assignedAt: "desc",
        },
      },
      tickets: {
        include: {
          createdBy: true,
          assignedTo: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });

  if (!asset) {
    notFound();
  }

  const timeline: TimelineItem[] = [
    {
      id: `created-${asset.id}`,
      date: asset.createdAt,
      title: "Asset Created",
      description: `${asset.name} (${asset.assetTag}) was added to the registry.`,
      type: "created" as const,
    },
    ...asset.assignments.flatMap((entry) => {
      const items: TimelineItem[] = [
        {
          id: `handover-${entry.id}`,
          date: entry.assignedAt,
          title: "Asset Handed Over",
          description: `Assigned to ${entry.employee?.fullName || entry.department?.name || entry.user?.name || entry.user?.email || "Unknown"}${entry.location ? ` at ${entry.location.name}` : ""} by ${
            entry.assignedBy.name || entry.assignedBy.email || "Unknown"
          }. Transaction ID: ${entry.transactionId}.`,
          type: "handover" as const,
        },
      ];

      if (entry.returnedAt) {
        items.push({
          id: `return-${entry.id}`,
          date: entry.returnedAt,
          title: "Asset Returned",
          description: `Returned by ${entry.employee?.fullName || entry.user?.name || entry.user?.email || "Unknown"}. Return condition: ${
            entry.returnCondition || "N/A"
          }. Reason: ${entry.returnReason || "N/A"}.`,
          type: "return" as const,
        });
      }

      return items;
    }),
    ...asset.tickets.map((ticket) => ({
      id: `ticket-${ticket.id}`,
      date: ticket.createdAt,
      title: `Maintenance: ${ticket.title}`,
      description: `Status: ${ticket.status}. Priority: ${ticket.priority}. ${
        ticket.description || ""
      }`,
      type: "maintenance" as const,
    })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Asset History Timeline
        </h1>
        <p className="text-sm text-muted-foreground">
          Full lifecycle, employee changes, repairs, and audit trail for{" "}
          {asset.name}.
        </p>
      </div>

      <div className="rounded-xl border bg-card p-6">
        <div className="space-y-6">
          {timeline.length === 0 ?
            <p className="text-sm text-muted-foreground">
              No history available.
            </p>
          : timeline.map((item, index) => (
              <div key={item.id} className="relative flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="h-3 w-3 rounded-full bg-primary" />
                  {index < timeline.length - 1 && (
                    <div className="mt-2 h-full w-px bg-border" />
                  )}
                </div>

                <div className="flex-1 rounded-lg border p-4">
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div className="font-semibold">{item.title}</div>
                    <div className="text-sm text-muted-foreground">
                      {format(item.date, "PPP p")}
                    </div>
                  </div>

                  <div className="mt-2 text-sm text-muted-foreground">
                    {item.description}
                  </div>
                </div>
              </div>
            ))
          }
        </div>
      </div>
    </div>
  );
}
