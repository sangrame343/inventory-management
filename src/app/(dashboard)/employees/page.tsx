import { auth } from "@/lib/auth";
import { EmployeeService } from "@/services/employee-service";
import { EmployeeList } from "@/components/employees/employee-list";
import { EmployeeForm } from "@/components/employees/employee-form";
import { EmployeeImportButton } from "@/components/employees/employee-import-button";
import { EmployeeExportButton } from "@/components/employees/employee-export-button";
import { SettingsService } from "@/services/settings-service";
import { LocationService } from "@/services/location-service";
import Link from "next/link";

export default async function EmployeesPage(props: {
  searchParams: Promise<{
    page?: string;
    limit?: string;
    query?: string;
    status?: string;
    departmentId?: string;
    locationId?: string;
    sortBy?: string;
    order?: string;
    tab?: string;
  }>;
}) {
  const searchParams = await props.searchParams;
  const session = await auth();
  if (!session?.user?.activeCompanyId) return null;

  const companyId = session.user.activeCompanyId;
  const page = Number(searchParams.page) || 1;
  const limit = Number(searchParams.limit) || 10;
  const query = searchParams.query || "";
  const departmentId = searchParams.departmentId || "";
  const locationId = searchParams.locationId || "";
  const sortBy = searchParams.sortBy || "fullName";
  const order = (searchParams.order as "asc" | "desc") || "asc";

  // Tab logic: "active" (default), "other", "all"
  const tab = searchParams.tab || "active";
  let status = "";
  if (tab === "active") {
    status = "ACTIVE";
  } else if (tab === "other") {
    status = "OTHER";
  }
  // tab === "all" → status stays empty, no filter

  const [employeesData, statusCounts, departments, locations] = await Promise.all([
    EmployeeService.getEmployeesPaginated(companyId, {
      page,
      limit,
      query,
      status,
      departmentId,
      locationId,
      sortBy,
      order,
    }),
    EmployeeService.getEmployeeStatusCounts(companyId),
    SettingsService.getDepartments(companyId),
    LocationService.getLocations(companyId),
  ]);

  // Compute quick stats
  const totalEmployeesCount = Object.values(statusCounts).reduce((a, b) => a + b, 0);
  const activeCount = statusCounts["ACTIVE"] || 0;
  const otherCount = totalEmployeesCount - activeCount;

  // Build tab hrefs preserving existing params (except page resets to 1)
  function buildTabHref(tabVal: string) {
    const params = new URLSearchParams();
    if (query) params.set("query", query);
    if (departmentId) params.set("departmentId", departmentId);
    if (locationId) params.set("locationId", locationId);
    if (sortBy !== "fullName") params.set("sortBy", sortBy);
    if (order !== "asc") params.set("order", order);
    if (limit !== 10) params.set("limit", String(limit));
    params.set("tab", tabVal);
    params.set("page", "1");
    return `/employees?${params.toString()}`;
  }

  const tabs = [
    { key: "active", label: "Active", count: activeCount, color: "emerald" },
    { key: "other", label: "Other", count: otherCount, color: "zinc" },
    { key: "all", label: "All", count: totalEmployeesCount, color: "blue" },
  ] as const;

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* ── Page header ── */}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5">
            <div className="h-6 w-1 rounded-full bg-gradient-to-b from-primary to-primary/30" />
            <h2 className="text-xl md:text-2xl font-bold tracking-tight text-foreground/90">
              Employees Registry
            </h2>
          </div>
          <p className="text-xs md:text-sm text-muted-foreground pl-[18px]">
            Manage staff credentials, department allocations, and office assignments.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 md:shrink-0">
          <EmployeeImportButton />
          <EmployeeExportButton />
          <EmployeeForm departments={departments} locations={locations} />
        </div>
      </div>

      {/* ── Tab bar (Active / Other / All) ── */}
      <div className="flex items-center gap-1 rounded-xl bg-muted/40 p-1 border border-border/40 shadow-inner w-fit">
        {tabs.map((t) => {
          const isActive = tab === t.key;
          return (
            <Link
              key={t.key}
              href={buildTabHref(t.key)}
              className={`
                relative inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold whitespace-nowrap
                transition-all duration-200 ease-out select-none
                ${isActive
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-background/40"
                }
              `}
            >
              {t.key === "active" && (
                <span className={`h-2 w-2 rounded-full ${isActive ? "bg-emerald-500 animate-pulse" : "bg-emerald-500/50"}`} />
              )}
              {t.key === "other" && (
                <span className={`h-2 w-2 rounded-full ${isActive ? "bg-zinc-400" : "bg-zinc-400/50"}`} />
              )}
              {t.key === "all" && (
                <span className={`h-2 w-2 rounded-full ${isActive ? "bg-blue-500" : "bg-blue-500/50"}`} />
              )}
              {t.label}
              <span className={`
                inline-flex items-center justify-center rounded-full px-1.5 min-w-[22px] h-[20px] text-[10px] font-bold tabular-nums leading-none
                ${isActive
                  ? t.key === "active"
                    ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                    : t.key === "other"
                      ? "bg-zinc-500/15 text-zinc-600 dark:text-zinc-400"
                      : "bg-blue-500/15 text-blue-600 dark:text-blue-400"
                  : "bg-muted text-muted-foreground/60"
                }
              `}>
                {t.count}
              </span>
            </Link>
          );
        })}
      </div>

      <div className="h-px bg-gradient-to-r from-border via-border/50 to-transparent" />

      <EmployeeList
        employees={employeesData.data}
        totalCount={employeesData.total}
        departments={departments}
        locations={locations}
        activeTab={tab}
        statusCounts={statusCounts}
      />
    </div>
  );
}
