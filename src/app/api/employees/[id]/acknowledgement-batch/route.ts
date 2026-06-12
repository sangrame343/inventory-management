import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { generateAcknowledgementToken, hashAcknowledgementToken } from "@/lib/crypto-utils";
import { checkPermission } from "@/lib/permissions";
import { Role } from "@prisma/client";

export async function POST(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.activeCompanyId || !session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const companyId = session.user.activeCompanyId;
    const role = session.user.role as Role;

    // Verify admin permissions
    const permission = checkPermission(role, "ASSET", "ASSIGN");
    if (permission === "DENY") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const params = await props.params;
    const employeeId = params.id;

    if (!employeeId) {
      return NextResponse.json({ error: "Employee ID is required" }, { status: 400 });
    }

    // Verify employee exists and belongs to company
    const employee = await db.employee.findFirst({
      where: {
        id: employeeId,
        companyId,
      },
    });

    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    // Fetch active assignments for this employee (returnedAt === null) that are either not acknowledged or pending
    const assignments = await db.assetAssignment.findMany({
      where: {
        employeeId,
        companyId,
        returnedAt: null,
        OR: [
          { acknowledgement: null },
          { acknowledgement: { status: { not: "ACKNOWLEDGED" } } }
        ]
      },
      include: {
        asset: true,
      },
    });

    if (assignments.length === 0) {
      return NextResponse.json({
        error: "No pending asset assignments requiring acknowledgement found for this employee.",
      }, { status: 400 });
    }

    // Cancel any old pending batches for this employee to prevent duplicates
    await db.employeeAssetAcknowledgementBatch.updateMany({
      where: {
        employeeId,
        companyId,
        status: "PENDING",
      },
      data: {
        status: "EXPIRED",
      },
    });

    // Generate token
    const rawToken = generateAcknowledgementToken();
    const tokenHash = hashAcknowledgementToken(rawToken);
    
    // Set 7 days expiry
    const tokenExpiresAt = new Date();
    tokenExpiresAt.setDate(tokenExpiresAt.getDate() + 7);

    // Create batch and batch items in transaction
    const batch = await db.$transaction(async (tx) => {
      const b = await tx.employeeAssetAcknowledgementBatch.create({
        data: {
          employeeId,
          companyId,
          tokenHash,
          tokenExpiresAt,
          status: "PENDING",
        },
      });

      const itemData = assignments.map((assignment) => ({
        batchId: b.id,
        assignmentId: assignment.id,
        assetId: assignment.assetId,
        assetNameSnapshot: assignment.asset.name,
        assetCodeSnapshot: assignment.asset.assetCode,
        assetTagSnapshot: assignment.asset.assetTag,
        conditionSnapshot: assignment.condition || "GOOD",
        assignedDateSnapshot: assignment.assignedAt,
      }));

      await tx.employeeAssetAcknowledgementItem.createMany({
        data: itemData,
      });

      return b;
    });

    // Log the action
    await db.activityLog.create({
      data: {
        companyId,
        userId: session.user.id,
        action: "CREATE_EMPLOYEE_ACKNOWLEDGEMENT_BATCH",
        entity: "EmployeeAssetAcknowledgementBatch",
        entityId: batch.id,
        details: JSON.stringify({
          employeeId,
          itemCount: assignments.length,
        }),
      },
    });

    const link = `/acknowledge/employee/${rawToken}`;

    return NextResponse.json({ link });
  } catch (error: any) {
    console.error("Combined link generation error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate combined handover link" },
      { status: 500 }
    );
  }
}
