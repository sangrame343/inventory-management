import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SettingsService } from "@/services/settings-service";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, Building2, Users, Package, ShoppingCart, Boxes, Ruler, LayoutGrid } from "lucide-react";
import { GeneralSettingsForm } from "@/components/settings/general-settings-form";
import { MasterDataList } from "@/components/settings/master-data-list";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.activeCompanyId) redirect("/login");

  const settings = await SettingsService.getSettings(session.user.activeCompanyId);

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 md:px-2">
        <div className="flex items-center gap-5">
          <div className="p-4 bg-primary/10 rounded-3xl shadow-inner border border-primary/20 backdrop-blur-sm">
            <Settings className="size-10 text-primary shadow-sm" />
          </div>
          <div className="space-y-1">
            <h1 className="text-4xl font-black tracking-tighter uppercase">System Console</h1>
            <p className="text-sm text-muted-foreground font-semibold flex items-center gap-2">
               <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
               Global Control Panel • Configuration & Master Data Management
            </p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="general" className="w-full space-y-12">
        <div className="flex justify-center md:justify-start overflow-x-auto w-full no-scrollbar pb-2">
          <TabsList className="bg-muted/20 p-2 rounded-[2rem] border border-border/50 h-auto gap-2 shadow-inner">
            <TabsTrigger value="general" className="rounded-2xl px-8 py-3.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-black text-[10px] uppercase tracking-[0.2em] transition-all shadow-sm">
              <LayoutGrid size={14} className="mr-2 opacity-50" /> Preferences
            </TabsTrigger>
            <TabsTrigger value="departments" className="rounded-2xl px-8 py-3.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-black text-[10px] uppercase tracking-[0.2em] transition-all shadow-sm">
              <Users size={14} className="mr-2 opacity-50" /> Departments
            </TabsTrigger>
            <TabsTrigger value="asset-categories" className="rounded-2xl px-8 py-3.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-black text-[10px] uppercase tracking-[0.2em] transition-all shadow-sm">
              <Package size={14} className="mr-2 opacity-50" /> Asset Domains
            </TabsTrigger>
            <TabsTrigger value="vendors" className="rounded-2xl px-8 py-3.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-black text-[10px] uppercase tracking-[0.2em] transition-all shadow-sm">
              <ShoppingCart size={14} className="mr-2 opacity-50" /> Vendors
            </TabsTrigger>
            <TabsTrigger value="inventory-categories" className="rounded-2xl px-8 py-3.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-black text-[10px] uppercase tracking-[0.2em] transition-all shadow-sm">
              <Boxes size={14} className="mr-2 opacity-50" /> Stock Cats
            </TabsTrigger>
            <TabsTrigger value="units-of-measure" className="rounded-2xl px-8 py-3.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-black text-[10px] uppercase tracking-[0.2em] transition-all shadow-sm">
              <Ruler size={14} className="mr-2 opacity-50" /> Units
            </TabsTrigger>
            <TabsTrigger value="inventory-locations" className="rounded-2xl px-8 py-3.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-black text-[10px] uppercase tracking-[0.2em] transition-all shadow-sm">
              <Boxes size={14} className="mr-2 opacity-50" /> Inventory Locs
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="md:px-2">
          <TabsContent value="general" className="focus-visible:outline-none transition-all duration-700">
            <GeneralSettingsForm settings={settings as any} />
          </TabsContent>

          <TabsContent value="departments" className="focus-visible:outline-none">
            <MasterDataList domain="departments" label="Department" icon={<Building2 size={20} />} />
          </TabsContent>

          <TabsContent value="asset-categories" className="focus-visible:outline-none">
            <MasterDataList domain="asset-categories" label="Asset Category" icon={<Package size={20} />} />
          </TabsContent>

          <TabsContent value="vendors" className="focus-visible:outline-none">
            <MasterDataList domain="vendors" label="Vendor" icon={<ShoppingCart size={20} />} />
          </TabsContent>

          <TabsContent value="inventory-categories" className="focus-visible:outline-none">
            <MasterDataList domain="inventory-categories" label="Inventory Category" icon={<Boxes size={20} />} />
          </TabsContent>

          <TabsContent value="units-of-measure" className="focus-visible:outline-none">
            <MasterDataList domain="units-of-measure" label="Unit of Measure" icon={<Ruler size={20} />} />
          </TabsContent>

          <TabsContent value="inventory-locations" className="focus-visible:outline-none">
            <MasterDataList domain="inventory-locations" label="Inventory Location" icon={<Boxes size={20} />} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
