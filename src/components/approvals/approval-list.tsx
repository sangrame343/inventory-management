"use client";

import { useState } from "react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ApprovalDetailModal } from "./approval-detail-modal";
import { Eye } from "lucide-react";

interface ApprovalListProps {
  initialRequests: any[];
  currentUserId: string;
  isSuperAdmin: boolean;
}

export function ApprovalList({ initialRequests, currentUserId, isSuperAdmin }: ApprovalListProps) {
  const [selectedRequest, setSelectedRequest] = useState<any>(null);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">Pending</Badge>;
      case "APPROVED":
        return <Badge variant="secondary" className="bg-green-500/10 text-green-500 border-green-500/20">Approved</Badge>;
      case "REJECTED":
        return <Badge variant="secondary" className="bg-red-500/10 text-red-500 border-red-500/20">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Requested Date</TableHead>
            <TableHead>Requested By</TableHead>
            <TableHead>Module</TableHead>
            <TableHead>Action</TableHead>
            <TableHead>Title</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {initialRequests.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="h-24 text-center">
                No requests found.
              </TableCell>
            </TableRow>
          ) : (
            initialRequests.map((request) => (
              <TableRow key={request.id}>
                <TableCell className="font-medium">
                  {format(new Date(request.createdAt), "MMM dd, yyyy HH:mm")}
                </TableCell>
                <TableCell>{request.requestedBy.name}</TableCell>
                <TableCell>
                  <Badge variant="outline">{request.module}</Badge>
                </TableCell>
                <TableCell>
                   <Badge variant="secondary" className="uppercase text-[10px]">{request.action}</Badge>
                </TableCell>
                <TableCell className="max-w-[200px] truncate">{request.title}</TableCell>
                <TableCell>{getStatusBadge(request.status)}</TableCell>
                <TableCell className="text-right">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setSelectedRequest(request)}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View Details
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <ApprovalDetailModal 
        request={selectedRequest} 
        open={!!selectedRequest} 
        onOpenChange={(open) => !open && setSelectedRequest(null)}
        currentUserId={currentUserId}
        isSuperAdmin={isSuperAdmin}
      />
    </div>
  );
}
