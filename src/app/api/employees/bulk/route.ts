import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.activeCompanyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const companyId = session.user.activeCompanyId;
    const body = await request.json();
    const { ids, type } = body as { ids: string[]; type: "INACTIVE" | "DELETE" };

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "No employee IDs provided" }, { status: 400 });
    }

    if (!["INACTIVE", "DELETE"].includes(type)) {
      return NextResponse.json({ error: "Invalid action type" }, { status: 400 });
    }

    let successCount = 0;
    let blockedCount = 0;
    const details: { name: string; reason: string }[] = [];

    for (const id of ids) {
      const employee = await db.employee.findUnique({
        where: { id },
        include: {
          assignments: {
            where: { returnedAt: null },
          },
        },
      });

      if (!employee || employee.companyId !== companyId) {
        blockedCount++;
        details.push({ name: id, reason: "Employee not found or access denied" });
        continue;
      }

      if (type === "DELETE") {
        // Check for active assignments
        if (employee.assignments.length > 0) {
          blockedCount++;
          details.push({
            name: employee.fullName,
            reason: `Has ${employee.assignments.length} active asset assignment(s). Return assets first.`,
          });
          continue;
        }

        // Check for transfer history
        const transferCount = await db.assetTransfer.count({
          where: {
            OR: [
              { fromEmployeeId: id },
              { toEmployeeId: id },
            ],
          },
        });

        if (transferCount > 0) {
          blockedCount++;
          details.push({
            name: employee.fullName,
            reason: `Part of ${transferCount} transfer record(s). Cannot delete for audit trail.`,
          });
          continue;
        }

        await db.employee.delete({ where: { id } });
        successCount++;
      } else {
        // INACTIVE
        await db.employee.update({
          where: { id },
          data: { status: "INACTIVE" },
        });
        successCount++;
      }
    }

    return NextResponse.json({ successCount, blockedCount, details });
  } catch (error) {
    console.error("[EMPLOYEES_BULK]", error);
    return NextResponse.json(
      { error: "Failed to process bulk action" },
      { status: 500 }
    );
  }
}