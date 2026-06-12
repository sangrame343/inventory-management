import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
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

    const ack = await db.assetAcknowledgement.findUnique({
      where: { assignmentId },
    });

    if (!ack || ack.companyId !== companyId) {
      return NextResponse.json({ error: "Acknowledgement not found" }, { status: 404 });
    }

    // Restore status based on whether it has been signed/used or not
    const targetStatus = ack.usedAt ? "ACKNOWLEDGED" : "PENDING";

    await db.assetAcknowledgement.update({
      where: { assignmentId },
      data: {
        status: targetStatus,
        archivedAt: null,
        deletedAt: null,
      },
    });

    // Log action
    await db.activityLog.create({
      data: {
        companyId,
        userId: session.user.id,
        action: "RESTORED_ACKNOWLEDGEMENT",
        entity: "AssetAcknowledgement",
        entityId: ack.id,
        details: JSON.stringify({ assignmentId, restoredTo: targetStatus }),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Restore error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to restore acknowledgement" },
      { status: 500 }
    );
  }
}
