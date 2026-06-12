import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { generateAcknowledgementToken, hashAcknowledgementToken } from "@/lib/crypto-utils";
import { checkPermission } from "@/lib/permissions";
import { Role } from "@prisma/client";

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { assignmentId } = body;

    if (!assignmentId) {
      return NextResponse.json({ error: "Assignment ID is required" }, { status: 400 });
    }

    // Verify the assignment exists in the company
    const assignment = await db.assetAssignment.findFirst({
      where: {
        id: assignmentId,
        companyId,
      },
      include: {
        asset: true,
        employee: true,
        department: true,
      },
    });

    if (!assignment) {
      return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
    }

    // Generate new token
    const rawToken = generateAcknowledgementToken();
    const tokenHash = hashAcknowledgementToken(rawToken);
    const tokenExpiresAt = new Date();
    tokenExpiresAt.setDate(tokenExpiresAt.getDate() + 7); // Reset for 7 days

    // Upsert the acknowledgement record (reset status to PENDING and clear signatures/receipts)
    let assigneeNameSnapshot = "";
    if (assignment.employeeId && assignment.employee) {
      assigneeNameSnapshot = assignment.employee.fullName;
    } else if (assignment.departmentId && assignment.department) {
      assigneeNameSnapshot = assignment.department.name;
    }

    await db.assetAcknowledgement.upsert({
      where: { assignmentId },
      update: {
        tokenHash,
        tokenExpiresAt,
        status: "PENDING",
        usedAt: null,
        signaturePath: null,
        pdfReceiptPath: null,
        acknowledgedByName: null,
        representativeName: null,
        ipAddress: null,
        userAgent: null,
        browserName: null,
        deviceType: null,
        termsAccepted: false,
        assetNameSnapshot: assignment.asset.name,
        assetCodeSnapshot: assignment.asset.assetCode,
        assetTagSnapshot: assignment.asset.assetTag,
        conditionSnapshot: assignment.condition || "GOOD",
        assigneeNameSnapshot,
        assignedDateSnapshot: assignment.assignedAt,
      },
      create: {
        assignmentId,
        companyId,
        tokenHash,
        tokenExpiresAt,
        status: "PENDING",
        assetNameSnapshot: assignment.asset.name,
        assetCodeSnapshot: assignment.asset.assetCode,
        assetTagSnapshot: assignment.asset.assetTag,
        conditionSnapshot: assignment.condition || "GOOD",
        assigneeNameSnapshot,
        assignedDateSnapshot: assignment.assignedAt,
      },
    });

    // Log action
    await db.activityLog.create({
      data: {
        companyId,
        userId: session.user.id,
        action: "REGENERATE_ACKNOWLEDGEMENT_TOKEN",
        entity: "AssetAssignment",
        entityId: assignmentId,
        details: JSON.stringify({
          assignmentId,
        }),
      },
    });

    return NextResponse.json({
      rawAcknowledgementToken: rawToken,
    });
  } catch (error: any) {
    console.error("Token regeneration error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to regenerate token" },
      { status: 500 }
    );
  }
}
