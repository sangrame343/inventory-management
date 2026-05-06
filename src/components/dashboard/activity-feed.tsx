import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDistanceToNow } from "date-fns";
import { Activity, User, Package, Hammer, ArrowRightLeft, Boxes, ClipboardEdit } from "lucide-react";
import { cn } from "@/lib/utils";

interface ActivityItemProps {
  action: string;
  entity: string;
  details: string | null;
  timestamp: Date;
  userName: string | null;
  isLast?: boolean;
}

const getEntityIcon = (entity: string) => {
  const e = entity.toLowerCase();
  if (e.includes("asset")) return Package;
  if (e.includes("employee")) return User;
  if (e.includes("maintenance") || e.includes("ticket")) return Hammer;
  if (e.includes("transfer")) return ArrowRightLeft;
  if (e.includes("inventory")) return Boxes;
  return Activity;
};

function ActivityItem({ action, entity, details, timestamp, userName, isLast }: ActivityItemProps) {
  const Icon = getEntityIcon(entity);
  
  return (
    <div className="flex gap-4 group">
      <div className="flex flex-col items-center">
        <div className="rounded-full p-2 bg-muted/50 ring-1 ring-border/50 group-hover:bg-primary/10 transition-colors">
          <Icon className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
        </div>
        {!isLast && <div className="w-px h-full bg-border/50 mt-2" />}
      </div>
      <div className="flex flex-col pb-6">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold">{userName || "System"}</span>
          <span className="text-xs text-muted-foreground">{action}</span>
          <span className="text-xs font-medium px-1.5 py-0.5 rounded-md bg-muted ring-1 ring-border/30">{entity}</span>
        </div>
        {details && (
          <p className="text-sm mt-1 text-muted-foreground line-clamp-2">
            {details}
          </p>
        )}
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground/60 mt-1 font-semibold">
          {formatDistanceToNow(timestamp, { addSuffix: true })}
        </span>
      </div>
    </div>
  );
}

interface ActivityFeedProps {
  activities: any[];
}

export function ActivityFeed({ activities }: ActivityFeedProps) {
  return (
    <Card className="border-none bg-background/50 backdrop-blur-sm shadow-sm ring-1 ring-border/50 h-full flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-lg font-semibold">Recent Activity</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">Latest updates across the platform</p>
        </div>
        <ClipboardEdit className="h-5 w-5 text-muted-foreground" />
      </CardHeader>
      <CardContent className="flex-1 min-h-0 overflow-y-auto px-6 scrollbar-thin scrollbar-thumb-border/50">
        {activities.length > 0 ? (
          <div className="flex flex-col mt-2">
            {activities.map((activity, idx) => (
              <ActivityItem
                key={activity.id}
                action={activity.action}
                entity={activity.entity}
                details={activity.details}
                timestamp={new Date(activity.createdAt)}
                userName={activity.user?.name}
                isLast={idx === activities.length - 1}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full py-12 text-muted-foreground gap-2">
            <Activity className="h-10 w-10 opacity-20" />
            <p className="text-sm italic">No recent activity logged</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
