import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { AssignmentService } from "@/services/assignment-service";
import { z } from "zod";
import { HandoverType, PhysicalCondition, FunctionalStatus, Role } from "@prisma/client";
import { checkPermission } from "@/lib/permissions";
import { ApprovalService } from "@/lib/services/approval-service";


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

    const companyId = session.user.activeCompanyId;
    const userId = session.user.id;
    const role = session.user.role as Role;

    const permission = checkPermission(role, "ASSET", "ASSIGN");
    if (permission === "DENY") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }


    const body = await req.json();
    const validated = assignSchema.parse(body);

    if (permission === "REQUIRE_APPROVAL") {
      await ApprovalService.createRequest({
        companyId,
        requestedById: userId,
        module: "ASSET",
        action: "ASSIGN",
        title: `Assign Asset: ${validated.assetId}`,
        summary: `Request to assign asset ${validated.assetId}`,
        targetRecordId: validated.assetId,
        payload: {
          ...validated,
          assignedById: userId,
        },
      });
      return NextResponse.json(
        { message: "Assignment request submitted for approval", pending: true },
        { status: 202 }
      );
    }

    const assignment = await AssignmentService.assignAsset(
      validated.assetId,
      companyId,
      {
        ...validated,
        assignedById: userId,
      }
    );


    return NextResponse.json(assignment, { status: 201 });
  } catch (error: any) {
    console.error("Assign Asset Error:", error);
    if (error.name === "ZodError") {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: error.message || "Failed to assign asset" }, { status: 500 });
  }
}
