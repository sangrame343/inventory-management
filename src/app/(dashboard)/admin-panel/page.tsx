import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { Role } from "@prisma/client";
import { AdminPanelClient } from "./admin-panel-client";

export const dynamic = "force-dynamic";

export default async function AdminPanelPage() {
  const session = await auth();
  if (!session?.user?.id || !session.user.activeCompanyId) {
    redirect("/login");
  }

  const role = (session.user as any).role as Role;
  const isSuperAdmin = (session.user as any).isSuperAdmin;

  // Only SUPER_ADMIN, ADMIN or isSuperAdmin can access
  if (role !== Role.SUPER_ADMIN && role !== Role.ADMIN && !isSuperAdmin) {
    redirect("/dashboard");
  }

  const companyId = session.user.activeCompanyId;

  // Fetch counts for admin overview cards
  const [
    pendingApprovals,
    pendingRegistrations,
    totalUsers,
    activeUsers,
  ] = await Promise.all([
    db.approvalRequest.count({
      where: { companyId, status: "PENDING" },
    }),
    isSuperAdmin
      ? db.user.count({ where: { status: "PENDING" } })
      : Promise.resolve(0),
    isSuperAdmin
      ? db.user.count()
      : Promise.resolve(0),
    isSuperAdmin
      ? db.user.count({ where: { status: "ACTIVE" } })
      : Promise.resolve(0),
  ]);

  // Fetch full data for components
  let requests: any[] = [];
  if (role === Role.SUPER_ADMIN || isSuperAdmin) {
    requests = await db.approvalRequest.findMany({
      where: { companyId },
      include: {
        requestedBy: { select: { name: true, email: true } },
        reviewedBy: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  } else if (role === Role.ADMIN) {
    requests = await db.approvalRequest.findMany({
      where: { companyId, requestedById: session.user.id },
      include: {
        requestedBy: { select: { name: true, email: true } },
        reviewedBy: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  let registrations: any[] = [];
  let registrationCompanies: any[] = [];
  if (isSuperAdmin) {
    registrations = await db.user.findMany({
      where: {
        OR: [
          { status: "PENDING" },
          { status: "REJECTED" },
        ],
      },
      orderBy: { id: "desc" },
    });

    registrationCompanies = await db.company.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
  }

  let activeUsersList: any[] = [];
  let userCompanies: any[] = [];
  if (isSuperAdmin) {
    activeUsersList = await db.user.findMany({
      where: {
        status: "ACTIVE",
        isSuperAdmin: false,
      },
      include: {
        companyRoles: {
          include: {
            company: true,
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    userCompanies = await db.company.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
  }

  return (
    <AdminPanelClient
      role={role}
      isSuperAdmin={isSuperAdmin}
      currentUserId={session.user.id}
      pendingApprovals={pendingApprovals}
      pendingRegistrations={pendingRegistrations}
      totalUsers={totalUsers}
      activeUsers={activeUsers}
      requests={requests}
      registrations={registrations}
      registrationCompanies={registrationCompanies}
      activeUsersList={activeUsersList}
      userCompanies={userCompanies}
    />
  );
}
