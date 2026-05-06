import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { TransferService } from "@/services/transfer-service";
import { db } from "@/lib/db";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.activeCompanyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const transfer = await db.assetTransfer.findUnique({
      where: { id, companyId: session.user.activeCompanyId },
      include: {
        asset: true,
        fromLocation: true,
        toLocation: true,
        fromEmployee: true,
        toEmployee: true,
        requestedBy: { select: { name: true, email: true } },
        approvedBy: { select: { name: true, email: true } },
        completedBy: { select: { name: true, email: true } },
        updatedBy: { select: { name: true, email: true } },
      },
    });

    if (!transfer) {
      return NextResponse.json({ error: "Transfer not found" }, { status: 404 });
    }

    return NextResponse.json(transfer);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.activeCompanyId || !session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Role check: Only SUPER_ADMIN can edit transfers
    if (session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden: Only SUPER_ADMIN can edit transfers" }, { status: 403 });
    }

    const body = await req.json();
    
    // Transfer fields that can be updated
    const {
      transferType,
      fromLocationId,
      toLocationId,
      fromEmployeeId,
      toEmployeeId,
      reason,
      notes,
      conditionBefore,
      plannedTransferDate,
      expectedReceiptDate,
    } = body;

    const result = await TransferService.updateTransfer(
      id,
      session.user.activeCompanyId,
      session.user.id,
      {
        transferType,
        fromLocationId,
        toLocationId,
        fromEmployeeId,
        toEmployeeId,
        reason,
        notes,
        conditionBefore,
        plannedTransferDate: plannedTransferDate ? new Date(plannedTransferDate) : undefined,
        expectedReceiptDate: expectedReceiptDate ? new Date(expectedReceiptDate) : undefined,
      },
      session.user.role
    );

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
