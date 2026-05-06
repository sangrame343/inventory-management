import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { MaintenanceService } from "@/services/maintenance-service";
import { maintenanceScheduleSchema } from "@/lib/validations/maintenance";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.activeCompanyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const schedules = await MaintenanceService.getSchedules(session.user.activeCompanyId);
    return NextResponse.json(schedules);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch schedules" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.activeCompanyId || !session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const validated = maintenanceScheduleSchema.parse(body);

    const schedule = await MaintenanceService.createSchedule(
      validated,
      session.user.activeCompanyId,
      session.user.id
    );

    return NextResponse.json(schedule, { status: 201 });
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: error.message || "Failed to create schedule" }, { status: 500 });
  }
}
