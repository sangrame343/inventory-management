"use client";

import { useState } from "react";
import {
  ShieldCheck,
  Users,
  UserPlus,
  Database,
  ArrowRight,
  ShieldAlert,
  Clock,
  CheckCircle2,
  Activity,
  Settings2,
  Lock,
  FileText,
  LayoutDashboard,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ApprovalList } from "@/components/approvals/approval-list";
import { RegistrationsClient } from "../super-admin/registrations/registrations-client";
import { UsersClient } from "../super-admin/users/users-client";
import { BackupClient } from "../super-admin/backup/backup-client";

interface AdminPanelClientProps {
  role: string;
  isSuperAdmin: boolean;
  currentUserId: string;
  pendingApprovals: number;
  pendingRegistrations: number;
  totalUsers: number;
  activeUsers: number;
  requests: any[];
  registrations: any[];
  registrationCompanies: any[];
  activeUsersList: any[];
  userCompanies: any[];
}

const cardStyles = {
  approvals: {
    gradient: "from-violet-500/15 to-indigo-500/10",
    iconBg: "bg-violet-500/15 border-violet-500/25",
    iconColor: "text-violet-500",
    badgeBg: "bg-violet-500/15 text-violet-600 dark:text-violet-400 border-violet-500/20",
    hoverBorder: "hover:border-violet-500/30",
    glowColor: "group-hover:shadow-violet-500/5",
  },
  registrations: {
    gradient: "from-amber-500/15 to-orange-500/10",
    iconBg: "bg-amber-500/15 border-amber-500/25",
    iconColor: "text-amber-500",
    badgeBg: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20",
    hoverBorder: "hover:border-amber-500/30",
    glowColor: "group-hover:shadow-amber-500/5",
  },
  users: {
    gradient: "from-blue-500/15 to-cyan-500/10",
    iconBg: "bg-blue-500/15 border-blue-500/25",
    iconColor: "text-blue-500",
    badgeBg: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/20",
    hoverBorder: "hover:border-blue-500/30",
    glowColor: "group-hover:shadow-blue-500/5",
  },
  backup: {
    gradient: "from-emerald-500/15 to-teal-500/10",
    iconBg: "bg-emerald-500/15 border-emerald-500/25",
    iconColor: "text-emerald-500",
    badgeBg: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    hoverBorder: "hover:border-emerald-500/30",
    glowColor: "group-hover:shadow-emerald-500/5",
  },
  myRequests: {
    gradient: "from-rose-500/15 to-pink-500/10",
    iconBg: "bg-rose-500/15 border-rose-500/25",
    iconColor: "text-rose-500",
    badgeBg: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/20",
    hoverBorder: "hover:border-rose-500/30",
    glowColor: "group-hover:shadow-rose-500/5",
  },
};

