import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { maintenanceScheduleSchema } from "@/lib/validations/maintenance";

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

    const body = await req.json();
    const validated = maintenanceScheduleSchema.partial().parse(body);

    const schedule = await db.maintenanceSchedule.update({
      where: { id, companyId: session.user.activeCompanyId },
      data: validated,
    });

    await db.activityLog.create({
      data: {
        companyId: session.user.activeCompanyId,
        userId: session.user.id,
        action: "UPDATE_MAINTENANCE_SCHEDULE",
        entity: "MaintenanceSchedule",
        entityId: schedule.id,
        details: JSON.stringify({ isActive: schedule.isActive }),
      },
    });

    return NextResponse.json(schedule);
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: error.message || "Failed to update schedule" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.activeCompanyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await db.maintenanceSchedule.delete({
      where: { id, companyId: session.user.activeCompanyId },
    });

    return NextResponse.json({ message: "Schedule deleted" });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete schedule" }, { status: 500 });
  }
}
