"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format, formatDistanceToNow, isPast, isToday } from "date-fns";
import { Clock, CalendarDays, Hammer, User, ChevronRight, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface MaintenanceItemProps {
  schedule: {
    id: string;
    title: string;
    nextDueDate: string | Date;
    asset: {
      name: string;
    };
  };
  isLast?: boolean;
}

function MaintenanceItem({ schedule, isLast }: MaintenanceItemProps) {
  const dueDate = new Date(schedule.nextDueDate);
  const isOverdue = isPast(dueDate) && !isToday(dueDate);
  const dueToday = isToday(dueDate);
  
  return (
    <div className={cn(
      "flex flex-col gap-2 p-4 rounded-xl border border-border/50 bg-background/50 hover:bg-muted/30 transition-all duration-200 group mb-3",
      isOverdue ? "ring-1 ring-red-500/20 shadow-sm" : ""
    )}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 truncate">
          <div className={cn(
            "p-1.5 rounded-lg",
            isOverdue ? "bg-red-100 text-red-600 dark:bg-red-900/30" : "bg-primary/10 text-primary"
          )}>
            <Hammer className="h-3.5 w-3.5" />
          </div>
          <span className="text-sm font-bold truncate group-hover:text-primary transition-colors">
            {schedule.title}
          </span>
        </div>
        {isOverdue ? (
          <Badge variant="destructive" className="text-[10px] uppercase font-black tracking-tight px-1.5 h-5 shadow-sm">Overdue</Badge>
        ) : dueToday ? (
          <Badge variant="outline" className="text-[10px] uppercase font-black tracking-tight px-1.5 h-5 text-amber-600 bg-amber-500/10 border-amber-500/30">Due Today</Badge>
        ) : (
          <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-tight px-1.5 h-5 text-blue-600 bg-blue-500/10 border-blue-500/30">Scheduled</Badge>
        )}
      </div>

      <div className="flex flex-col gap-1.5 ml-8">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground font-medium">Asset:</span>
          <span className="text-xs font-semibold text-foreground">{schedule.asset.name}</span>
        </div>
        
        <div className="flex items-center justify-between mt-1">
          <div className={cn(
            "text-[10px] font-bold flex items-center gap-1.5",
            isOverdue ? "text-red-600 dark:text-red-400" : "text-muted-foreground"
          )}>
            <Clock className="h-3.5 w-3.5" />
            {format(dueDate, "MMM d, yyyy")} ({formatDistanceToNow(dueDate, { addSuffix: true })})
          </div>
        </div>
      </div>
    </div>
  );
}

interface UpcomingMaintenanceCardProps {
  schedules: any[];
}

export function UpcomingMaintenanceCard({ schedules }: UpcomingMaintenanceCardProps) {
  const sortedSchedules = [...schedules].sort((a, b) => 
    new Date(a.nextDueDate).getTime() - new Date(b.nextDueDate).getTime()
  ).slice(0, 5);

  return (
    <Card className="border-none bg-background/50 backdrop-blur-sm shadow-sm ring-1 ring-border/50 h-full flex flex-col overflow-hidden">
      <CardHeader className="pb-3 border-b border-border/30 bg-muted/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-primary/10 rounded-lg">
              <CalendarDays className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg font-bold tracking-tight">Maintenance</CardTitle>
              <p className="text-xs text-muted-foreground font-medium">Next 5 priority tasks</p>
            </div>
          </div>
          <Badge variant="secondary" className="font-bold text-[10px] h-6 px-2">
            {schedules.length} TOTAL
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 min-h-[400px] overflow-y-auto px-4 pt-4 scrollbar-thin scrollbar-thumb-border/50">
        {sortedSchedules.length > 0 ? (
          <div className="flex flex-col">
            {sortedSchedules.map((schedule) => (
              <MaintenanceItem
                key={schedule.id}
                schedule={schedule}
              />
            ))}
            
            <div className="mt-2 mb-6">
              <Button variant="outline" size="sm" className="w-full text-xs font-bold gap-2 group h-9" disabled>
                View Full Schedule
                <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full py-20 text-muted-foreground gap-4 text-center">
            <div className="p-5 bg-muted/30 rounded-full">
              <AlertCircle className="h-10 w-10 opacity-10" />
            </div>
            <div>
              <p className="text-sm font-bold">Clear Schedule</p>
              <p className="text-xs opacity-60 max-w-[180px] mx-auto mt-1">No preventive maintenance tasks found for the coming weeks.</p>
            </div>
            <Button variant="outline" size="sm" className="h-8 text-[10px] font-bold px-4">
              Add New Schedule
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