export function AdminPanelClient({
  role,
  isSuperAdmin,
  currentUserId,
  pendingApprovals,
  pendingRegistrations,
  totalUsers,
  activeUsers,
  requests,
  registrations,
  registrationCompanies,
  activeUsersList,
  userCompanies,
}: AdminPanelClientProps) {
  const [activeTab, setActiveTab] = useState<string>("overview");

  // Determine authorized tabs
  const tabs = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
  ];

  if (role === "SUPER_ADMIN") {
    tabs.push({ id: "approvals", label: "Approval Workflow", icon: ShieldCheck });
  }

  if (role === "ADMIN") {
    tabs.push({ id: "myRequests", label: "My Requests", icon: FileText });
  }

  if (isSuperAdmin) {
    tabs.push(
      { id: "registrations", label: "User Registrations", icon: UserPlus },
      { id: "users", label: "User Management", icon: Users },
      { id: "backup", label: "Database Backup", icon: Database }
    );
  }

  const adminCards: {
    key: string;
    title: string;
    description: string;
    tabId: string;
    icon: any;
    style: (typeof cardStyles)["approvals"];
    badge?: string;
    badgeCount?: number;
    stats?: { label: string; value: string | number; icon?: any }[];
  }[] = [];

  if (role === "SUPER_ADMIN") {
    adminCards.push({
      key: "approvals",
      title: "Approval Workflow",
      description: "Review and approve pending requests from admins — asset changes, transfers, and more.",
      tabId: "approvals",
      icon: ShieldCheck,
      style: cardStyles.approvals,
      badge: pendingApprovals > 0 ? "Action Needed" : undefined,
      badgeCount: pendingApprovals,
      stats: [{ label: "Pending", value: pendingApprovals, icon: Clock }],
    });
  }

  if (role === "ADMIN") {
    adminCards.push({
      key: "myRequests",
      title: "My Requests",
      description: "View the status of your submitted approval requests and track their progress.",
      tabId: "myRequests",
      icon: FileText,
      style: cardStyles.myRequests,
    });
  }

  if (isSuperAdmin) {
    adminCards.push({
      key: "registrations",
      title: "User Registrations",
      description: "Review and approve new user sign-ups. Assign companies and roles to pending registrations.",
      tabId: "registrations",
      icon: UserPlus,
      style: cardStyles.registrations,
      badge: pendingRegistrations > 0 ? "Pending" : undefined,
      badgeCount: pendingRegistrations,
      stats: [{ label: "Pending", value: pendingRegistrations, icon: Clock }],
    });

    adminCards.push({
      key: "users",
      title: "User Management",
      description: "Manage all active users across companies. Edit roles, reassign companies, or remove access.",
      tabId: "users",
      icon: Users,
      style: cardStyles.users,
      stats: [
        { label: "Total", value: totalUsers, icon: Users },
        { label: "Active", value: activeUsers, icon: CheckCircle2 },
      ],
    });

    adminCards.push({
      key: "backup",
      title: "Database Backup",
      description: "Generate and download full SQL backups of your databases. Includes all table data as INSERT statements.",
      tabId: "backup",
      icon: Database,
      style: cardStyles.backup,
    });
  }

  const totalPending = pendingApprovals + pendingRegistrations;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-400">
      {/* ── Page Header ── */}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-10 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 shadow-sm">
              <Settings2 className="size-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground/90">
                Admin Panel
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                System administration, user management, and operational controls.
              </p>
            </div>
          </div>
        </div>

        {/* Role badge */}
        <div className="flex items-center gap-2">
          {isSuperAdmin && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 shadow-sm">
              <ShieldAlert className="size-4 text-amber-500" />
              <span className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                Super Admin
              </span>
            </div>
          )}
          {totalPending > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-rose-500/10 border border-rose-500/20 shadow-sm animate-pulse">
              <Activity className="size-4 text-rose-500" />
              <span className="text-xs font-bold text-rose-600 dark:text-rose-400 tabular-nums">
                {totalPending} pending
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Tabs Navigation ── */}
      <div className="flex items-center overflow-x-auto border-b border-border/40 pb-px scrollbar-none gap-2">
        {tabs.map((tab) => {
          const TabIcon = tab.icon;
          const isActive = activeTab === tab.id;

          // Badges for tabs
          let count = 0;
          if (tab.id === "approvals") count = pendingApprovals;
          if (tab.id === "registrations") count = pendingRegistrations;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-t-xl transition-all duration-200 shrink-0 border-b-2 -mb-px",
                isActive
                  ? "border-primary text-primary bg-primary/5"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30"
              )}
            >
              <TabIcon className="size-4 shrink-0" />
              <span>{tab.label}</span>
              {count > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-rose-500 text-white leading-none">
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Tabs Content ── */}
      <div className="mt-4 transition-all duration-300">
        {activeTab === "overview" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {adminCards.map((card) => {
                const Icon = card.icon;
                const s = card.style;

                return (
                  <button
                    key={card.key}
                    onClick={() => setActiveTab(card.tabId)}
                    className={cn(
                      "text-left group relative flex flex-col gap-4 rounded-2xl border border-border/50 bg-card p-5 w-full",
                      "transition-all duration-300 ease-out",
                      "hover:shadow-lg hover:-translate-y-0.5",
                      s.hoverBorder,
                      s.glowColor
                    )}
                  >
                    {/* Gradient overlay */}
                    <div
                      className={cn(
                        "absolute inset-0 rounded-2xl bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none",
                        s.gradient
                      )}
                    />

                    <div className="relative z-10 w-full">
                      {/* Top row: Icon + Badge */}
                      <div className="flex items-start justify-between mb-3 w-full">
                        <div
                          className={cn(
                            "flex items-center justify-center size-11 rounded-xl border shadow-sm transition-transform duration-300 group-hover:scale-110 group-hover:shadow-md",
                            s.iconBg
                          )}
                        >
                          <Icon className={cn("size-5", s.iconColor)} />
                        </div>

                        <div className="flex items-center gap-2">
                          {card.badge && card.badgeCount && card.badgeCount > 0 && (
                            <span
                              className={cn(
                                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider border shadow-sm",
                                s.badgeBg
                              )}
                            >
                              <span
                                className={cn(
                                  "h-1.5 w-1.5 rounded-full animate-pulse",
                                  s.iconColor.replace("text-", "bg-")
                                )}
                              />
                              {card.badge}
                            </span>
                          )}
                          <ArrowRight className="size-4 text-muted-foreground/40 transition-all duration-300 group-hover:text-foreground group-hover:translate-x-1" />
                        </div>
                      </div>

                      {/* Title & Description */}
                      <h3 className="text-base font-bold text-foreground/90 mb-1 group-hover:text-foreground transition-colors">
                        {card.title}
                      </h3>
                      <p className="text-xs text-muted-foreground/80 leading-relaxed mb-3">
                        {card.description}
                      </p>

                      {/* Stats row */}
                      {card.stats && card.stats.length > 0 && (
                        <div className="flex items-center gap-3 pt-3 border-t border-border/40">
                          {card.stats.map((stat, i) => {
                            const StatIcon = stat.icon;
                            return (
                              <div key={i} className="flex items-center gap-1.5">
                                {StatIcon && (
                                  <StatIcon className="size-3.5 text-muted-foreground/60" />
                                )}
                                <span className="text-lg font-bold text-foreground tabular-nums">
                                  {stat.value}
                                </span>
                                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                                  {stat.label}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Quick Info Banner */}
            <div className="rounded-xl border border-border/40 bg-muted/20 px-5 py-4 flex items-center gap-3">
              <Lock className="size-4 text-muted-foreground/50 shrink-0" />
              <p className="text-xs text-muted-foreground/70 leading-relaxed">
                <span className="font-semibold text-muted-foreground">Access Control:</span>{" "}
                Admin panel features are role-gated. Super Admin sections (Registrations, Users, DB Backup) are only visible to super admins.
                Approval workflows are available to Super Admins, while standard admins can track their own submitted requests.
              </p>
            </div>
          </div>
        )}

        {activeTab === "approvals" && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="flex flex-col gap-1">
              <h2 className="text-xl font-bold text-foreground">Approval Workflow</h2>
              <p className="text-xs text-muted-foreground">
                Review and approve pending requests from admins.
              </p>
            </div>
            <ApprovalList
              initialRequests={requests}
              currentUserId={currentUserId}
              isSuperAdmin={true}
            />
          </div>
        )}

        {activeTab === "myRequests" && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="flex flex-col gap-1">
              <h2 className="text-xl font-bold text-foreground">My Requests</h2>
              <p className="text-xs text-muted-foreground">
                View the status of your submitted approval requests.
              </p>
            </div>
            <ApprovalList
              initialRequests={requests}
              currentUserId={currentUserId}
              isSuperAdmin={false}
            />
          </div>
        )}

        {activeTab === "registrations" && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="flex flex-col gap-1">
              <h2 className="text-xl font-bold text-foreground">Registration Approvals</h2>
              <p className="text-xs text-muted-foreground">
                Review pending user registrations.
              </p>
            </div>
            <RegistrationsClient
              registrations={registrations}
              companies={registrationCompanies}
            />
          </div>
        )}

        {activeTab === "users" && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="flex flex-col gap-1">
              <h2 className="text-xl font-bold text-foreground">Active Users</h2>
              <p className="text-xs text-muted-foreground">
                Review and manage active users across all companies.
              </p>
            </div>
            <UsersClient
              users={activeUsersList}
              companies={userCompanies}
            />
          </div>
        )}

        {activeTab === "backup" && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="flex flex-col gap-1">
              <h2 className="text-xl font-bold text-foreground">Database Backup</h2>
              <p className="text-xs text-muted-foreground">
                Generate and download SQL backups of the databases.
              </p>
            </div>
            <BackupClient />
          </div>
        )}
      </div>
    </div>
  );
}
