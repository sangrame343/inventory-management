"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { MoreHorizontal, Pencil, CheckCircle2, History } from "lucide-react";
import { useState } from "react";
import { TicketStatus, TicketPriority, MaintenanceType } from "@prisma/client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useRouter } from "next/navigation";

interface TicketListProps {
  initialTickets: any[];
  assets: any[];
  users: any[];
  vendors: any[];
}

export function TicketList({ initialTickets }: TicketListProps) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: TicketStatus }) => {
      const res = await fetch(`/api/maintenance/tickets/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      return res.json();
    },
    onSuccess: () => {
      router.refresh();
    },
  });

  const getPriorityBadge = (priority: TicketPriority) => {
    switch (priority) {
      case "CRITICAL": return <Badge variant="destructive">CRITICAL</Badge>;
      case "HIGH": return <Badge variant="default" className="bg-orange-500">HIGH</Badge>;
      case "MEDIUM": return <Badge variant="secondary">MEDIUM</Badge>;
      case "LOW": return <Badge variant="outline">LOW</Badge>;
      default: return <Badge variant="outline">{priority}</Badge>;
    }
  };

  const getStatusBadge = (status: TicketStatus) => {
    switch (status) {
      case "OPEN": return <Badge variant="default" className="bg-blue-500">OPEN</Badge>;
      case "IN_PROGRESS": return <Badge variant="default" className="bg-yellow-500">IN PROGRESS</Badge>;
      case "PENDING_PARTS": return <Badge variant="outline" className="text-yellow-600 border-yellow-600">PENDING PARTS</Badge>;
      case "ON_HOLD": return <Badge variant="secondary">ON HOLD</Badge>;
      case "RESOLVED": return <Badge variant="default" className="bg-green-600">RESOLVED</Badge>;
      case "CLOSED": return <Badge variant="default" className="bg-slate-700">CLOSED</Badge>;
      case "CANCELLED": return <Badge variant="destructive">CANCELLED</Badge>;
    }
  };

  return (
    <div className="rounded-md border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Asset</TableHead>
            <TableHead>Issue / Title</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Priority</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Assigned To</TableHead>
            <TableHead>Vendor</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {initialTickets.length === 0 ? (
            <TableRow>
              <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                No tickets found.
              </TableCell>
            </TableRow>
          ) : (
            initialTickets.map((ticket) => (
              <TableRow key={ticket.id}>
                <TableCell>
                  <div className="font-medium">{ticket.asset?.name}</div>
                  <div className="text-xs text-muted-foreground">{ticket.asset?.assetTag}</div>
                </TableCell>
                <TableCell>
                  <div className="font-medium">{ticket.title}</div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{ticket.type}</Badge>
                </TableCell>
                <TableCell>{getPriorityBadge(ticket.priority)}</TableCell>
                <TableCell>{getStatusBadge(ticket.status)}</TableCell>
                <TableCell>{ticket.assignedTo?.name || "Unassigned"}</TableCell>
                <TableCell>{ticket.vendor?.name || "None"}</TableCell>
                <TableCell>{format(new Date(ticket.createdAt), "PP")}</TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      }
                    />
                    <DropdownMenuContent align="end">
                      <DropdownMenuGroup>
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      </DropdownMenuGroup>
                      <DropdownMenuSeparator />
                      {ticket.status === "OPEN" && (
                        <DropdownMenuItem onClick={() => updateStatusMutation.mutate({ id: ticket.id, status: "IN_PROGRESS" })}>
                          Start Work (REPAIR)
                        </DropdownMenuItem>
                      )}
                      {(ticket.status === "IN_PROGRESS" || ticket.status === "PENDING_PARTS") && (
                        <DropdownMenuItem onClick={() => updateStatusMutation.mutate({ id: ticket.id, status: "RESOLVED" })}>
                          Mark Resolved
                        </DropdownMenuItem>
                      )}
                      {ticket.status === "RESOLVED" && (
                        <DropdownMenuItem onClick={() => updateStatusMutation.mutate({ id: ticket.id, status: "CLOSED" })}>
                          Close Ticket
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem>
                        <Pencil className="mr-2 h-4 w-4" /> Edit Details
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
