import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { AssetAssignModal } from "@/components/assets/asset-assign-modal";
import { AssetReturnModal } from "@/components/assets/asset-return-modal";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TransferHistory } from "@/components/assets/transfer-history";
import { Truck } from "lucide-react";

interface AssetDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function AssetDetailPage({
  params,
}: AssetDetailPageProps) {
  const session = await auth();

  if (!session?.user?.activeCompanyId) {
    redirect("/login");
  }

  const { id } = await params;

  const asset = (await db.asset.findFirst({
    where: {
      id,
      companyId: session.user.activeCompanyId,
    },
    include: {
      category: true,
      department: true,
      location: true,
      vendor: true,
      assignments: {
        include: {
          user: true,
          employee: true,
          assignedBy: true,
          manager: true,
          department: true,
          location: true,
        },
        orderBy: {
          assignedAt: "desc",
        },
      },
      tickets: {
        include: {
          createdBy: true,
          assignedTo: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  })) as any;

  if (!asset) {
    notFound();
  }

  const currentAssignment = asset.assignments.find((a: any) => !a.returnedAt);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{asset.name}</h1>
          <p className="text-sm text-muted-foreground">
            Asset Tag: {asset.assetTag}
            {asset.assetCode ? ` • Asset Code: ${asset.assetCode}` : ""}
          </p>
        </div>

        <div className="flex gap-2">
          {currentAssignment ? (
            <AssetReturnModal assetId={asset.id} assetName={asset.name} />
          ) : (
            <AssetAssignModal assetId={asset.id} assetName={asset.name} />
          )}
          <Button
            variant="outline"
            render={<Link href={`/assets/${asset.id}/edit`}>Edit</Link>}
          />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-xl border bg-card p-5 lg:col-span-2">
          <h2 className="mb-4 text-lg font-semibold">Asset Information</h2>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <div className="text-sm text-muted-foreground">Status</div>
              <div className="mt-1">
                <Badge
                  variant={
                    asset.status === "ACTIVE" ? "default"
                    : asset.status === "ASSIGNED" ?
                      "secondary"
                    : "destructive"
                  }
                >
                  {asset.status}
                </Badge>
              </div>
            </div>

            <div>
              <div className="text-sm text-muted-foreground">Category</div>
              <div className="mt-1 font-medium">
                {asset.category?.name || "N/A"}
              </div>
            </div>

            <div>
              <div className="text-sm text-muted-foreground">Department</div>
              <div className="mt-1 font-medium">
                {asset.department?.name || "N/A"}
              </div>
            </div>

            <div>
              <div className="text-sm text-muted-foreground">Location</div>
              <div className="mt-1 font-medium">
                {asset.location?.name || "N/A"}
              </div>
            </div>

            <div>
              <div className="text-sm text-muted-foreground">Serial Number</div>
              <div className="mt-1 font-medium">
                {asset.serialNumber || "N/A"}
              </div>
            </div>

            <div>
              <div className="text-sm text-muted-foreground">Brand / Model</div>
              <div className="mt-1 font-medium">
                {asset.brand || "—"} {asset.model ? `• ${asset.model}` : ""}
              </div>
            </div>

            <div>
              <div className="text-sm text-muted-foreground">Condition</div>
              <div className="mt-1 font-medium">{asset.condition || "N/A"}</div>
            </div>

            <div>
              <div className="text-sm text-muted-foreground">Purchase Date</div>
              <div className="mt-1 font-medium">
                {asset.purchaseDate ?
                  format(new Date(asset.purchaseDate), "PPP")
                : "N/A"}
              </div>
            </div>

            <div>
              <div className="text-sm text-muted-foreground">Purchase Price</div>
              <div className="mt-1 font-medium">
                {asset.cost != null ? `₹${asset.cost.toLocaleString()}` : "N/A"}
              </div>
            </div>

            <div>
              <div className="text-sm text-muted-foreground">
                Warranty Details
              </div>
              <div className="mt-1 font-medium">
                {asset.warranty || "N/A"}
              </div>
            </div>

            <div>
              <div className="text-sm text-muted-foreground">
                Warranty Expiration
              </div>
              <div className="mt-1 font-medium">
                {asset.warrantyExpiration ?
                  format(new Date(asset.warrantyExpiration), "PPP")
                : "N/A"}
              </div>
            </div>

            <div>
              <div className="text-sm text-muted-foreground">
                Residual Value
              </div>
              <div className="mt-1 font-medium">
                {asset.residualValue != null ?
                  `₹${asset.residualValue.toLocaleString()}`
                : "N/A"}
              </div>
            </div>

            <div className="md:col-span-2">
              <div className="text-sm text-muted-foreground">
                Specifications
              </div>
              <div className="mt-1 font-medium">
                {asset.specifications || "N/A"}
              </div>
            </div>

            <div className="md:col-span-2">
              <div className="text-sm text-muted-foreground">
                Accessories Included
              </div>
              <div className="mt-1 font-medium">
                {asset.accessoriesIncluded?.length ?
                  asset.accessoriesIncluded.join(", ")
                : "N/A"}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-5">
          <h2 className="mb-4 text-lg font-semibold">Current Holder</h2>

          {currentAssignment ?
            <div className="space-y-3">
              <div>
                <div className="text-sm text-muted-foreground">Holding Entity</div>
                <div className="font-medium">
                  {currentAssignment.employee?.fullName || 
                   currentAssignment.department?.name ||
                   currentAssignment.user?.name || "N/A"}
                </div>
                {currentAssignment.employee?.employeeCode && (
                  <div className="text-xs text-muted-foreground">Employee Code: {currentAssignment.employee.employeeCode}</div>
                )}
                {currentAssignment.department && (
                  <div className="text-xs text-muted-foreground">Department Assignment</div>
                )}
              </div>

              {currentAssignment.location && (
                <div>
                  <div className="text-sm text-muted-foreground">Assigned Location</div>
                  <div className="font-medium">
                    {currentAssignment.location.name}
                  </div>
                </div>
              )}

              <div>
                <div className="text-sm text-muted-foreground">Assigned On</div>
                <div className="font-medium">
                  {format(new Date(currentAssignment.assignedAt), "PPP")}
                </div>
              </div>

              <div>
                <div className="text-sm text-muted-foreground">Issued By</div>
                <div className="font-medium">
                  {currentAssignment.assignedBy?.name ||
                    currentAssignment.assignedBy?.email ||
                    "N/A"}
                </div>
              </div>

              <div>
                <div className="text-sm text-muted-foreground">
                  Transaction ID
                </div>
                <div className="font-medium">
                  {currentAssignment.transactionId}
                </div>
              </div>
            </div>
          : <div className="text-sm text-muted-foreground">
              Currently unassigned.
            </div>
          }
        </div>
      </div>

      <div className="rounded-xl border bg-card p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Handover History</h2>
          <Button
            variant="outline"
            size="sm"
            render={
              <Link href={`/assets/${asset.id}/history`}>
                Open Full Timeline
              </Link>
            }
          />
        </div>

        <div className="space-y-4">
          {asset.assignments.length === 0 ?
            <p className="text-sm text-muted-foreground">
              No handover history found.
            </p>
          : asset.assignments.slice(0, 5).map((entry: any) => (
              <div key={entry.id} className="rounded-lg border p-4">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div className="font-medium">
                    {entry.employee?.fullName || 
                     entry.department?.name ||
                     entry.user?.name || entry.user?.email || "Unknown Holder"}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {format(new Date(entry.assignedAt), "PPP")}
                    {entry.returnedAt ?
                      ` → ${format(new Date(entry.returnedAt), "PPP")}`
                    : " → Present"}
                  </div>
                </div>

                <div className="mt-2 text-sm text-muted-foreground">
                   Handover Type: {entry.handoverType || "N/A"}
                   {entry.location && ` • Location: ${entry.location.name}`}
                   {" • "}Condition: {entry.condition || "N/A"}
                 </div>
              </div>
            ))
          }
        </div>
      </div>

      <div className="rounded-xl border bg-card p-5">
        <h2 className="mb-4 text-lg font-semibold flex items-center gap-2">
          <Truck className="size-4" /> Movement History (Transfers)
        </h2>
        <TransferHistory assetId={asset.id} />
      </div>

      <div className="rounded-xl border bg-card p-5">
        <h2 className="mb-4 text-lg font-semibold">Maintenance Logs</h2>

        <div className="space-y-4">
          {asset.tickets.length === 0 ?
            <p className="text-sm text-muted-foreground">
              No maintenance logs found.
            </p>
          : asset.tickets.map((ticket: any) => (
              <div key={ticket.id} className="rounded-lg border p-4">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="font-medium">{ticket.title}</div>
                    <div className="text-sm text-muted-foreground">
                      {ticket.description || "No description"}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Badge variant="outline">{ticket.priority}</Badge>
                    <Badge>{ticket.status}</Badge>
                  </div>
                </div>

                <div className="mt-3 text-sm text-muted-foreground">
                  Created by:{" "}
                  {ticket.createdBy.name || ticket.createdBy.email || "N/A"}
                  {" • "}
                  Assigned to:{" "}
                  {ticket.assignedTo?.name ||
                    ticket.assignedTo?.email ||
                    "Unassigned"}
                </div>
              </div>
            ))
          }
        </div>
      </div>
    </div>
  );
}
