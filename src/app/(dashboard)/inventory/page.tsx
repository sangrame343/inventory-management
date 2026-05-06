import { Metadata } from "next";
import { getInventoryItems } from "@/app/actions/inventory-item-actions";
import {
  getInventoryCategories,
  getInventoryLocations,
  getInventoryUnits,
} from "@/app/actions/inventory-master-actions";
import { InventoryDashboard } from "@/components/inventory/inventory-dashboard";

export const metadata: Metadata = {
  title: "Inventory | Dashboard",
  description: "Manage your multi-company inventory.",
};

export default async function InventoryPage() {
  const [items, categories, locations, units] = await Promise.all([
    getInventoryItems(),
    getInventoryCategories(),
    getInventoryLocations(),
    getInventoryUnits(),
  ]);

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Inventory</h2>
      </div>
      
      <InventoryDashboard
        initialItems={items}
        categories={categories}
        locations={locations}
        units={units}
      />
    </div>
  );
}
