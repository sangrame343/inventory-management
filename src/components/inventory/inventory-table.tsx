"use client";

import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

import type { InventoryItem, InventoryBalance, InventoryCategory, InventoryLocation, UnitOfMeasure } from "@prisma/client";

type PopulatedItem = InventoryItem & {
  category: InventoryCategory | null;
  unit: UnitOfMeasure | null;
  defaultLocation: InventoryLocation | null;
  balances: InventoryBalance[];
};

export function InventoryTable({
  items,
  onEdit,
  onAdjustStock,
  onStockIn,
  onStockOut,
  onIssue,
}: {
  items: PopulatedItem[];
  onEdit: (item: PopulatedItem) => void;
  onAdjustStock: (item: PopulatedItem) => void;
  onStockIn: (item: PopulatedItem) => void;
  onStockOut: (item: PopulatedItem) => void;
  onIssue: (item: PopulatedItem) => void;
}) {

  return (
    <div className="w-full">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>SKU</TableHead>
            <TableHead>Item Name</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Location</TableHead>
            <TableHead className="text-right">Quantity</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="h-24 text-center">
                No items found.
              </TableCell>
            </TableRow>
          ) : (
            items.map((item) => {
              const qty = item.balances.reduce((acc, b) => acc + b.quantityOnHand, 0);
              
              let statusBadge = <Badge variant="default" className="bg-green-600">Healthy</Badge>;
              if (qty <= 0) {
                statusBadge = <Badge variant="destructive">Out of Stock</Badge>;
              } else if (qty <= item.reorderLevel) {
                statusBadge = <Badge variant="outline" className="border-yellow-600 text-yellow-600">Low Stock</Badge>;
              }

              return (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.sku}</TableCell>
                  <TableCell>{item.name}</TableCell>
                  <TableCell>{item.category?.name || "Uncategorized"}</TableCell>
                  <TableCell>{item.defaultLocation?.name || "N/A"}</TableCell>
                  <TableCell className="text-right font-semibold">
                    {qty} {item.unit?.symbol || "pcs"}
                  </TableCell>
                  <TableCell>{statusBadge}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuGroup>
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => onStockIn(item)}>
                            Stock In
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onStockOut(item)}>
                            Stock Out
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onIssue(item)} className="text-blue-600 focus:text-blue-600 font-semibold">
                            Issue to Employee
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onAdjustStock(item)}>
                            Adjust Stock
                          </DropdownMenuItem>
                        </DropdownMenuGroup>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => onEdit(item)}>
                          Edit Info
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
