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
  Moon,
  Sun,
  ShieldCheck,
} from "lucide-react";
import { useSession, signOut } from "next-auth/react";
import { useTheme } from "next-themes";
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

const mainNav = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Assets", url: "/assets", icon: Package },
  { title: "Inventory", url: "/inventory", icon: Boxes },
  { title: "Maintenance", url: "/maintenance", icon: Wrench },
  { title: "Employees", url: "/employees", icon: Users },
  { title: "Transfers", url: "/transfers", icon: Activity },
  { title: "Locations", url: "/locations", icon: Building },
  { title: "Settings", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const { data: session } = useSession();
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

  // Add role-specific items
  if (role === "SUPER_ADMIN") {
    navItems.push({
      title: "Approvals",
      url: "/approvals",
      icon: ShieldCheck,
    });
  }

  if (role === "ADMIN") {
    navItems.push({
      title: "My Requests",
      url: "/my-requests",
      icon: Activity,
    });
  }

  if (isSuperAdmin) {
    navItems.push({
      title: "Registrations",
      url: "/super-admin/registrations",
      icon: ShieldCheck,
    });
    navItems.push({
      title: "Users (Admin)",
      url: "/super-admin/users",
      icon: Users,
    });
  }


  return (
    <Sidebar variant="inset">
      <SidebarHeader className="h-16 flex items-center justify-center border-b border-border/50">
        <div className="flex items-center gap-2 px-4 w-full">
          <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Package className="size-4" />
          </div>
          <div className="grid flex-1 text-left text-sm leading-tight">
            <span className="truncate font-semibold text-primary">
              Asset Management Portal{" "}
            </span>
            <span className="truncate text-xs">ABPL/IBA</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Main Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    render={<Link href={item.url} />}
                    tooltip={item.title}
                  >
                    <item.icon />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <SidebarMenuButton>
                    <User2 /> {userName}
                    <ChevronUp className="ml-auto" />
                  </SidebarMenuButton>
                }
              />
              <DropdownMenuContent
                side="top"
                className="w-[--radix-popper-anchor-width]"
              >
                <DropdownMenuItem>
                  <span className="text-secondary-foreground">Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10"
                  onClick={handleSignOut}
                >
                  <LogOut className="mr-2 h-4 w-4" />
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
