import { auth } from "@/lib/auth";
import { EmployeeService } from "@/services/employee-service";
import { EmployeeList } from "@/components/employees/employee-list";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmployeeForm } from "@/components/employees/employee-form";
import { EmployeeImportButton } from "@/components/employees/employee-import-button";
import { SettingsService } from "@/services/settings-service";
import { LocationService } from "@/services/location-service";

export default async function EmployeesPage() {
  const session = await auth();
  if (!session?.user?.activeCompanyId) return null;

  const companyId = session.user.activeCompanyId;
  const [employees, departments, locations] = await Promise.all([
    EmployeeService.getEmployees(companyId),
    SettingsService.getDepartments(companyId),
    LocationService.getLocations(companyId),
  ]);

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Employees</h2>
        <div className="flex items-center space-x-2">
          <EmployeeImportButton />
          <EmployeeForm departments={departments} locations={locations} />
        </div>
      </div>
      
      <EmployeeList 
        employees={employees} 
        departments={departments} 
        locations={locations} 
      />
    </div>
  );
}
