"use client";

import React from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";

export function DynamicHeader() {
  const pathname = usePathname();

  // Split and filter paths
  const paths = pathname ? pathname.split("/").filter(Boolean) : [];

  // Custom mapping for prettier names
  const routeMap: Record<string, string> = {
    dashboard: "Dashboard",
    assets: "Assets",
    inventory: "Inventory",
    maintenance: "Maintenance",
    employees: "Employees",
    transfers: "Transfers",
    locations: "Locations",
    settings: "Settings",
    approvals: "Approvals",
    profile: "Profile",
    "my-requests": "My Requests",
    "super-admin": "Super Admin",
    registrations: "Registrations",
    users: "Users",
    backup: "Database Backup",
  };

  const getDisplayName = (segment: string) => {
    // If it's a known route name, use mapped label
    if (routeMap[segment]) return routeMap[segment];

    // If it looks like a database UUID or Mongo ID or integer ID
    if (/^[0-9a-fA-F-]{24,}$/.test(segment) || /^\d+$/.test(segment) || segment.length > 20) {
      return "Details";
    }

    // Capitalize and replace hyphens with spaces
    return segment
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  return (
    <div className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground select-none">
      <Link
        href="/dashboard"
        className="flex items-center gap-1 hover:text-foreground transition-colors duration-200"
      >
        <Home className="h-4 w-4" />
      </Link>

      {paths.length > 0 && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60" />}

      {paths.map((segment, index) => {
        const isLast = index === paths.length - 1;
        const url = `/${paths.slice(0, index + 1).join("/")}`;
        const displayName = getDisplayName(segment);

        if (isLast) {
          return (
            <span
              key={url}
              className="text-foreground font-semibold truncate max-w-[150px] sm:max-w-xs transition-colors duration-200"
            >
              {displayName}
            </span>
          );
        }

        return (
          <React.Fragment key={url}>
            <Link
              href={url}
              className="hover:text-foreground transition-colors duration-200 truncate max-w-[120px] sm:max-w-none"
            >
              {displayName}
            </Link>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60" />
          </React.Fragment>
        );
      })}
    </div>
  );
}
