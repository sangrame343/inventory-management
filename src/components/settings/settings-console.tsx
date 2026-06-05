"use client";

import { useState } from "react";
import {
  Settings,
  Building2,
  Package,
  ShoppingCart,
  Boxes,
  Ruler,
  LayoutGrid,
  MapPin,
  ChevronRight,
} from "lucide-react";
import { GeneralSettingsForm } from "@/components/settings/general-settings-form";
import { MasterDataList } from "@/components/settings/master-data-list";
import { cn } from "@/lib/utils";

interface NavItem {
  id: string;
  label: string;
  subtitle: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  section: "config" | "master";
}

const navItems: NavItem[] = [
  {
    id: "general",
    label: "Preferences",
    subtitle: "Company info & defaults",
    icon: LayoutGrid,
    section: "config",
  },
  {
    id: "departments",
    label: "Departments",
    subtitle: "Organizational units",
    icon: Building2,
    section: "master",
  },
  {
    id: "asset-categories",
    label: "Asset Categories",
    subtitle: "Asset classification",
    icon: Package,
    section: "master",
  },
  {
    id: "vendors",
    label: "Vendors",
    subtitle: "Supplier directory",
    icon: ShoppingCart,
    section: "master",
  },
  {
    id: "inventory-categories",
    label: "Stock Categories",
    subtitle: "Inventory classification",
    icon: Boxes,
    section: "master",
  },
  {
    id: "units-of-measure",
    label: "Units of Measure",
    subtitle: "Measurement standards",
    icon: Ruler,
    section: "master",
  },
  {
    id: "inventory-locations",
    label: "Inventory Locations",
    subtitle: "Storage & warehouse sites",
    icon: MapPin,
    section: "master",
  },
];

interface SettingsConsoleProps {
  settings: any;
}

export function SettingsConsole({ settings }: SettingsConsoleProps) {
  const [activeTab, setActiveTab] = useState("general");

  const configItems = navItems.filter((i) => i.section === "config");
  const masterItems = navItems.filter((i) => i.section === "master");
  const activeItem = navItems.find((i) => i.id === activeTab);

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex items-center gap-5">
        <div className="relative p-4 rounded-2xl bg-gradient-to-br from-foreground/5 to-foreground/[0.02] border border-border/60 backdrop-blur-sm">
          <Settings className="size-9 text-foreground/70" />
          <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-background animate-pulse" />
        </div>
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
            System Console
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Configuration & master data management
          </p>
        </div>
      </div>

      {/* Main layout */}
      <div className="flex flex-col lg:flex-row gap-6 min-h-[600px]">
        {/* Sidebar Navigation */}
        <nav className="lg:w-[280px] shrink-0">
          <div className="lg:sticky lg:top-6 space-y-6">
            {/* Config section */}
            <div>
              <div className="px-3 mb-2">
                <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                  Configuration
                </span>
              </div>
              <div className="space-y-1">
                {configItems.map((item) => (
                  <NavButton
                    key={item.id}
                    item={item}
                    isActive={activeTab === item.id}
                    onClick={() => setActiveTab(item.id)}
                  />
                ))}
              </div>
            </div>

            {/* Divider */}
            <div className="px-3">
              <div className="h-px bg-border/50" />
            </div>

            {/* Master Data section */}
            <div>
              <div className="px-3 mb-2">
                <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                  Master Data
                </span>
              </div>
              <div className="space-y-1">
                {masterItems.map((item) => (
                  <NavButton
                    key={item.id}
                    item={item}
                    isActive={activeTab === item.id}
                    onClick={() => setActiveTab(item.id)}
                  />
                ))}
              </div>
            </div>
          </div>
        </nav>

        {/* Content Area */}
        <div className="flex-1 min-w-0">
          {/* Content header breadcrumb */}
          <div className="flex items-center gap-2 mb-6 pb-4 border-b border-border/40">
            {activeItem && (
              <>
                <activeItem.icon size={18} className="text-muted-foreground" />
                <span className="text-sm font-semibold text-foreground">
                  {activeItem.label}
                </span>
                <span className="text-xs text-muted-foreground">
                  — {activeItem.subtitle}
                </span>
              </>
            )}
          </div>

          {/* Content panels */}
          <div className="animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
            {activeTab === "general" && (
              <GeneralSettingsForm settings={settings} />
            )}
            {activeTab === "departments" && (
              <MasterDataList
                domain="departments"
                label="Department"
                icon={<Building2 size={20} />}
              />
            )}
            {activeTab === "asset-categories" && (
              <MasterDataList
                domain="asset-categories"
                label="Asset Category"
                icon={<Package size={20} />}
              />
            )}
            {activeTab === "vendors" && (
              <MasterDataList
                domain="vendors"
                label="Vendor"
                icon={<ShoppingCart size={20} />}
              />
            )}
            {activeTab === "inventory-categories" && (
              <MasterDataList
                domain="inventory-categories"
                label="Inventory Category"
                icon={<Boxes size={20} />}
              />
            )}
            {activeTab === "units-of-measure" && (
              <MasterDataList
                domain="units-of-measure"
                label="Unit of Measure"
                icon={<Ruler size={20} />}
              />
            )}
            {activeTab === "inventory-locations" && (
              <MasterDataList
                domain="inventory-locations"
                label="Inventory Location"
                icon={<MapPin size={20} />}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function NavButton({
  item,
  isActive,
  onClick,
}: {
  item: NavItem;
  isActive: boolean;
  onClick: () => void;
}) {
  const Icon = item.icon;

  return (
    <button
      onClick={onClick}
      className={cn(
        "group relative w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-200 outline-none",
        isActive
          ? "bg-foreground/[0.06] text-foreground"
          : "text-muted-foreground hover:bg-foreground/[0.03] hover:text-foreground"
      )}
    >
      {/* Active indicator bar */}
      <div
        className={cn(
          "absolute left-0 top-1/2 -translate-y-1/2 w-[3px] rounded-full transition-all duration-300",
          isActive
            ? "h-6 bg-foreground opacity-100"
            : "h-0 bg-foreground opacity-0 group-hover:h-3 group-hover:opacity-30"
        )}
      />

      {/* Icon */}
      <div
        className={cn(
          "flex items-center justify-center w-9 h-9 rounded-lg transition-all duration-200 shrink-0",
          isActive
            ? "bg-foreground/[0.08]"
            : "bg-transparent group-hover:bg-foreground/[0.04]"
        )}
      >
        <Icon
          size={18}
          className={cn(
            "transition-colors duration-200",
            isActive ? "text-foreground" : "text-muted-foreground/70 group-hover:text-foreground/60"
          )}
        />
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <div
          className={cn(
            "text-sm font-medium truncate transition-colors duration-200",
            isActive ? "text-foreground" : ""
          )}
        >
          {item.label}
        </div>
        <div className="text-[11px] text-muted-foreground/60 truncate">
          {item.subtitle}
        </div>
      </div>

      {/* Chevron */}
      <ChevronRight
        size={14}
        className={cn(
          "shrink-0 transition-all duration-200",
          isActive
            ? "opacity-60 text-foreground"
            : "opacity-0 group-hover:opacity-40 -translate-x-1 group-hover:translate-x-0"
        )}
      />
    </button>
  );
}
