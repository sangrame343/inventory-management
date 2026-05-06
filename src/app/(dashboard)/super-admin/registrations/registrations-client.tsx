"use client";

import { useState } from "react";
import { User } from "@prisma/client";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { approveRegistration, rejectRegistration } from "@/app/actions/super-admin-actions";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

export function RegistrationsClient({ 
  registrations,
  companies 
}: { 
  registrations: any[],
  companies: {id: string, name: string}[]
}) {
  const [filterStr, setFilterStr] = useState("");
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  // Simplified getting company name
  const getCompanyName = (id: string | null) => {
    if (!id) return "N/A";
    const comp = companies.find(c => c.id === id);
    return comp ? comp.name : id;
  };

  const handleApprove = async (id: string) => {
    setLoadingAction(`approve-${id}`);
    await approveRegistration(id);
    setLoadingAction(null);
  };

  const RegistrationRow = ({ user }: { user: any }) => {
    const [remarks, setRemarks] = useState("");
    const [rejectionOpen, setRejectionOpen] = useState(false);

    const handleReject = async () => {
      setLoadingAction(`reject-${user.id}`);
      await rejectRegistration(user.id, remarks);
      setLoadingAction(null);
      setRejectionOpen(false);
    };

    return (
      <TableRow>
        <TableCell className="font-medium">
          {user.name || "Unknown"}
          <br /><span className="text-xs text-muted-foreground">{user.email}</span>
        </TableCell>
        <TableCell>{user.mobile || "N/A"}</TableCell>
        <TableCell>{getCompanyName(user.requestedCompanyId)}</TableCell>
        <TableCell>{user.requestedRole || "N/A"}</TableCell>
        <TableCell>{format(new Date(user.createdAt || "2000-01-01"), "PPp")}</TableCell>
        <TableCell>
          <Badge variant={user.status === "PENDING" ? "outline" : "destructive"}>{user.status}</Badge>
        </TableCell>
        <TableCell className="text-right space-x-2">
          {user.status === "PENDING" && (
            <>
              <Button 
                variant="default" 
                size="sm" 
                onClick={() => handleApprove(user.id)}
                disabled={loadingAction === `approve-${user.id}`}
              >
                Approve
              </Button>
              
              <Dialog open={rejectionOpen} onOpenChange={setRejectionOpen}>
                <DialogTrigger asChild>
                  <Button variant="destructive" size="sm">Reject</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Reject Registration</DialogTitle>
                    <DialogDescription>
                      Provide an optional reason for rejecting {user.name}'s registration.
                    </DialogDescription>
                  </DialogHeader>
                  <Textarea 
                    value={remarks} 
                    onChange={e => setRemarks(e.target.value)} 
                    placeholder="Reason for rejection..."
                  />
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setRejectionOpen(false)}>Cancel</Button>
                    <Button variant="destructive" onClick={handleReject} disabled={loadingAction === `reject-${user.id}`}>Confirm Reject</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </>
          )}
        </TableCell>
      </TableRow>
    );
  };

  // very basic filtering for illustration
  const filtered = registrations.filter(r => 
    (r.name?.toLowerCase().includes(filterStr.toLowerCase()) || 
     r.email?.toLowerCase().includes(filterStr.toLowerCase()) ||
     r.status.toLowerCase().includes(filterStr.toLowerCase()))
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <input 
          placeholder="Filter by name, email, or status..." 
          className="border rounded px-3 py-2 w-full max-w-sm"
          value={filterStr}
          onChange={(e) => setFilterStr(e.target.value)}
        />
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Mobile</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Requested Role</TableHead>
              <TableHead>Requested Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center h-24 text-muted-foreground">
                  No registrations found.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((r) => <RegistrationRow key={r.id} user={r} />)
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
