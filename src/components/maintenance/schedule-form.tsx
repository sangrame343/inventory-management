"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Calendar } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";

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

interface ScheduleFormProps {
  assets: any[];
}

export function ScheduleForm({ assets }: ScheduleFormProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    assetId: "",
    title: "",
    description: "",
    frequencyDays: "90",
    nextDueDate: new Date().toISOString().slice(0, 10),
  });

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/maintenance/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create schedule");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maintenance-schedules"] });
      setOpen(false);
      setFormData({
        assetId: "",
        title: "",
        description: "",
        frequencyDays: "90",
        nextDueDate: new Date().toISOString().slice(0, 10),
      });
      router.refresh();
    },
    onError: (err: any) => {
      alert(err.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({
      ...formData,
      frequencyDays: Number(formData.frequencyDays),
      nextDueDate: new Date(formData.nextDueDate).toISOString(),
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline">
            <Calendar className="mr-2 h-4 w-4" /> Add PM Schedule
          </Button>
        }
      />
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Preventive Maintenance Schedule</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
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
            <Label htmlFor="sTitle">Schedule Title</Label>
            <Input
              id="sTitle"
              value={formData.title}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g. Quarterly Service, Annual Inspection"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sDescription">Maintenance Tasks (Description)</Label>
            <Textarea
              id="sDescription"
              value={formData.description}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Dusting, check battery, etc."
              rows={3}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="frequency">Frequency (Days)</Label>
              <Input
                id="frequency"
                type="number"
                value={formData.frequencyDays}
                onChange={(e) => setFormData({ ...formData, frequencyDays: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nextDate">Initial Due Date</Label>
              <Input
                id="nextDate"
                type="date"
                value={formData.nextDueDate}
                onChange={(e) => setFormData({ ...formData, nextDueDate: e.target.value })}
                required
              />
            </div>
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
              {mutation.isPending ? "Creating..." : "Set Schedule"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
