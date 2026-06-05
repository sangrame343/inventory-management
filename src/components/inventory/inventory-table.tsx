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
  purchasedFromDepartment?: { id: string; name: string } | null;
  department?: { id: string; name: string } | null;
};

export function InventoryTable({
  items,
  onEdit,
  onAdjustStock,
  onStockIn,
  onStockOut,
  onAssignEmployee,
  onAssignDepartment,
  onDelete,
}: {
  items: PopulatedItem[];
  onEdit: (item: PopulatedItem) => void;
  onAdjustStock: (item: PopulatedItem) => void;
  onStockIn: (item: PopulatedItem) => void;
  onStockOut: (item: PopulatedItem) => void;
  onAssignEmployee: (item: PopulatedItem) => void;
  onAssignDepartment: (item: PopulatedItem) => void;
  onDelete: (item: PopulatedItem) => void;
}) {

  return (
    <div className="w-full">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>SKU</TableHead>
            <TableHead>Item Name</TableHead>
            <TableHead>Category</TableHead>
            <TableHead className="text-right">Total Stock</TableHead>
            <TableHead className="text-right">Available Stock</TableHead>
            <TableHead className="text-right">Assigned Stock</TableHead>
            <TableHead>Purchased From</TableHead>
            <TableHead>Owner</TableHead>
            <TableHead>Location</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length === 0 ? (
            <TableRow>
              <TableCell colSpan={11} className="h-24 text-center">
                No items found.
              </TableCell>
            </TableRow>
          ) : (
            items.map((item) => {
              const qty = item.availableQuantity;
              
              let statusBadge = <Badge variant="default" className="bg-green-600">Healthy</Badge>;
              if (qty <= 0) {
                statusBadge = <Badge variant="destructive">Out of Stock</Badge>;
              } else if (qty <= item.reorderLevel) {
                statusBadge = <Badge variant="outline" className="border-yellow-600 text-yellow-600">Low Stock</Badge>;
              }

              return (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.sku}</TableCell>
                  <TableCell className="max-w-[250px] truncate" title={item.name}>
                    {item.name}
                  </TableCell>
                  <TableCell>{item.category?.name || "Uncategorized"}</TableCell>
                  <TableCell className="text-right font-semibold">
                    {item.totalQuantity} {item.unit?.symbol || "pcs"}
                  </TableCell>
                  <TableCell className="text-right font-semibold text-emerald-600">
                    {item.availableQuantity} {item.unit?.symbol || "pcs"}
                  </TableCell>
                  <TableCell className="text-right font-semibold text-violet-600">
                    {item.assignedQuantity} {item.unit?.symbol || "pcs"}
                  </TableCell>
                  <TableCell>{item.purchasedFromDepartment?.name || "N/A"}</TableCell>
                  <TableCell>{item.department?.name || "N/A"}</TableCell>
                  <TableCell>{item.defaultLocation?.name || "N/A"}</TableCell>
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
                          <DropdownMenuItem onClick={() => window.location.href = `/inventory/${item.id}`}>
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onEdit(item)}>
                            Edit Info
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onStockIn(item)}>
                            Add More Stock
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onAssignEmployee(item)} className="text-blue-600 focus:text-blue-600 font-semibold">
                            Assign to Employee
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onAssignDepartment(item)} className="text-indigo-600 focus:text-indigo-600 font-semibold">
                            Assign to Department
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => window.location.href = `/inventory/${item.id}#transactions`}>
                            View Transactions
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => window.location.href = `/inventory/${item.id}#assets`}>
                            View Generated Assets
                          </DropdownMenuItem>
                        </DropdownMenuGroup>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => onDelete(item)} className="text-red-600 focus:text-red-600">
                          Delete Item
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
