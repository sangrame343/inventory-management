import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { TransferService } from "@/services/transfer-service";
import { TransferStatus } from "@prisma/client";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.activeCompanyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") as TransferStatus | undefined;
    const assetId = searchParams.get("assetId") || undefined;

    const transfers = await TransferService.getTransfers(session.user.activeCompanyId, {
      status,
      assetId,
    });

    return NextResponse.json(transfers);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.activeCompanyId || !session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const transfer = await TransferService.requestTransfer({
      ...body,
      companyId: session.user.activeCompanyId,
      requestedById: session.user.id,
    });

    return NextResponse.json(transfer, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
