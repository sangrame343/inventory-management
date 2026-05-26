import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import { ApprovalList } from "@/components/approvals/approval-list";

export default async function MyRequestsPage() {
  const session = await auth();
  if (!session?.user?.id || !session.user.activeCompanyId) {
    redirect("/login");
  }

  const role = (session.user as any).role as Role;
  if (role !== Role.ADMIN) {
    redirect("/dashboard");
  }

  const requests = await db.approvalRequest.findMany({
    where: {
      companyId: session.user.activeCompanyId,
      requestedById: session.user.id,
    },
    include: {
      requestedBy: {
        select: {
          name: true,
          email: true,
        },
      },
      reviewedBy: {
        select: {
          name: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">My Requests</h2>
      </div>
      
      <ApprovalList initialRequests={requests} currentUserId={session.user.id} isSuperAdmin={false} />
    </div>
  );
}
