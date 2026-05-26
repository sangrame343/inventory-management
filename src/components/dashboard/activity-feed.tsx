"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClipboardEdit, Activity, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ActivityFilters } from "./activity-filters";
import { ActivityItem } from "./activity-item";
import { isToday, subDays, isAfter } from "date-fns";

interface ActivityFeedProps {
  activities: any[];
}

export function ActivityFeed({ activities: initialActivities }: ActivityFeedProps) {
  const [filters, setFilters] = useState({
    search: "",
    module: "all",
    action: "all",
    period: "all",
  });

  const filteredActivities = useMemo(() => {
    return initialActivities.filter((activity) => {
      // Search filter
      if (filters.search) {
        const q = filters.search.toLowerCase();
        const inAction = activity.action.toLowerCase().includes(q);
        const inEntity = activity.entity.toLowerCase().includes(q);
        const inDetails = activity.details?.toLowerCase().includes(q) || false;
        const inUser = activity.user?.name?.toLowerCase().includes(q) || false;
        if (!inAction && !inEntity && !inDetails && !inUser) return false;
      }

      // Module filter
      if (filters.module !== "all") {
        if (!activity.entity.toLowerCase().includes(filters.module)) return false;
      }

      // Action filter
      if (filters.action !== "all") {
        if (!activity.action.toLowerCase().includes(filters.action)) return false;
      }

      // Period filter
      if (filters.period !== "all") {
        const date = new Date(activity.createdAt);
        if (filters.period === "today") {
          if (!isToday(date)) return false;
        } else if (filters.period === "7d") {
          if (!isAfter(date, subDays(new Date(), 7))) return false;
        } else if (filters.period === "30d") {
          if (!isAfter(date, subDays(new Date(), 30))) return false;
        }
      }

      return true;
    });
  }, [initialActivities, filters]);

  const displayedActivities = filteredActivities.slice(0, 8); // Show only top 8

  return (
    <Card className="border-none bg-background/50 backdrop-blur-sm shadow-sm ring-1 ring-border/50 h-full flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between mb-4">
          <div>
            <CardTitle className="text-lg font-bold tracking-tight">Recent Activity</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">Real-time audit trail of all platform actions</p>
          </div>
          <div className="p-2 bg-primary/10 rounded-lg">
            <ClipboardEdit className="h-5 w-5 text-primary" />
          </div>
        </div>
        
        <ActivityFilters filters={filters} onFilterChange={setFilters} />
      </CardHeader>
      
      <CardContent className="flex-1 min-h-[400px] overflow-y-auto px-6 pt-2 scrollbar-thin scrollbar-thumb-border/50">
        {displayedActivities.length > 0 ? (
          <div className="flex flex-col mt-2">
            {displayedActivities.map((activity, idx) => (
              <ActivityItem
                key={activity.id}
                activity={activity}
                isLast={idx === displayedActivities.length - 1}
              />
            ))}
            
            {filteredActivities.length > 8 && (
              <div className="pt-2 pb-6 flex justify-center">
                <Button variant="outline" size="sm" className="w-full text-xs font-bold gap-2 group" disabled>
                  View All Activity 
                  <ChevronRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full py-20 text-muted-foreground gap-3">
            <div className="p-4 bg-muted/50 rounded-full">
              <Activity className="h-10 w-10 opacity-20" />
            </div>
            <div className="text-center">
              <p className="text-sm font-bold">No matching activity</p>
              <p className="text-xs opacity-70">Try adjusting your filters or search term</p>
            </div>
            <Button variant="link" size="sm" onClick={() => setFilters({search: "", module: "all", action: "all", period: "all"})} className="text-xs">
              Clear all filters
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
