import { auth } from "@/lib/auth";
import { EmployeeService } from "@/services/employee-service";
import { EmployeeList } from "@/components/employees/employee-list";
import { EmployeeForm } from "@/components/employees/employee-form";
import { EmployeeImportButton } from "@/components/employees/employee-import-button";
import { EmployeeExportButton } from "@/components/employees/employee-export-button";
import { SettingsService } from "@/services/settings-service";
import { LocationService } from "@/services/location-service";

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
  }>;
}) {
  const searchParams = await props.searchParams;
  const session = await auth();
  if (!session?.user?.activeCompanyId) return null;

  const companyId = session.user.activeCompanyId;
  const page = Number(searchParams.page) || 1;
  const limit = Number(searchParams.limit) || 10;
  const query = searchParams.query || "";
  const status = searchParams.status || "";
  const departmentId = searchParams.departmentId || "";
  const locationId = searchParams.locationId || "";
  const sortBy = searchParams.sortBy || "fullName";
  const order = (searchParams.order as "asc" | "desc") || "asc";

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
  const onLeaveCount = statusCounts["ON_LEAVE"] || 0;
  const inactiveCount = totalEmployeesCount - activeCount - onLeaveCount;

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

      {/* ── Summary stat pills ── */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex items-center gap-2 rounded-lg border border-border/50 bg-card px-3 py-2 shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/60">Total</span>
          <span className="text-sm font-bold text-foreground tabular-nums">{totalEmployeesCount}</span>
        </div>
        <div className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 shadow-2xs">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Active</span>
          <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">{activeCount}</span>
        </div>
        {onLeaveCount > 0 && (
          <div className="inline-flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 shadow-2xs">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">On Leave</span>
            <span className="text-sm font-bold text-amber-600 dark:text-amber-400 tabular-nums">{onLeaveCount}</span>
          </div>
        )}
        {inactiveCount > 0 && (
          <div className="inline-flex items-center gap-2 rounded-lg border border-zinc-400/20 bg-zinc-500/5 px-3 py-2 shadow-2xs">
            <span className="h-1.5 w-1.5 rounded-full bg-zinc-400" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">Other</span>
            <span className="text-sm font-bold text-zinc-500 tabular-nums">{inactiveCount}</span>
          </div>
        )}
      </div>

      <div className="h-px bg-gradient-to-r from-border via-border/50 to-transparent" />

      <EmployeeList
        employees={employeesData.data}
        totalCount={employeesData.total}
        departments={departments}
        locations={locations}
      />
    </div>
  );
}
