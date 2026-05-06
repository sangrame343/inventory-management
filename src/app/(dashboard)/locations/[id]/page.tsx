import { LocationService } from "@/services/location-service";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { ChevronRight, MapPin, Building, Users, Package, Pencil, Globe, MapPinned } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AssetTable } from "@/components/locations/asset-table";

export default async function LocationDetailPage({ params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.activeCompanyId) redirect("/login");

  const location = await LocationService.getLocationById(params.id, session.user.activeCompanyId);
  if (!location) notFound();

  const breadcrumbs = await LocationService.getBreadcrumbs(params.id, session.user.activeCompanyId);
  const subtreeIds = await LocationService.getSubtreeIds(params.id, session.user.activeCompanyId);

  // Fetch assets for both exact and subtree
  const exactAssets = await db.asset.findMany({
    where: { locationId: params.id, companyId: session.user.activeCompanyId },
    include: { 
      category: true, 
      assignments: { where: { returnedAt: null }, include: { employee: true, user: true } } 
    },
    orderBy: { createdAt: "desc" }
  });

  const subtreeAssets = await db.asset.findMany({
    where: { locationId: { in: subtreeIds }, companyId: session.user.activeCompanyId },
    include: { 
      category: true, 
      location: true, 
      assignments: { where: { returnedAt: null }, include: { employee: true, user: true } } 
    },
    orderBy: { createdAt: "desc" }
  });

  return (
    <div className="flex flex-col gap-6">
      <nav className="flex items-center gap-2 text-[10px] uppercase tracking-wider font-bold text-muted-foreground bg-muted/20 w-fit px-4 py-1.5 rounded-full border border-border/50 shadow-sm">
        <Link href="/locations" className="hover:text-primary transition-colors flex items-center gap-1.5 translate-y-[0.5px]">
          <Building size={12} /> Locations
        </Link>
        {breadcrumbs.map((bc) => (
          <div key={bc.id} className="flex items-center gap-2">
            <ChevronRight size={10} className="opacity-40" />
            <Link 
              href={`/locations/${bc.id}`} 
              className={bc.id === params.id ? "text-primary font-black scale-105" : "hover:text-primary transition-colors"}
            >
              {bc.name}
            </Link>
          </div>
        ))}
      </nav>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-card border border-border/50 p-8 rounded-[2rem] shadow-sm relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-8 opacity-[0.03] translate-x-1/4 -translate-y-1/4 group-hover:scale-105 transition-transform duration-1000">
           <MapPinned className="size-64" />
        </div>
        
        <div className="flex items-center gap-6 relative z-10">
          <div className="p-5 bg-primary/10 rounded-3xl shadow-inner border border-primary/20 backdrop-blur-sm">
            <MapPinned className="size-12 text-primary" />
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-4">
              <h1 className="text-4xl font-black tracking-tight">{location.name}</h1>
              {!location.isActive && <Badge variant="destructive" className="animate-pulse shadow-lg shadow-destructive/20 rounded-full px-4 h-6 text-[10px] font-black uppercase">Archived</Badge>}
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2 px-3 py-1 bg-muted/50 rounded-lg text-[11px] font-bold text-muted-foreground border border-border/50 shadow-sm transition-all hover:bg-muted">
                 <span className="opacity-40 uppercase tracking-tighter">Site Code</span>
                 <span className="text-foreground font-mono">{location.code || "N/A"}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground/80 font-medium hover:text-foreground transition-colors cursor-default">
                <Globe size={16} className="text-primary/50" />
                <span>{location.city || "Regional"}{location.state ? ` • ${location.state}` : ""}</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3 self-end md:self-center relative z-10">
          <Button variant="outline" size="sm" className="h-10 px-6 rounded-2xl border-2 font-bold shadow-sm transition-all active:scale-95">
             <Pencil size={16} className="mr-2" /> Modify Profile
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
        <div className="lg:col-span-3 space-y-8">
          <Tabs defaultValue="assets" className="w-full">
            <div className="flex items-center justify-between border-b-2 border-muted/50 mb-8 px-2">
               <TabsList className="bg-transparent h-auto p-0 gap-10 rounded-none">
                <TabsTrigger value="assets" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-4 data-[state=active]:border-primary rounded-none px-1 pb-4 text-sm font-black uppercase tracking-widest transition-all">Assets Fixed</TabsTrigger>
                <TabsTrigger value="employees" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-4 data-[state=active]:border-primary rounded-none px-1 pb-4 text-sm font-black uppercase tracking-widest transition-all">Global Staff</TabsTrigger>
                <TabsTrigger value="details" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-4 data-[state=active]:border-primary rounded-none px-1 pb-4 text-sm font-black uppercase tracking-widest transition-all">Site Intelligence</TabsTrigger>
               </TabsList>
            </div>
            
            <TabsContent value="assets" className="focus-visible:outline-none transition-all duration-500">
              <AssetTable assets={exactAssets} subtreeAssets={subtreeAssets} />
            </TabsContent>
            
            <TabsContent value="details" className="mt-0 focus-visible:outline-none">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
                 <div className="md:col-span-3 space-y-8 bg-card border border-border/50 rounded-[2.5rem] p-10 shadow-sm relative overflow-hidden">
                    <div className="absolute p-20 opacity-[0.02] -right-10 -bottom-10 pointer-events-none">
                       <MapPin className="size-64" />
                    </div>
                    
                    <div className="relative z-10">
                      <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-primary mb-6 flex items-center gap-2">
                        <span className="w-6 h-0.5 bg-primary rounded-full" /> Mission Profile
                      </h4>
                      <p className="text-base text-muted-foreground leading-[1.8] font-medium italic">"{location.description || "No official mission profile or site narrative has been established for this operational center."}"</p>
                    </div>

                    <div className="relative z-10 pt-4 border-t border-muted/50">
                      <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-primary mb-6 flex items-center gap-2">
                        <span className="w-6 h-0.5 bg-primary rounded-full" /> Physical Address
                      </h4>
                      <address className="not-italic text-sm space-y-4 p-8 bg-muted/10 rounded-3xl border-2 border-border/10 shadow-inner">
                        <div className="font-black text-2xl tracking-tighter text-foreground line-clamp-1">{location.addressLine1 || "Unverified Location"}</div>
                        {location.addressLine2 && <div className="text-muted-foreground font-semibold text-lg">{location.addressLine2}</div>}
                        <div className="flex flex-wrap gap-x-2 text-muted-foreground font-bold">
                           <span>{location.city},</span>
                           <span>{location.state}</span>
                           <span className="font-mono text-primary">{location.postalCode}</span>
                        </div>
                        <div className="text-foreground/40 font-black text-[11px] uppercase tracking-[0.3em] pt-2 border-t border-muted/50 w-fit">{location.country}</div>
                      </address>
                    </div>
                 </div>

                 <div className="md:col-span-2 space-y-8">
                    <div className="p-8 bg-card border border-border/50 rounded-[2.5rem] shadow-sm relative group overflow-hidden">
                       <div className="absolute top-0 right-0 p-4 opacity-[0.05] group-hover:scale-110 transition-transform">
                          <Building className="size-20" />
                       </div>
                       <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-primary mb-8 ml-1">Parent Hierarchy</h4>
                       <div className="space-y-6">
                          <div className="flex items-center gap-4">
                             <div className="size-1.5 rounded-full bg-primary" />
                             <div className="flex flex-col">
                                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60">Higher Command</span>
                                <span className="font-bold text-lg leading-none mt-1">{location.parent?.name || "Global Headquarters"}</span>
                             </div>
                          </div>
                       </div>
                    </div>

                    <div className="p-8 bg-card border border-border/50 rounded-[2.5rem] shadow-sm relative group overflow-hidden">
                       <div className="absolute top-0 right-0 p-4 opacity-[0.05] group-hover:scale-110 transition-transform">
                          <MapPinned className="size-20" />
                       </div>
                       <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-primary mb-8 ml-1">Sub-Unit Intel</h4>
                       <div className="space-y-6">
                          <div className="flex items-center gap-4">
                             <div className="size-1.5 rounded-full bg-primary" />
                             <div className="flex flex-col">
                                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60">Connected Units</span>
                                <span className="font-bold text-lg leading-none mt-1">{location._count.children} Operational Levels</span>
                             </div>
                          </div>
                       </div>
                    </div>
                 </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <div className="lg:col-span-1">
           <div className="bg-foreground text-background p-10 rounded-[2.5rem] shadow-2xl shadow-foreground/20 sticky top-6 overflow-hidden group">
              <Building className="absolute -right-12 -top-12 size-48 opacity-[0.03] group-hover:scale-105 transition-transform duration-1000 rotate-12" />
              <div className="relative z-10 space-y-10">
                 <div className="space-y-1">
                    <h3 className="text-2xl font-black tracking-tighter">Site Metrics</h3>
                    <div className="w-12 h-1 bg-primary rounded-full" />
                 </div>
                 
                 <div className="space-y-10">
                    <div className="flex items-end justify-between group/metric cursor-default">
                       <div className="flex flex-col gap-1">
                          <span className="text-[10px] uppercase font-black tracking-[0.2em] opacity-40 group-hover/metric:opacity-100 group-hover/metric:text-primary transition-all">Direct Assets</span>
                          <span className="text-4xl font-black tabular-nums transition-transform group-hover/metric:scale-105 origin-left tracking-tighter">{exactAssets.length}</span>
                       </div>
                       <Package className="size-10 opacity-10 group-hover/metric:opacity-40 transition-all group-hover/metric:rotate-12" />
                    </div>
                    
                    <div className="h-px bg-background/10" />
                    
                    <div className="flex items-end justify-between group/metric cursor-default text-primary/80 group-hover/metric:text-primary transition-colors">
                       <div className="flex flex-col gap-1 text-background">
                          <span className="text-[10px] uppercase font-black tracking-[0.2em] opacity-40 group-hover/metric:opacity-100 group-hover/metric:text-primary transition-all">Global Assets</span>
                          <span className="text-4xl font-black tabular-nums transition-transform group-hover/metric:scale-105 origin-left tracking-tighter">{subtreeAssets.length}</span>
                       </div>
                       <Building className="size-10 opacity-10 group-hover/metric:opacity-60 transition-all group-hover/metric:scale-110" />
                    </div>

                    <div className="h-px bg-background/10" />

                    <div className="flex items-end justify-between group/metric cursor-default">
                       <div className="flex flex-col gap-1">
                          <span className="text-[10px] uppercase font-black tracking-[0.2em] opacity-40 group-hover/metric:opacity-100 group-hover/metric:text-primary transition-all">Operational Staff</span>
                          <span className="text-4xl font-black tabular-nums transition-transform group-hover/metric:scale-105 origin-left tracking-tighter">{location._count.employees}</span>
                       </div>
                       <Users className="size-10 opacity-10 group-hover/metric:opacity-40 transition-all group-hover/metric:-rotate-6" />
                    </div>
                 </div>
                 
                 <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-black text-xs uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-primary/20 h-14 border-none active:scale-95 transition-all">
                    Perform Site Audit
                 </Button>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
