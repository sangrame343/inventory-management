import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { TransferService } from "@/services/transfer-service";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; action: string }> }
) {
  try {
    const { id, action } = await params;
    const session = await auth();
    if (!session?.user?.activeCompanyId || !session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Role check: Only SUPER_ADMIN can manage transfer lifecycle
    if (session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden: Only SUPER_ADMIN can manage transfers" }, { status: 403 });
    }
    const body = await req.json();
    const companyId = session.user.activeCompanyId;
    const userId = session.user.id;

    let result;
    switch (action) {
      case "approve":
        result = await TransferService.approveTransfer(id, companyId, userId);
        break;
      case "reject":
        result = await TransferService.rejectTransfer(id, companyId, userId, body.reason);
        break;
      case "in-transit":
        result = await TransferService.markInTransit(id, companyId, userId);
        break;
      case "complete":
        result = await TransferService.completeTransfer(id, companyId, userId, body);
        break;
      case "cancel":
        result = await TransferService.cancelTransfer(id, companyId, userId);
        break;
      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
