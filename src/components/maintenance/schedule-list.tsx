"use client";

import { useMutation } from "@tanstack/react-query";
import { format, formatDistanceToNow } from "date-fns";
import { CalendarClock, Power, PowerOff, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScheduleForm } from "@/components/maintenance/schedule-form";

interface ScheduleListProps {
  schedules: any[];
  assets: any[];
}

export function ScheduleList({ schedules, assets }: ScheduleListProps) {
  const router = useRouter();

  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const res = await fetch(`/api/maintenance/schedules/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive }),
      });
      if (!res.ok) throw new Error("Failed to toggle schedule");
      return res.json();
    },
    onSuccess: () => {
      router.refresh();
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <ScheduleForm assets={assets} />
      </div>
      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Asset</TableHead>
              <TableHead>Service Name</TableHead>
              <TableHead>Frequency (Days)</TableHead>
              <TableHead>Last Service</TableHead>
              <TableHead>Next Due</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {schedules.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  No preventive maintenance schedules defined.
                </TableCell>
              </TableRow>
            ) : (
              schedules.map((schedule) => {
                const isOverdue = new Date(schedule.nextDueDate) < new Date();
                
                return (
                  <TableRow key={schedule.id}>
                    <TableCell>
                      <div className="font-medium">{schedule.asset?.name}</div>
                      <div className="text-xs text-muted-foreground">{schedule.asset?.assetTag}</div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{schedule.title}</div>
                    </TableCell>
                    <TableCell>{schedule.frequencyDays} days</TableCell>
                    <TableCell>
                      {schedule.lastMaintenanceDate ? format(new Date(schedule.lastMaintenanceDate), "PP") : "Never"}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className={isOverdue && schedule.isActive ? "text-destructive font-bold" : ""}>
                          {format(new Date(schedule.nextDueDate), "PP")}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {isOverdue ? "Overdue by " : "Due in "}
                          {formatDistanceToNow(new Date(schedule.nextDueDate), { addSuffix: false })}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {schedule.isActive ? (
                        <Badge variant="default" className="bg-green-600">ACTIVE</Badge>
                      ) : (
                        <Badge variant="secondary">PAUSED</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => toggleMutation.mutate({ id: schedule.id, isActive: !schedule.isActive })}
                          title={schedule.isActive ? "Pause Schedule" : "Resume Schedule"}
                        >
                          {schedule.isActive ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
