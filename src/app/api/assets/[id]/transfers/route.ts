import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { TransferService } from "@/services/transfer-service";

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

    const history = await TransferService.getAssetTransferHistory(
      id,
      session.user.activeCompanyId
    );

    return NextResponse.json(history);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
