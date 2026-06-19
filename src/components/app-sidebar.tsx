"use client";

import * as React from "react";
import {
  Package,
  Wrench,
  Users,
  Settings,
  LayoutDashboard,
  Building,
  Boxes,
  Activity,
  LogOut,
  ChevronUp,
  User2,
  ShieldCheck,
  Settings2,
} from "lucide-react";
import { useSession, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";
import { cn } from "@/lib/utils";

const mainNav = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Assets", url: "/assets", icon: Package },
  { title: "Inventory", url: "/inventory", icon: Boxes },
  { title: "Acknowledgements", url: "/acknowledgements", icon: ShieldCheck },
  { title: "Maintenance", url: "/maintenance", icon: Wrench },
  { title: "Employees", url: "/employees", icon: Users },
  { title: "Transfers", url: "/transfers", icon: Activity },
  { title: "Locations", url: "/locations", icon: Building },
  { title: "Settings", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const userName = session?.user?.name || "User";
  const isSuperAdmin = (session?.user as any)?.isSuperAdmin;
  const role = (session?.user as any)?.role as string;

  const handleSignOut = () => {
    signOut({ callbackUrl: "/login" });
  };

  // Build nav based on role
  const navItems = mainNav.filter(item => {
    if (role === "USER") {
        // Users only see Dashboard and Assets
        return ["Dashboard", "Assets"].includes(item.title);
    }
    return true;
  });

  // Add Admin Panel for elevated roles
  if (role === "SUPER_ADMIN" || role === "ADMIN" || isSuperAdmin) {
    navItems.push({
      title: "Admin Panel",
      url: "/admin-panel",
      icon: Settings2,
    });
  }

  return (
    <Sidebar variant="inset" className="border-r border-border/40">
      <SidebarHeader className="h-16 flex items-center justify-center border-b border-border/40">
        <Link href="/dashboard" className="flex items-center gap-2.5 px-4 w-full group/brand cursor-pointer">
          <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm group-hover/brand:scale-105 transition-all duration-300">
            <Package className="size-4.5 transition-transform group-hover/brand:rotate-12 duration-300" />
          </div>
          <div className="grid flex-1 text-left text-sm leading-tight">
            <span className="truncate font-bold tracking-tight text-foreground/90 group-hover/brand:text-primary transition-colors duration-200">
              Asset Portal
            </span>
            <span className="truncate text-[10px] text-muted-foreground font-medium uppercase tracking-wider">ABPL / IBA</span>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent className="px-2 py-3">
        <SidebarGroup>
          <SidebarGroupLabel className="px-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 mb-2">Main Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {navItems.map((item) => {
                const isActive = item.url === "/dashboard" 
                  ? pathname === item.url 
                  : pathname?.startsWith(item.url);

                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      render={<Link href={item.url} />}
                      tooltip={item.title}
                      isActive={isActive}
                      className={cn(
                        "transition-all duration-200 pl-3 hover:translate-x-0.5",
                        isActive 
                          ? "bg-primary/10 text-primary hover:bg-primary/15 font-semibold shadow-2xs border-l-2 border-primary rounded-l-none" 
                          : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                      )}
                    >
                      <item.icon className={cn("size-4 transition-transform duration-200", isActive ? "text-primary scale-110" : "text-muted-foreground/80 group-hover:text-foreground")} />
                      <span className="text-[13px]">{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-3 border-t border-border/40">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <SidebarMenuButton className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-muted/60 transition-colors">
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <div className="flex aspect-square size-7.5 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xs uppercase shadow-2xs">
                        {userName.charAt(0)}
                      </div>
                      <div className="grid flex-1 text-left text-xs leading-tight">
                        <span className="truncate font-semibold text-foreground">{userName}</span>
                        <span className="truncate text-[10px] text-muted-foreground capitalize font-medium">{role?.toLowerCase() || "user"}</span>
                      </div>
                    </div>
                    <ChevronUp className="ml-auto size-4 text-muted-foreground/80" />
                  </SidebarMenuButton>
                }
              />
              <DropdownMenuContent
                side="top"
                align="end"
                className="w-56 p-1 bg-background/95 backdrop-blur-md border border-border/40 shadow-lg rounded-xl animate-in slide-in-from-bottom-2 duration-200"
              >
                <DropdownMenuItem render={<Link href="/profile" />} className="flex items-center gap-2 px-3 py-2 text-xs rounded-lg cursor-pointer hover:bg-muted/60">
                  <User2 className="size-4 text-muted-foreground" />
                  <span>Profile Settings</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="flex items-center gap-2 px-3 py-2 text-xs rounded-lg cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10"
                  onClick={handleSignOut}
                >
                  <LogOut className="size-4 text-destructive/80" />
                  <span>Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
