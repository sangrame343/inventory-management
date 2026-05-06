"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { companySettingsSchema, type CompanySettingsInput } from "@/lib/validations/settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { toast } from "sonner";
import { ShieldCheck, Calendar, Globe, BellRing, Hash, Save, RotateCcw } from "lucide-react";
import { useState } from "react";

interface Props {
  settings: {
    assetCodePrefix: string | null;
    currency: string | null;
    dateFormat: string | null;
    maintenanceReminderDays: number;
    requireTransferApproval: boolean;
    requireMaintenanceApproval: boolean;
    autoGenerateAssetCode: boolean;
  };
}

export function GeneralSettingsForm({ settings }: Props) {
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<CompanySettingsInput>({
    resolver: zodResolver(companySettingsSchema),
    defaultValues: {
      assetCodePrefix: settings.assetCodePrefix || "ASSET",
      currency: settings.currency || "INR",
      dateFormat: settings.dateFormat || "DD-MM-YYYY",
      maintenanceReminderDays: settings.maintenanceReminderDays,
      requireTransferApproval: settings.requireTransferApproval,
      requireMaintenanceApproval: settings.requireMaintenanceApproval,
      autoGenerateAssetCode: settings.autoGenerateAssetCode,
    },
  });

  async function onSubmit(data: CompanySettingsInput) {
    setIsLoading(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error?.[0]?.message || "Failed to update settings");
      }

      toast.success("Configuration Saved", {
        description: "Company-wide preferences have been successfully synchronized.",
      });
    } catch (error: any) {
      toast.error("Update Failed", {
        description: error.message || "Encountered an internal error while synchronizing configuration.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <Card className="rounded-[2.5rem] border-border/50 shadow-xl shadow-primary/5 bg-card overflow-hidden">
          <CardHeader className="p-8 border-b border-border/50 bg-muted/20">
             <div className="size-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 border border-primary/20">
                <Globe className="text-primary size-6 shadow-sm" />
             </div>
             <CardTitle className="text-2xl font-black tracking-tight">Regional Preferences</CardTitle>
             <CardDescription>Configure currency, date formatting, and regional standards.</CardDescription>
          </CardHeader>
          <CardContent className="p-8 space-y-8">
             <div className="space-y-3">
                <Label className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Company Currency</Label>
                <Select value={form.watch("currency") || "INR"} onValueChange={(val) => form.setValue("currency", val || "INR")}>
                   <SelectTrigger className="h-12 rounded-xl bg-muted/30 border-none shadow-inner font-bold">
                      <SelectValue placeholder="Select Currency">
                          {form.watch("currency") === "INR" ? "Indian Rupee (₹)" : 
                           form.watch("currency") === "USD" ? "US Dollar ($)" : 
                           form.watch("currency") === "EUR" ? "Euro (€)" : null}
                      </SelectValue>
                   </SelectTrigger>
                   <SelectContent>
                      <SelectItem value="INR">Indian Rupee (₹)</SelectItem>
                      <SelectItem value="USD">US Dollar ($)</SelectItem>
                      <SelectItem value="EUR">Euro (€)</SelectItem>
                   </SelectContent>
                </Select>
             </div>

             <div className="space-y-3">
                <Label className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Presentation Format</Label>
                <div className="grid grid-cols-2 gap-4">
                   <div 
                    className={form.watch("dateFormat") === "DD-MM-YYYY" ? "p-4 rounded-2xl border-2 border-primary bg-primary/5 cursor-pointer shadow-sm" : "p-4 rounded-2xl border-2 border-transparent bg-muted/20 cursor-pointer hover:bg-muted/30 transition-colors"} 
                    onClick={() => form.setValue("dateFormat", "DD-MM-YYYY")}
                   >
                      <Calendar size={18} className="mb-2 text-primary" />
                      <div className="font-bold text-sm">DD-MM-YYYY</div>
                      <div className="text-[10px] opacity-40 uppercase font-black tracking-tighter">Standard Euro</div>
                   </div>
                   <div 
                    className={form.watch("dateFormat") === "MM/DD/YYYY" ? "p-4 rounded-2xl border-2 border-primary bg-primary/5 cursor-pointer shadow-sm" : "p-4 rounded-2xl border-2 border-transparent bg-muted/20 cursor-pointer hover:bg-muted/30 transition-colors"} 
                    onClick={() => form.setValue("dateFormat", "MM/DD/YYYY")}
                   >
                      <Calendar size={18} className="mb-2 text-primary" />
                      <div className="font-bold text-sm">MM/DD/YYYY</div>
                      <div className="text-[10px] opacity-40 uppercase font-black tracking-tighter">US Standard</div>
                   </div>
                </div>
             </div>
          </CardContent>
        </Card>

        <Card className="rounded-[2.5rem] border-border/50 shadow-xl shadow-primary/5 bg-card overflow-hidden">
          <CardHeader className="p-8 border-b border-border/50 bg-muted/20">
             <div className="size-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 border border-primary/20">
                <ShieldCheck className="text-primary size-6 shadow-sm" />
             </div>
             <CardTitle className="text-2xl font-black tracking-tight">Security & Governance</CardTitle>
             <CardDescription>Define approval gates and operational restrictions.</CardDescription>
          </CardHeader>
          <CardContent className="p-8 space-y-8">
             <div className="flex items-center justify-between p-6 bg-muted/20 rounded-2xl border border-border/50 shadow-inner group">
                <div className="space-y-1">
                   <Label className="text-sm font-black uppercase tracking-widest cursor-pointer group-hover:text-primary transition-colors">Inter-Site Transfer Approvals</Label>
                   <p className="text-xs text-muted-foreground font-medium">Force manual review for asset movements between locations.</p>
                </div>
                <Switch 
                  checked={form.watch("requireTransferApproval")} 
                  onCheckedChange={(val: boolean) => form.setValue("requireTransferApproval", val)} 
                />
             </div>

             <div className="flex items-center justify-between p-6 bg-muted/20 rounded-2xl border border-border/50 shadow-inner group">
                <div className="space-y-1">
                   <Label className="text-sm font-black uppercase tracking-widest cursor-pointer group-hover:text-primary transition-colors">Vendor Maintenance Gates</Label>
                   <p className="text-xs text-muted-foreground font-medium">Require signature for third-party maintenance activities.</p>
                </div>
                <Switch 
                  checked={form.watch("requireMaintenanceApproval")} 
                  onCheckedChange={(val: boolean) => form.setValue("requireMaintenanceApproval", val)} 
                />
             </div>
          </CardContent>
        </Card>

        <Card className="rounded-[2.5rem] border-border/50 shadow-xl shadow-primary/5 bg-card overflow-hidden lg:col-span-2">
          <CardHeader className="p-8 border-b border-border/50 bg-muted/20">
             <div className="size-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 border border-primary/20">
                <Hash className="text-primary size-6 shadow-sm" />
             </div>
             <CardTitle className="text-2xl font-black tracking-tight">Naming & Automation</CardTitle>
             <CardDescription>Sequential coding rules and proactive notification schedules.</CardDescription>
          </CardHeader>
          <CardContent className="p-8">
             <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                <div className="space-y-3">
                   <Label className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Asset Code Prefix</Label>
                   <Input {...form.register("assetCodePrefix")} className="h-12 rounded-xl bg-muted/30 border-none shadow-inner font-mono font-bold text-center tracking-widest" />
                </div>
                <div className="space-y-3">
                   <Label className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground ml-1 flex items-center gap-2 underline underline-offset-4 decoration-primary/30 decoration-2">
                       <BellRing size={12} /> Reminder Lead (Days)
                   </Label>
                   <Input type="number" {...form.register("maintenanceReminderDays", { valueAsNumber: true })} className="h-12 rounded-xl bg-muted/30 border-none shadow-inner font-bold text-center" />
                </div>
                <div className="flex items-center justify-between p-4 bg-primary/5 rounded-xl border-2 border-primary/10 shadow-sm md:self-end h-12">
                   <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Auto-Generate Sequencing</span>
                   <Switch 
                    checked={form.watch("autoGenerateAssetCode")} 
                    onCheckedChange={(val: boolean) => form.setValue("autoGenerateAssetCode", val)} 
                   />
                </div>
             </div>
          </CardContent>
          <CardFooter className="p-8 bg-muted/30 border-t border-border/50 flex justify-end gap-3">
             <Button type="button" variant="ghost" className="rounded-xl h-12 px-6 font-bold uppercase text-[10px] tracking-widest" onClick={() => form.reset()}>
                <RotateCcw className="mr-2 size-4 opacity-40" /> Reset Changes
             </Button>
             <Button type="submit" disabled={isLoading} className="rounded-xl h-12 px-10 font-black shadow-lg shadow-primary/20 uppercase text-[11px] tracking-[0.2em]">
                {isLoading ? "Synchronizing..." : <><Save className="mr-2 size-4" /> Commit Configuration</>}
             </Button>
          </CardFooter>
        </Card>
      </div>
    </form>
  );
}
