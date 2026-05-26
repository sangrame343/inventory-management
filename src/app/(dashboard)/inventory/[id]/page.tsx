import { notFound } from "next/navigation";
import { getInventoryItemById } from "@/app/actions/inventory-item-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { db } from "@/lib/db";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { InventoryItemActions } from "@/components/inventory/inventory-item-actions";
import { auth } from "@/lib/auth";
import { EmployeeService } from "@/services/employee-service";
import { redirect } from "next/navigation";

export default async function InventoryItemPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const session = await auth();
  if (!session?.user?.activeCompanyId) redirect("/login");
  const companyId = session.user.activeCompanyId;

  const [item, locations, employees, assetCategories, departments] = await Promise.all([
    getInventoryItemById(id),
    db.inventoryLocation.findMany({ where: { companyId }, orderBy: { name: "asc" } }),
    EmployeeService.getEmployees(companyId),
    db.assetCategory.findMany({ where: { companyId }, orderBy: { name: "asc" } }),
    db.department.findMany({ where: { companyId }, orderBy: { name: "asc" } }),
  ]);

  if (!item) {
    notFound();
  }

  // Get recent transactions for this item
  const transactions = await db.inventoryTransaction.findMany({
    where: { itemId: id },
    orderBy: { createdAt: "desc" },
    include: { location: true, employee: true, asset: true, createdBy: true },
    take: 10,
  });

  const totalQty = item.balances.reduce((acc, b) => acc + b.quantityOnHand, 0);

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">[{item.sku}] {item.name}</h2>
        <Badge variant={item.status === "ACTIVE" ? "default" : "secondary"}>
          {item.status}
        </Badge>
      </div>

      <InventoryItemActions 
        item={item}
        locations={locations}
        employees={employees.map(e => ({ id: e.id, name: e.fullName }))}
        categories={assetCategories.map(c => ({ id: c.id, name: c.name }))}
        departments={departments.map(d => ({ id: d.id, name: d.name }))}
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Master Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Category:</span>
              <span>{item.category?.name || "N/A"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Type:</span>
              <span>{item.itemType}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Unit:</span>
              <span>{item.unit?.name || "pcs"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Reorder Level:</span>
              <span>{item.reorderLevel}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Stock Balances</CardTitle>
          </CardHeader>
          <CardContent>
            {item.balances.length === 0 ? (
              <p className="text-sm text-muted-foreground">No stock recorded.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {item.balances.map((b) => (
                  <li key={b.id} className="flex justify-between border-b pb-1 last:border-0">
                    <span className="font-medium">{b.location.name}</span>
                    <span className={b.quantityOnHand <= item.reorderLevel ? "text-yellow-600 font-bold" : "font-bold text-green-600"}>
                      {b.quantityOnHand} {item.unit?.symbol || "pcs"}
                    </span>
                  </li>
                ))}
                <li className="flex justify-between pt-2">
                  <span className="font-semibold cursor-pointer text-primary">Total:</span>
                  <span className="font-bold">{totalQty} {item.unit?.symbol || "pcs"}</span>
                </li>
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Description</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            {item.description ? item.description : <span className="text-muted-foreground italic">No description provided.</span>}
          </CardContent>
        </Card>
      </div>

      <div className="mt-8">
        <h3 className="text-xl font-bold mb-4">Recent Movements</h3>
        <div className="rounded-md border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Movement Type</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Operator</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center h-24">
                    No transactions yet.
                  </TableCell>
                </TableRow>
              ) : (
                transactions.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell>{t.createdAt.toLocaleDateString()}</TableCell>
                    <TableCell>{t.location.name}</TableCell>
                    <TableCell>
                      <Badge variant={t.direction === "IN" ? "secondary" : "outline"}>
                        {t.movementType.replace(/_/g, " ")} {t.direction === "IN" ? "↓" : "↑"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {t.direction === "IN" ? "+" : "-"}{t.quantity}
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-muted-foreground">{t.notes || t.referenceType || "-"}</span>
                    </TableCell>
                    <TableCell>{t.createdBy?.name || "System"}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
