import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { EmployeeService } from "@/services/employee-service";
import { AddAssetModal } from "@/components/assets/add-asset-modal";
import { AssetImportButton } from "@/components/assets/asset-import-button";
import { AssetTableClient } from "@/components/assets/asset-table-client";
import { Prisma } from "@prisma/client";

export default async function AssetsPage(props: {
  searchParams: Promise<{
    page?: string;
    query?: string;
    limit?: string;
    sortBy?: string;
    order?: string;
    status?: string;
    categoryId?: string;
    locationId?: string;
    vendorId?: string;
    employeeId?: string;
    assignmentStatus?: string;
    quickFilter?: string;
  }>;
}) {
  const searchParams = await props.searchParams;
  const session = await auth();

  if (!session?.user?.activeCompanyId || !session.user.id) {
    redirect("/login");
  }

  const companyId = session.user.activeCompanyId;
  const page = Number(searchParams.page) || 1;
  const limit = Number(searchParams.limit) || 10;
  const query = searchParams.query || "";
  const sortBy = searchParams.sortBy || "createdAt";
  const order = (searchParams.order as Prisma.SortOrder) || "desc";
  const skip = (page - 1) * limit;

  const categoryIds =
    searchParams.categoryId ?
      searchParams.categoryId.split(",").filter(Boolean)
    : [];
  const locationIds =
    searchParams.locationId ?
      searchParams.locationId.split(",").filter(Boolean)
    : [];
  const statusFilter =
    searchParams.status ? searchParams.status.split(",").filter(Boolean) : [];
  const vendorId = searchParams.vendorId || undefined;
  const employeeId = searchParams.employeeId || undefined;
  const assignmentStatus =
    searchParams.assignmentStatus || searchParams.quickFilter || undefined;

  // Build AND conditions so filters do not overwrite each other
  const andConditions: Prisma.AssetWhereInput[] = [{ companyId }];

  if (query) {
    andConditions.push({
      OR: [
        { name: { contains: query, mode: "insensitive" } },
        { assetTag: { contains: query, mode: "insensitive" } },
        { assetCode: { contains: query, mode: "insensitive" } },
        { serialNumber: { contains: query, mode: "insensitive" } },
        { brand: { contains: query, mode: "insensitive" } },
        { model: { contains: query, mode: "insensitive" } },
      ],
    });
  }

  if (categoryIds.length > 0) {
    andConditions.push({
      categoryId: { in: categoryIds },
    });
  }

  if (locationIds.length > 0) {
    andConditions.push({
      locationId: { in: locationIds },
    });
  }

  if (statusFilter.length > 0) {
    andConditions.push({
      status: { in: statusFilter as any },
    });
  }

  if (vendorId) {
    andConditions.push({ vendorId });
  }

  if (employeeId) {
    andConditions.push({
      assignments: {
        some: {
          employeeId,
          returnedAt: null,
        },
      },
    });
  }

  // Assignment filters should rely on active assignments, not status field
  if (assignmentStatus === "assigned") {
    andConditions.push({
      assignments: {
        some: {
          returnedAt: null,
        },
      },
    });
  } else if (assignmentStatus === "unassigned") {
    andConditions.push({
      assignments: {
        none: {
          returnedAt: null,
        },
      },
    });
  } else if (assignmentStatus === "in_repair") {
    andConditions.push({
      status: "REPAIR",
    });
  } else if (assignmentStatus === "recently_added") {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    andConditions.push({
      createdAt: { gte: thirtyDaysAgo },
    });
  }

  const where: Prisma.AssetWhereInput = {
    AND: andConditions,
  };

  let orderBy: Prisma.AssetOrderByWithRelationInput = { createdAt: "desc" };

  if (sortBy === "createdAt") {
    orderBy = { createdAt: order };
  } else if (sortBy === "name") {
    orderBy = { name: order };
  } else if (sortBy === "assetCode") {
    orderBy = { assetCode: order };
  } else if (sortBy === "assetTag") {
    orderBy = { assetTag: order };
  } else if (sortBy === "status") {
    orderBy = { status: order };
  } else if (sortBy === "purchaseDate") {
    orderBy = { purchaseDate: order };
  } else if (sortBy === "category") {
    orderBy = { category: { name: order } };
  } else if (sortBy === "location") {
    orderBy = { location: { name: order } };
  } else if (sortBy === "vendor") {
    orderBy = { vendor: { name: order } };
  }

  const [totalCount, categories, departments, locations, vendors, employees] =
    await Promise.all([
      db.asset.count({ where }),

      db.assetCategory.findMany({
        where: { companyId },
        orderBy: { name: "asc" },
      }),

      db.department.findMany({
        where: { companyId },
        orderBy: { name: "asc" },
      }),

      db.location.findMany({
        where: { companyId },
        orderBy: { name: "asc" },
      }),

      db.vendor.findMany({
        where: { companyId },
        orderBy: { name: "asc" },
      }),

      EmployeeService.getEmployees(companyId),
    ]);

  let assets: any[] = [];

  // Special handling for latest assigned sorting
  if (sortBy === "assignedAt") {
    const latestAssignments = await db.assetAssignment.findMany({
      where: {
        companyId,
        returnedAt: null,
        asset: where,
      },
      orderBy: {
        assignedAt: order,
      },
      select: {
        assetId: true,
        assignedAt: true,
      },
    });

    const assignedAssetIds = [
      ...new Set(latestAssignments.map((a) => a.assetId)),
    ];

    const unassignedAssets = await db.asset.findMany({
      where: {
        AND: [
          ...andConditions.filter(
            (c) =>
              !(
                "assignments" in c &&
                (c as any).assignments?.some?.returnedAt === null
              ),
          ),
          {
            assignments: {
              none: { returnedAt: null },
            },
          },
        ],
      },
      select: { id: true },
      orderBy: { createdAt: "desc" },
    });

    const orderedIds = [
      ...assignedAssetIds,
      ...unassignedAssets.map((a) => a.id),
    ];

    const pagedIds = orderedIds.slice(skip, skip + limit);

    const rows = await db.asset.findMany({
      where: {
        id: { in: pagedIds },
      },
      include: {
        category: true,
        department: true,
        location: true,
        vendor: true,
        assignments: {
          where: { returnedAt: null },
          include: { user: true, employee: true, assignedBy: true },
          orderBy: { assignedAt: "desc" },
          take: 1,
        },
      },
    });

    const rowMap = new Map(rows.map((row) => [row.id, row]));
    assets = pagedIds.map((id) => rowMap.get(id)).filter(Boolean);
  } else {
    assets = await db.asset.findMany({
      where,
      include: {
        category: true,
        department: true,
        location: true,
        vendor: true,
        assignments: {
          where: { returnedAt: null },
          include: { user: true, employee: true, assignedBy: true },
          orderBy: { assignedAt: "desc" },
          take: 1,
        },
      },
      orderBy,
      skip,
      take: limit,
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            Assets Fixed Registry
          </h2>
          <p className="text-sm text-muted-foreground">
            Manage company assets, assignments, and lifecycle tracking.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <AssetImportButton />
          <AddAssetModal
            categories={categories.map((x) => ({ id: x.id, name: x.name }))}
            departments={departments.map((x) => ({ id: x.id, name: x.name }))}
            locations={locations.map((x) => ({ id: x.id, name: x.name }))}
            vendors={vendors.map((x) => ({ id: x.id, name: x.name }))}
            employees={employees.map((x) => ({
              id: x.id,
              name: x.fullName,
              employeeId: x.employeeCode,
              userId: x.user?.id || null,
            }))}
            currentUserId={session.user.id}
          />
        </div>
      </div>

      <AssetTableClient
        assets={assets as any}
        totalCount={totalCount}
        categories={categories.map((c) => ({ id: c.id, name: c.name }))}
        locations={locations.map((l) => ({ id: l.id, name: l.name }))}
        vendors={vendors.map((v) => ({ id: v.id, name: v.name }))}
        employees={employees.map((e) => ({ id: e.id, name: e.fullName }))}
      />
    </div>
  );
}
