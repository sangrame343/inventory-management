import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { AssignmentService } from "@/services/assignment-service";
import { z } from "zod";
import { HandoverType, PhysicalCondition, FunctionalStatus } from "@prisma/client";

const assignSchema = z.object({
  assetId: z.string().min(1, "Asset ID is required"),
  employeeId: z.string().optional(),
  departmentId: z.string().optional(),
  userId: z.string().optional(),
  handoverDate: z.string().transform((val) => new Date(val)).optional(),
  notes: z.string().optional(),
  handoverType: z.nativeEnum(HandoverType).optional(),
  physicalCondition: z.nativeEnum(PhysicalCondition).optional(),
  functionalStatus: z.nativeEnum(FunctionalStatus).optional(),
  locationId: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.activeCompanyId || !session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const validated = assignSchema.parse(body);

    const assignment = await AssignmentService.assignAsset(
      validated.assetId,
      session.user.activeCompanyId,
      {
        ...validated,
        assignedById: session.user.id,
      }
    );

    return NextResponse.json(assignment, { status: 201 });
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: error.message || "Failed to assign asset" }, { status: 500 });
  }
}
