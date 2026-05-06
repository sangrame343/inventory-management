import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { AssignmentService } from "@/services/assignment-service";
import { z } from "zod";

const returnSchema = z.object({
  assetId: z.string().min(1, "Asset ID is required"),
  returnedAt: z.string().transform((val) => new Date(val)).optional(),
  returnCondition: z.string().optional(),
  returnReason: z.string().optional(),
  notes: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.activeCompanyId || !session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const validated = returnSchema.parse(body);

    const assignment = await AssignmentService.returnAsset(
      validated.assetId,
      session.user.activeCompanyId,
      session.user.id,
      validated
    );

    return NextResponse.json(assignment);
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: error.message || "Failed to return asset" }, { status: 500 });
  }
}
