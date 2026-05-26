"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { format } from "date-fns";
import {
  Eye,
  Pencil,
  History,
  Trash2,
  Copy,
  MoreHorizontal,
  ChevronDown,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { deleteAsset, duplicateAsset } from "@/app/actions/asset-actions";
import { toast } from "sonner";
import { AssetTableToolbar } from "./asset-table-toolbar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

interface Asset {
  id: string;
  assetCode: string | null;
  assetTag: string;
  name: string;
  brand: string | null;
  model: string | null;
  serialNumber: string | null;
  status: string;
  location: { name: string } | null;
  category: { name: string } | null;
  vendor: { name: string } | null;
  purchasedFromDepartment: { name: string } | null;
  purchaseDate: Date | null;
  assignments: any[];
}

interface AssetTableClientProps {
  assets: Asset[];
  totalCount: number;
  categories: { id: string; name: string }[];
  locations: { id: string; name: string }[];
  vendors: { id: string; name: string }[];
  employees: { id: string; name: string }[];
  departments: { id: string; name: string }[];
}

export function AssetTableClient({
  assets,
  totalCount,
  categories,
  locations,
  vendors,
  employees,
  departments,
}: AssetTableClientProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentSortBy = searchParams.get("sortBy") || "createdAt";
  const currentOrder = searchParams.get("order") || "desc";
  const currentPage = Number(searchParams.get("page")) || 1;
  const currentLimit = Number(searchParams.get("limit")) || 10;

  const toggleSelectAll = () => {
    if (selectedIds.length === assets.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(assets.map((a) => a.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev: string[]) =>
      prev.includes(id) ? prev.filter((i: string) => i !== id) : [...prev, id],
    );
  };

  const handleSort = (field: string) => {
    const params = new URLSearchParams(searchParams.toString());
    const defaultDescFields = ["createdAt", "purchaseDate", "assignedAt"];

    if (currentSortBy === field) {
      params.set("order", currentOrder === "asc" ? "desc" : "asc");
    } else {
      params.set("sortBy", field);
      params.set("order", defaultDescFields.includes(field) ? "desc" : "asc");
    }

    params.set("page", "1");
    router.push(`/assets?${params.toString()}`);
  };
  const updatePageSize = (newLimit: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("limit", newLimit);
    params.set("page", "1");
    router.push(`/assets?${params.toString()}`);
  };

  const updatePage = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", newPage.toString());
    router.push(`/assets?${params.toString()}`);
  };

  const SortIcon = ({ field }: { field: string }) => {
    if (currentSortBy !== field) {
      return <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />;
    }

    return currentOrder === "asc" ?
        <ArrowUp className="ml-2 h-4 w-4" />
      : <ArrowDown className="ml-2 h-4 w-4" />;
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete asset "${name}"?`)) return;

    startTransition(async () => {
      try {
        await deleteAsset(id);
        toast.success(`Asset "${name}" deleted`);
        setSelectedIds((prev: string[]) =>
          prev.filter((i: string) => i !== id),
        );
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to delete asset",
        );
      }
    });
  };

  const handleDuplicate = async (id: string, name: string) => {
    startTransition(async () => {
      try {
        const res = await duplicateAsset(id);
        if (res && "id" in res) {
          toast.success(`Asset "${name}" duplicated`);
          router.push(`/assets/${res.id}`);
        } else if (res && "message" in res) {
          toast.success(res.message);
        }
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to duplicate asset"
        );
      }
    });
  };

  const rangeStart = (currentPage - 1) * currentLimit + 1;
  const rangeEnd = Math.min(currentPage * currentLimit, totalCount);

  return (
    <div className="space-y-4">
      <AssetTableToolbar
        selectedIds={selectedIds}
        onClearSelection={() => setSelectedIds([])}
        categories={categories}
        locations={locations}
        vendors={vendors}
        employees={employees}
        departments={departments}
      />

      <div className="rounded-md border bg-card overflow-hidden">
        <div className="overflow-x-auto relative">
          <Table>
            <TableHeader className="sticky top-0 bg-card z-10 shadow-sm">
              <TableRow>
                <TableHead className="w-[40px]">
                  <Checkbox
                    checked={
                      assets.length > 0 && selectedIds.length === assets.length
                    }
                    onChange={toggleSelectAll}
                  />
                </TableHead>

                <TableHead
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => handleSort("assetCode")}
                >
                  <div className="flex items-center">
                    Asset Code <SortIcon field="assetCode" />
                  </div>
                </TableHead>

                <TableHead
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => handleSort("assetTag")}
                >
                  <div className="flex items-center">
                    Asset Tag <SortIcon field="assetTag" />
                  </div>
                </TableHead>

                <TableHead
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => handleSort("name")}
                >
                  <div className="flex items-center">
                    Name <SortIcon field="name" />
                  </div>
                </TableHead>

                <TableHead
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => handleSort("category")}
                >
                  <div className="flex items-center">
                    Category <SortIcon field="category" />
                  </div>
                </TableHead>

                <TableHead
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => handleSort("status")}
                >
                  <div className="flex items-center">
                    Status <SortIcon field="status" />
                  </div>
                </TableHead>

                <TableHead
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => handleSort("location")}
                >
                  <div className="flex items-center">
                    Location <SortIcon field="location" />
                  </div>
                </TableHead>

                <TableHead>Assigned To</TableHead>

                <TableHead
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => handleSort("vendor")}
                >
                  <div className="flex items-center">
                    Vendor <SortIcon field="vendor" />
                  </div>
                </TableHead>

                <TableHead
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => handleSort("purchasedFromDepartment")}
                >
                  <div className="flex items-center whitespace-nowrap">
                    Purchased From <SortIcon field="purchasedFromDepartment" />
                  </div>
                </TableHead>

                <TableHead
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => handleSort("purchaseDate")}
                >
                  <div className="flex items-center whitespace-nowrap">
                    Purchase Date <SortIcon field="purchaseDate" />
                  </div>
                </TableHead>

                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {assets.length === 0 ?
                <TableRow>
                  <TableCell
                    colSpan={11}
                    className="h-24 text-center text-muted-foreground"
                  >
                    No assets found.
                  </TableCell>
                </TableRow>
              : assets.map((asset) => {
                  const assignment = asset.assignments[0];
                  const isSelected = selectedIds.includes(asset.id);

                  return (
                    <TableRow
                      key={asset.id}
                      className={isSelected ? "bg-muted/50" : ""}
                    >
                      <TableCell>
                        <Checkbox
                          checked={isSelected}
                          onChange={() => toggleSelect(asset.id)}
                        />
                      </TableCell>

                      <TableCell className="font-medium">
                        {asset.assetCode || "—"}
                      </TableCell>

                      <TableCell>{asset.assetTag}</TableCell>

                      <TableCell className="max-w-[220px]">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger
                              render={
                                <div className="grid gap-0.5 cursor-default truncate">
                                  <DropdownMenu>
                                    <DropdownMenuTrigger
                                      render={
                                        <button className="flex flex-col cursor-pointer hover:bg-muted/50 p-1 -m-1 rounded transition-colors group text-left w-full" />
                                      }
                                    >
                                      <div className="flex items-center gap-1.5">
                                        <span className="font-semibold truncate">
                                          {asset.name.length > 25 ?
                                            `${asset.name.substring(0, 25)}...`
                                          : asset.name}
                                        </span>
                                        <ChevronDown className="h-3 w-3 text-muted-foreground opacity-20 group-hover:opacity-100 transition-opacity" />
                                      </div>
                                      <span className="text-[10px] text-muted-foreground truncate uppercase tracking-tight">
                                        {asset.brand || "Generic"} •{" "}
                                        {asset.serialNumber || "No S/N"}
                                      </span>
                                    </DropdownMenuTrigger>

                                    <DropdownMenuContent
                                      align="start"
                                      className="w-[320px] p-0 overflow-hidden"
                                    >
                                      <div className="bg-primary/5 p-3 border-b">
                                        <h4 className="text-[10px] font-bold uppercase text-primary/70 tracking-widest mb-1">
                                          Asset Name
                                        </h4>
                                        <p className="text-sm font-semibold leading-tight">
                                          {asset.name}
                                        </p>
                                      </div>

                                      <div className="p-3 space-y-3">
                                        <div className="grid grid-cols-2 gap-4">
                                          <div>
                                            <h4 className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider mb-1">
                                              Brand
                                            </h4>
                                            <p className="text-sm">
                                              {asset.brand || "—"}
                                            </p>
                                          </div>
                                          <div>
                                            <h4 className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider mb-1">
                                              Model
                                            </h4>
                                            <p className="text-sm">
                                              {asset.model || "—"}
                                            </p>
                                          </div>
                                        </div>

                                        <div>
                                          <h4 className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider mb-1">
                                            Serial Number
                                          </h4>
                                          <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono block w-fit">
                                            {asset.serialNumber || "N/A"}
                                          </code>
                                        </div>

                                        <div className="pt-2 border-t flex justify-between gap-2">
                                          <Link
                                            href={`/assets/${asset.id}`}
                                            className="text-xs text-primary hover:underline flex items-center font-medium"
                                          >
                                            <Eye className="h-3 w-3 mr-1" />{" "}
                                            View Full Details
                                          </Link>
                                          <Link
                                            href={`/assets/${asset.id}/edit`}
                                            className="text-xs text-muted-foreground hover:underline flex items-center"
                                          >
                                            <Pencil className="h-3 w-3 mr-1" />{" "}
                                            Edit
                                          </Link>
                                        </div>
                                      </div>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              }
                            />
                            <TooltipContent>{asset.name}</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>

                      <TableCell>{asset.category?.name || "N/A"}</TableCell>

                      <TableCell>
                        <Badge
                          variant={
                            asset.status === "ACTIVE" ? "default"
                            : asset.status === "ASSIGNED" ?
                              "secondary"
                            : asset.status === "REPAIR" ?
                              "outline"
                            : "destructive"
                          }
                        >
                          {asset.status}
                        </Badge>
                      </TableCell>

                      <TableCell>{asset.location?.name || "N/A"}</TableCell>

                      <TableCell>
                        {assignment?.employee?.fullName ||
                          assignment?.user?.name ||
                          assignment?.user?.email ||
                          "Unassigned"}
                      </TableCell>

                      <TableCell>{asset.vendor?.name || "N/A"}</TableCell>

                      <TableCell>{asset.purchasedFromDepartment?.name || "—"}</TableCell>

                      <TableCell>
                        {asset.purchaseDate ?
                          format(new Date(asset.purchaseDate), "PPP")
                        : "N/A"}
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Link
                            href={`/assets/${asset.id}`}
                            title="View"
                            className={cn(
                              buttonVariants({
                                variant: "outline",
                                size: "icon-sm",
                              }),
                            )}
                          >
                            <Eye className="h-4 w-4" />
                          </Link>

                          <Link
                            href={`/assets/${asset.id}/edit`}
                            title="Edit"
                            className={cn(
                              buttonVariants({
                                variant: "outline",
                                size: "icon-sm",
                              }),
                            )}
                          >
                            <Pencil className="h-4 w-4" />
                          </Link>

                          <DropdownMenu>
                            <DropdownMenuTrigger
                              className={cn(
                                buttonVariants({
                                  variant: "ghost",
                                  size: "icon-sm",
                                }),
                              )}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                render={
                                  <Link href={`/assets/${asset.id}/history`}>
                                    <History className="mr-2 h-4 w-4" />
                                    <span>History</span>
                                  </Link>
                                }
                              />
                              <DropdownMenuItem
                                onClick={() => handleDuplicate(asset.id, asset.name)}
                              >
                                <Copy className="mr-2 h-4 w-4" />
                                <span>Duplicate</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() =>
                                  handleDelete(asset.id, asset.name)
                                }
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                <span>Delete</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              }
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between py-4">
        <div className="text-sm text-muted-foreground order-2 sm:order-1">
          Showing{" "}
          <span className="font-medium">
            {totalCount === 0 ? 0 : rangeStart}
          </span>{" "}
          to <span className="font-medium">{rangeEnd}</span> of{" "}
          <span className="font-medium">{totalCount}</span> assets
        </div>

        <div className="flex flex-wrap items-center gap-4 sm:gap-6 order-1 sm:order-2">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium">Rows per page</p>
            <select
              value={currentLimit}
              onChange={(e) => updatePageSize(e.target.value)}
              className="h-8 w-[70px] rounded-md border border-input bg-background px-2 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {[10, 25, 50, 100].map((pageSize) => (
                <option key={pageSize} value={pageSize}>
                  {pageSize}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex w-[100px] items-center justify-center text-sm font-medium">
              Page {currentPage} of {Math.ceil(totalCount / currentLimit) || 1}
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                disabled={currentPage <= 1}
                onClick={() => updatePage(1)}
              >
                <span className="sr-only">First page</span>
                <span className="text-xs font-bold">«</span>
              </Button>

              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                disabled={currentPage <= 1}
                onClick={() => updatePage(currentPage - 1)}
              >
                <span className="sr-only">Previous page</span>
                <span className="text-xs font-bold">‹</span>
              </Button>

              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                disabled={currentPage >= Math.ceil(totalCount / currentLimit)}
                onClick={() => updatePage(currentPage + 1)}
              >
                <span className="sr-only">Next page</span>
                <span className="text-xs font-bold">›</span>
              </Button>

              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                disabled={currentPage >= Math.ceil(totalCount / currentLimit)}
                onClick={() => updatePage(Math.ceil(totalCount / currentLimit))}
              >
                <span className="sr-only">Last page</span>
                <span className="text-xs font-bold">»</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
