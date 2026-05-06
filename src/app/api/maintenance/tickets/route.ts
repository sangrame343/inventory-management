import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { MaintenanceService } from "@/services/maintenance-service";
import { maintenanceTicketSchema } from "@/lib/validations/maintenance";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.activeCompanyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const assetId = searchParams.get("assetId");
    const status = searchParams.get("status");

    const filters: any = {};
    if (assetId) filters.assetId = assetId;
    if (status) filters.status = status;

    const tickets = await MaintenanceService.getTickets(session.user.activeCompanyId, filters);
    return NextResponse.json(tickets);
  } catch (error) {
    console.error("GET_TICKETS_ERROR", error);
    return NextResponse.json({ error: "Failed to fetch tickets" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.activeCompanyId || !session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const validated = maintenanceTicketSchema.parse(body);

    const ticket = await MaintenanceService.createTicket(
      validated,
      session.user.activeCompanyId,
      session.user.id
    );

    return NextResponse.json(ticket, { status: 201 });
  } catch (error: any) {
    console.error("POST_TICKET_ERROR", error);
    if (error.name === "ZodError") {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: error.message || "Failed to create ticket" }, { status: 500 });
  }
}
