import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format, formatDistanceToNow, isPast, isToday } from "date-fns";
import { Clock, AlertTriangle, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";

interface MaintenanceItemProps {
  title: string;
  assetName: string;
  dueDate: Date;
  isLast?: boolean;
}

function MaintenanceItem({ title, assetName, dueDate, isLast }: MaintenanceItemProps) {
  const isOverdue = isPast(dueDate) && !isToday(dueDate);
  const dueToday = isToday(dueDate);
  
  return (
    <div className={cn("flex flex-col gap-1 py-3 group", !isLast && "border-b border-border/40")}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold truncate group-hover:text-primary transition-colors">{title}</span>
        {isOverdue ? (
          <Badge variant="destructive" className="text-[10px] uppercase font-black animate-pulse">Overdue</Badge>
        ) : dueToday ? (
          <Badge variant="outline" className="text-[10px] uppercase font-black text-amber-600 bg-amber-500/10 border-amber-500/30">Due Today</Badge>
        ) : (
          <Badge variant="outline" className="text-[10px] uppercase font-bold text-blue-600 bg-blue-500/10 border-blue-500/30">Upcoming</Badge>
        )}
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground truncate">{assetName}</span>
        <span className={cn(
          "text-[10px] font-medium flex items-center gap-1",
          isOverdue ? "text-rose-600" : dueToday ? "text-amber-600" : "text-muted-foreground"
        )}>
          <Clock className="h-3 w-3" />
          {format(dueDate, "MMM d, yyyy")} ({formatDistanceToNow(dueDate, { addSuffix: true })})
        </span>
      </div>
    </div>
  );
}

interface MaintenanceUrgencyProps {
  schedules: any[]; // Updated schedule list with asset info
}

export function MaintenanceUrgency({ schedules }: MaintenanceUrgencyProps) {
  const sortedSchedules = [...schedules].sort((a, b) => 
    new Date(a.nextDueDate).getTime() - new Date(b.nextDueDate).getTime()
  ).slice(0, 6);

  return (
    <Card className="border-none bg-background/50 backdrop-blur-sm shadow-sm ring-1 ring-border/50 h-full flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between bg-muted/20 border-b border-border/30 rounded-t-lg">
        <div>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
             <CalendarDays className="h-5 w-5 text-primary" />
             Upcoming Maintenance
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">Schedules needing attention soon</p>
        </div>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 overflow-y-auto px-6 scrollbar-thin scrollbar-thumb-border/50 pt-2">
        {sortedSchedules.length > 0 ? (
          <div className="flex flex-col">
            {sortedSchedules.map((schedule, idx) => (
              <MaintenanceItem
                key={schedule.id}
                title={schedule.title}
                assetName={schedule.asset.name}
                dueDate={new Date(schedule.nextDueDate)}
                isLast={idx === sortedSchedules.length - 1}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full py-12 text-muted-foreground gap-2 text-center">
            <AlertTriangle className="h-10 w-10 opacity-20" />
            <p className="text-sm italic">No maintenance tasks scheduled</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
