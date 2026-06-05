import { Metadata } from "next";
import { getInventoryItems } from "@/app/actions/inventory-item-actions";
import {
  getInventoryCategories,
  getInventoryLocations,
  getInventoryUnits,
} from "@/app/actions/inventory-master-actions";
import { InventoryDashboard } from "@/components/inventory/inventory-dashboard";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { EmployeeService } from "@/services/employee-service";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Inventory | Dashboard",
  description: "Manage your multi-company inventory.",
};

export default async function InventoryPage() {
  const session = await auth();
  if (!session?.user?.activeCompanyId) redirect("/login");
  const companyId = session.user.activeCompanyId;

  const [items, categories, locations, units, employees, assetCategories, departments, vendors] = await Promise.all([
    getInventoryItems(),
    getInventoryCategories(),
    getInventoryLocations(),
    getInventoryUnits(),
    EmployeeService.getEmployees(companyId),
    db.assetCategory.findMany({ where: { companyId }, orderBy: { name: "asc" } }),
    db.department.findMany({ where: { companyId }, orderBy: { name: "asc" } }),
    db.vendor.findMany({ where: { companyId }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      <div className="flex flex-col space-y-1.5 pb-4 border-b border-muted/30">
        <h2 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-primary via-indigo-600 to-violet-500 bg-clip-text text-transparent">
          Inventory Control
        </h2>
        <p className="text-sm text-muted-foreground font-medium">
          Track quantity-based stock levels, assign inventory units to departments or employees, and auto-provision assets.
        </p>
      </div>
      
      <InventoryDashboard
        initialItems={items}
        categories={assetCategories.map(c => ({ id: c.id, name: c.name }))}
        locations={locations}
        units={units}
        employees={employees.map(e => ({ 
          id: e.id, 
          name: e.fullName, 
          employeeId: e.employeeCode, 
          userId: e.userId 
        }))}
        assetCategories={assetCategories.map(c => ({ id: c.id, name: c.name }))}
        departments={departments.map(d => ({ id: d.id, name: d.name }))}
        vendors={vendors.map(v => ({ id: v.id, name: v.name }))}
        currentUserId={session.user.id}
      />
    </div>
  );
}
