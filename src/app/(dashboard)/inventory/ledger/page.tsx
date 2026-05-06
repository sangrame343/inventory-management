import { Metadata } from "next";
import { getInventoryLedgerSummary } from "@/app/actions/inventory-transaction-actions";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "Inventory | Ledger",
  description: "View all stock movements and history.",
};

export default async function InventoryLedgerPage() {
  const transactions = await getInventoryLedgerSummary();

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Stock Ledger</h2>
      </div>
      
      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Item Name</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead className="text-right">Balance After</TableHead>
              <TableHead>Created By</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center h-24">
                  No stock movements found.
                </TableCell>
              </TableRow>
            ) : (
              transactions.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="whitespace-nowrap">
                    {t.createdAt.toLocaleDateString()} {t.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </TableCell>
                  <TableCell>{t.item.sku}</TableCell>
                  <TableCell>{t.item.name}</TableCell>
                  <TableCell>{t.location.name}</TableCell>
                  <TableCell>
                    <Badge variant={t.direction === "IN" ? "secondary" : "outline"} className={t.direction === "IN" ? "bg-green-100 text-green-800" : "bg-red-50 text-red-800 border-red-200"}>
                      {t.movementType.replace(/_/g, " ")} {t.direction === "IN" ? "↓" : "↑"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {t.direction === "IN" ? "+" : "-"}{t.quantity}
                  </TableCell>
                  <TableCell className="text-right">{t.balanceAfter ?? "-"}</TableCell>
                  <TableCell>{t.createdBy?.name || "System"}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
