import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { MaintenanceService } from "@/services/maintenance-service";

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.activeCompanyId || !session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tickets = await MaintenanceService.generateTicketsFromSchedules(
      session.user.activeCompanyId,
      session.user.id
    );

    return NextResponse.json({ 
      message: `Successfully generated ${tickets.length} tickets.`,
      count: tickets.length 
    });
  } catch (error: any) {
    console.error("GENERATE_TICKETS_ERROR", error);
    return NextResponse.json({ error: error.message || "Failed to generate tickets" }, { status: 500 });
  }
}
