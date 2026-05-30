"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateUser, deleteUser, createActiveUser } from "@/app/actions/super-admin-actions";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function UsersClient({ users, companies = [] }: { users: any[]; companies?: any[] }) {
  const router = useRouter();
  const [filterStr, setFilterStr] = useState("");
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  // Add User Form State
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newMobile, setNewMobile] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newCompanyId, setNewCompanyId] = useState("");
  const [newRole, setNewRole] = useState("USER");

  const handleAdd = async () => {
    setLoadingAction("add");
    setErrorMsg("");
    if (!newCompanyId) {
      setErrorMsg("Please select a company");
      setLoadingAction(null);
      return;
    }
    const res = await createActiveUser({
      name: newName,
      email: newEmail,
      mobile: newMobile,
      password: newPassword,
      companyId: newCompanyId,
      role: newRole as any,
    });

    if (res.error) {
      setErrorMsg(res.error);
    } else {
      setAddOpen(false);
      setNewName("");
      setNewEmail("");
      setNewMobile("");
      setNewPassword("");
      setNewCompanyId("");
      setNewRole("USER");
      router.refresh();
    }
    setLoadingAction(null);
  };

  const UserRow = ({ user }: { user: any }) => {
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");
    
    // Edit Form State
    const [editName, setEditName] = useState(user.name || "");
    const [editEmail, setEditEmail] = useState(user.email || "");
    const [editMobile, setEditMobile] = useState(user.mobile || "");
    const [editPassword, setEditPassword] = useState("");

    // Display primary role or aggregate
    const roles = user.companyRoles?.map((cr: any) => `${cr.role} @ ${cr.company?.name}`) || [];

    const handleDelete = async () => {
      setLoadingAction(`delete-${user.id}`);
      setErrorMsg("");
      const res = await deleteUser(user.id);
      
      if (res.error) {
        setErrorMsg(res.error);
      } else {
        setDeleteOpen(false);
        router.refresh();
      }
      setLoadingAction(null);
    };

    const handleEdit = async () => {
      setLoadingAction(`edit-${user.id}`);
      setErrorMsg("");
      const res = await updateUser(user.id, {
        name: editName,
        email: editEmail,
        mobile: editMobile,
        password: editPassword,
      });

      if (res.error) {
        setErrorMsg(res.error);
      } else {
        setEditOpen(false);
        setEditPassword(""); // Reset password field string just in case
        router.refresh();
      }
      setLoadingAction(null);
    };

    return (
      <TableRow>
        <TableCell className="font-medium">
          {user.name || "Unknown"}
          <br /><span className="text-xs text-muted-foreground">{user.email}</span>
        </TableCell>
        <TableCell>{user.mobile || "N/A"}</TableCell>
        <TableCell>
          <div className="flex flex-col gap-1 text-xs">
            {roles.length > 0 ? (
              roles.map((r: string, i: number) => <span key={i}>{r}</span>)
            ) : "No assigned roles"}
          </div>
        </TableCell>
        <TableCell>
           <Badge variant="outline">{user.status}</Badge>
        </TableCell>
        <TableCell className="text-right space-x-2">
           <Dialog open={editOpen} onOpenChange={(open) => { setEditOpen(open); setErrorMsg(""); }}>
             <DialogTrigger render={<Button variant="outline" size="sm">Edit</Button>} />
             <DialogContent>
               <DialogHeader>
                 <DialogTitle>Edit User</DialogTitle>
                 <DialogDescription>
                   Update basic information for {user.name}. If you provide a password, it will override the user's current password.
                 </DialogDescription>
               </DialogHeader>
               {errorMsg && <div className="text-sm font-medium text-destructive">{errorMsg}</div>}
               <div className="space-y-4 py-2">
                 <div className="space-y-2">
                   <Label>Name</Label>
                   <Input value={editName} onChange={e => setEditName(e.target.value)} />
                 </div>
                 <div className="space-y-2">
                   <Label>Email</Label>
                   <Input value={editEmail} onChange={e => setEditEmail(e.target.value)} type="email" />
                 </div>
                 <div className="space-y-2">
                   <Label>Mobile</Label>
                   <Input value={editMobile} onChange={e => setEditMobile(e.target.value)} />
                 </div>
                 <div className="space-y-2">
                   <Label>New Password (Optional)</Label>
                   <Input value={editPassword} onChange={e => setEditPassword(e.target.value)} type="password" placeholder="Leave empty to remain unchanged" />
                 </div>
               </div>
               <DialogFooter>
                 <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
                 <Button onClick={handleEdit} disabled={loadingAction === `edit-${user.id}`}>
                    {loadingAction === `edit-${user.id}` ? "Saving..." : "Save Changes"}
                 </Button>
               </DialogFooter>
             </DialogContent>
           </Dialog>

           <Dialog open={deleteOpen} onOpenChange={(open) => { setDeleteOpen(open); setErrorMsg(""); }}>
             <DialogTrigger render={<Button variant="destructive" size="sm">Delete</Button>} />
             <DialogContent>
               <DialogHeader>
                 <DialogTitle>Delete User</DialogTitle>
                 <DialogDescription>
                   Are you sure you want to permanently delete {user.name}? This action cannot be undone and may fail if the user has records associated with them.
                 </DialogDescription>
               </DialogHeader>
               {errorMsg && <div className="text-sm font-medium text-destructive">{errorMsg}</div>}
               <DialogFooter>
                 <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
                 <Button variant="destructive" onClick={handleDelete} disabled={loadingAction === `delete-${user.id}`}>
                    {loadingAction === `delete-${user.id}` ? "Deleting..." : "Confirm Delete"}
                 </Button>
               </DialogFooter>
             </DialogContent>
           </Dialog>
        </TableCell>
      </TableRow>
    );
  };

  const filtered = users.filter((u: any) => 
    (u.name?.toLowerCase().includes(filterStr.toLowerCase()) || 
     u.email?.toLowerCase().includes(filterStr.toLowerCase()))
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <input 
          placeholder="Filter by name or email..." 
          className="border rounded px-3 py-2 w-full max-w-sm"
          value={filterStr}
          onChange={(e) => setFilterStr(e.target.value)}
        />

        <Dialog open={addOpen} onOpenChange={(open) => { setAddOpen(open); setErrorMsg(""); }}>
          <DialogTrigger render={<Button className="flex items-center gap-1.5"><Plus size={16} /> Add User</Button>} />
          <DialogContent className="sm:max-w-[450px]">
            <DialogHeader>
              <DialogTitle>Add User</DialogTitle>
              <DialogDescription>
                Create a new active user and assign them to a company and role immediately.
              </DialogDescription>
            </DialogHeader>
            {errorMsg && <div className="text-sm font-medium text-destructive">{errorMsg}</div>}
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Full Name" />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={newEmail} onChange={e => setNewEmail(e.target.value)} type="email" placeholder="email@example.com" />
              </div>
              <div className="space-y-2">
                <Label>Mobile</Label>
                <Input value={newMobile} onChange={e => setNewMobile(e.target.value)} placeholder="Phone number" />
              </div>
              <div className="space-y-2">
                <Label>Password</Label>
                <Input value={newPassword} onChange={e => setNewPassword(e.target.value)} type="password" placeholder="Password" />
              </div>
              <div className="space-y-2">
                <Label>Company Assignment</Label>
                <Select value={newCompanyId} onValueChange={(val) => setNewCompanyId(val || "")}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Company">
                      {companies.find(c => c.id === newCompanyId)?.name}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {companies.map((company) => (
                      <SelectItem key={company.id} value={company.id}>
                        {company.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={newRole} onValueChange={(val) => setNewRole(val || "USER")}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SUPER_ADMIN">SUPER_ADMIN</SelectItem>
                    <SelectItem value="ADMIN">ADMIN</SelectItem>
                    <SelectItem value="USER">USER</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button onClick={handleAdd} disabled={loadingAction === "add" || !newName || !newEmail || !newPassword || !newCompanyId}>
                {loadingAction === "add" ? "Adding..." : "Add User"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Mobile</TableHead>
              <TableHead>Companies & Roles</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                  No users found.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((u: any) => <UserRow key={u.id} user={u} />)
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
