"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Wrench } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface MaintenanceTicketFormProps {
  assets: any[];
  users: any[];
  vendors: any[];
}

export function MaintenanceTicketForm({
  assets,
  users,
  vendors,
}: MaintenanceTicketFormProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    assetId: "",
    title: "",
    description: "",
    priority: "MEDIUM",
    type: "CORRECTIVE",
    assignedToId: "",
    vendorId: "",
    scheduledDate: "",
    estimatedCost: "",
  });

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/maintenance/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create ticket");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maintenance-tickets"] });
      setOpen(false);
      setFormData({
        assetId: "",
        title: "",
        description: "",
        priority: "MEDIUM",
        type: "CORRECTIVE",
        assignedToId: "",
        vendorId: "",
        scheduledDate: "",
        estimatedCost: "",
      });
      router.refresh();
    },
    onError: (err: any) => {
      toast.error(err.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({
      ...formData,
      estimatedCost: formData.estimatedCost === "" ? null : Number(formData.estimatedCost),
      scheduledDate: formData.scheduledDate === "" ? null : new Date(formData.scheduledDate).toISOString(),
      assignedToId: formData.assignedToId === "" ? null : formData.assignedToId,
      vendorId: formData.vendorId === "" ? null : formData.vendorId,
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button>
            <Plus className="mr-2 h-4 w-4" /> New Ticket
          </Button>
        }
      />
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Raise Maintenance Ticket</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Asset</Label>
              <Select
                value={formData.assetId}
                onValueChange={(v) => setFormData({ ...formData, assetId: v ?? "" })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select asset">
                    {assets.find(a => a.id === formData.assetId)?.name}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {assets.map((asset) => (
                    <SelectItem key={asset.id} value={asset.id}>
                      {asset.name} ({asset.assetTag})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Maintenance Type</Label>
              <Select
                value={formData.type}
                onValueChange={(v) => setFormData({ ...formData, type: v ?? "CORRECTIVE" })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type">
                    {formData.type === "CORRECTIVE" ? "Corrective (Repair)" : 
                     formData.type === "PREVENTIVE" ? "Preventive" : 
                     formData.type === "UPGRADE" ? "Upgrade" : 
                     formData.type === "OTHER" ? "Other" : null}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CORRECTIVE">Corrective (Repair)</SelectItem>
                  <SelectItem value="PREVENTIVE">Preventive</SelectItem>
                  <SelectItem value="UPGRADE">Upgrade</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Issue Summary / Title</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g. Screen flickering, annual service"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Detailed Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Provide more context about the issue..."
              rows={3}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select
                value={formData.priority}
                onValueChange={(v) => setFormData({ ...formData, priority: v ?? "MEDIUM" })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select priority">
                    {formData.priority.charAt(0) + formData.priority.slice(1).toLowerCase()}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">Low</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="CRITICAL">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="scheduledDate">Scheduled Date (Optional)</Label>
              <Input
                id="scheduledDate"
                type="date"
                value={formData.scheduledDate}
                onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Assigned Technician (Internal)</Label>
              <Select
                value={formData.assignedToId}
                onValueChange={(v) => setFormData({ ...formData, assignedToId: v ?? "" })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select user">
                    {users.find(u => u.id === formData.assignedToId)?.name || "None / External Only"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None / External Only</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Service Vendor (External)</Label>
              <Select
                value={formData.vendorId}
                onValueChange={(v) => setFormData({ ...formData, vendorId: v ?? "" })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select vendor">
                    {vendors.find(v => v.id === formData.vendorId)?.name || "None / Internal Only"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None / Internal Only</SelectItem>
                  {vendors.map((vendor) => (
                    <SelectItem key={vendor.id} value={vendor.id}>
                      {vendor.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="estimatedCost">Estimated Cost</Label>
            <Input
              id="estimatedCost"
              type="number"
              value={formData.estimatedCost}
              onChange={(e) => setFormData({ ...formData, estimatedCost: e.target.value })}
              placeholder="0.00"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={mutation.isPending || !formData.assetId || !formData.title}
            >
              {mutation.isPending ? "Creating..." : "Create Ticket"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
