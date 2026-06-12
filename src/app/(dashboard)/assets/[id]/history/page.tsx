import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  ChevronLeft, 
  History, 
  Sparkles, 
  UserPlus, 
  UserMinus, 
  Wrench, 
  Clock, 
  Calendar,
  Building2,
  Users
} from "lucide-react";
import { AcknowledgementActionsClient } from "@/components/assets/acknowledgement-actions-client";

interface AssetHistoryPageProps {
  params: Promise<{ id: string }>;
}

type TimelineItem = {
  id: string;
  date: Date;
  title: string;
  description: string;
  type: "handover" | "return" | "maintenance" | "created";
  assignmentId?: string;
  acknowledgement?: {
    status: "PENDING" | "ACKNOWLEDGED" | "EXPIRED" | "ARCHIVED" | "DELETED";
    pdfReceiptPath: string | null;
  } | null;
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
      category: true,
      assignments: {
        include: {
          user: true,
          employee: true,
          assignedBy: true,
          manager: true,
          department: true,
          location: true,
          acknowledgement: true,
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
          assignmentId: entry.id,
          acknowledgement: entry.acknowledgement,
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

  // Icon mapping
  const icons = {
    created: Sparkles,
    handover: UserPlus,
    return: UserMinus,
    maintenance: Wrench,
  };

  // Color mapping
  const iconColors = {
    created: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400",
    handover: "bg-violet-500/10 text-violet-600 border-violet-500/20 dark:text-violet-400",
    return: "bg-rose-500/10 text-rose-600 border-rose-500/20 dark:text-rose-400",
    maintenance: "bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400",
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Back link */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          render={
            <Link href={`/assets/${asset.id}`} className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground">
              <ChevronLeft className="h-4 w-4" /> Back to Asset Details
            </Link>
          }
        />
      </div>

      {/* Header Info */}
      <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-card via-card to-muted/20 p-6">
        <div className="absolute top-0 right-0 h-40 w-40 rounded-full bg-violet-500/5 blur-3xl pointer-events-none" />
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-violet-500/10 border border-violet-500/20">
              <History className="h-6 w-6 text-violet-500" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight">{asset.name}</h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Lifecycle History & Audit Trail • Tag: <strong className="font-mono">{asset.assetTag}</strong>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {asset.category && (
              <Badge variant="outline" className="bg-violet-500/5 text-violet-500 border-violet-500/20 px-2.5 py-0.5">
                {asset.category.name}
              </Badge>
            )}
            <Badge variant="outline" className="px-2.5 py-0.5 font-bold uppercase tracking-wider">
              {timeline.length} Events
            </Badge>
          </div>
        </div>
      </div>

      {/* Timeline Section */}
      <div className="rounded-2xl border border-border/60 bg-card p-6 md:p-8">
        {timeline.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground italic">
            No history timeline events found.
          </div>
        ) : (
          <div className="relative border-l border-border/80 ml-4 md:ml-6 pl-6 md:pl-8 space-y-6 py-2">
            {timeline.map((item) => {
              const IconComponent = icons[item.type];
              return (
                <div key={item.id} className="relative group">
                  {/* Timeline circle icon */}
                  <div className={`absolute -left-[37px] md:-left-[45px] top-1.5 flex h-6 w-6 md:h-8 md:w-8 items-center justify-center rounded-full border shadow-sm bg-background transition-transform duration-300 group-hover:scale-110 ${iconColors[item.type]}`}>
                    <IconComponent className="h-3 w-3 md:h-4 md:w-4" />
                  </div>

                  {/* Card content */}
                  <div className="rounded-xl border border-border/50 bg-card p-4 transition-all duration-300 hover:shadow-sm hover:border-violet-500/30">
                    <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
                      <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                        {item.title}
                      </h4>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" />
                        {format(item.date, "PPP p")}
                      </div>
                    </div>

                    <p className="mt-2 text-xs md:text-sm text-muted-foreground/90 leading-relaxed font-medium">
                      {item.description}
                    </p>

                    {item.type === "handover" && item.assignmentId && (
                      <AcknowledgementActionsClient
                        assignmentId={item.assignmentId}
                        acknowledgement={item.acknowledgement || null}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
