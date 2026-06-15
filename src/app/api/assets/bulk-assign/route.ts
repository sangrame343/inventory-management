import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { AssignmentService } from "@/services/assignment-service";
import { z } from "zod";
import { HandoverType, PhysicalCondition, FunctionalStatus, Role } from "@prisma/client";
import { checkPermission } from "@/lib/permissions";
import { ApprovalService } from "@/lib/services/approval-service";
import { db } from "@/lib/db";
import { generateAcknowledgementToken, hashAcknowledgementToken } from "@/lib/crypto-utils";

const bulkAssignSchema = z.object({
  assetIds: z.array(z.string().min(1)).min(1, "At least one asset ID is required"),
  employeeId: z.string().optional(),
  departmentId: z.string().optional(),
  handoverDate: z
    .string()
    .transform((val) => new Date(val))
    .optional(),
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
    const validated = bulkAssignSchema.parse(body);

    if (permission === "REQUIRE_APPROVAL") {
      await ApprovalService.createRequest({
        companyId,
        requestedById: userId,
        module: "ASSET",
        action: "ASSIGN",
        title: `Bulk Assign ${validated.assetIds.length} Assets`,
        summary: `Request to bulk-assign ${validated.assetIds.length} assets`,
        payload: {
          ...validated,
          assignedById: userId,
        },
      });
      return NextResponse.json(
        { message: "Bulk assignment request submitted for approval", pending: true },
        { status: 202 },
      );
    }

    // Assign each asset sequentially to avoid transaction conflicts
    const results: { assetId: string; assignmentId?: string; success: boolean; error?: string; rawAcknowledgementToken?: string }[] = [];

    for (const assetId of validated.assetIds) {
      try {
        const assignment = await AssignmentService.assignAsset(assetId, companyId, {
          employeeId: validated.employeeId,
          departmentId: validated.departmentId,
          assignedById: userId,
          handoverDate: validated.handoverDate,
          notes: validated.notes,
          handoverType: validated.handoverType,
          physicalCondition: validated.physicalCondition,
          functionalStatus: validated.functionalStatus,
          locationId: validated.locationId,
        });
        results.push({
          assetId,
          assignmentId: assignment.id,
          success: true,
          rawAcknowledgementToken: assignment.rawAcknowledgementToken,
        });
      } catch (err: any) {
        results.push({ assetId, success: false, error: err.message });
      }
    }

    const succeeded = results.filter((r) => r.success);
    const failed = results.filter((r) => !r.success);

    // Generate combined batch if any succeeded
    let combinedToken: string | null = null;
    if (succeeded.length > 0 && (validated.employeeId || validated.departmentId)) {
      try {
        const rawToken = generateAcknowledgementToken();
        const tokenHash = hashAcknowledgementToken(rawToken);
        const tokenExpiresAt = new Date();
        tokenExpiresAt.setDate(tokenExpiresAt.getDate() + 7);

        await db.$transaction(async (tx) => {
          const batch = await tx.employeeAssetAcknowledgementBatch.create({
            data: {
              employeeId: validated.employeeId || null,
              departmentId: validated.departmentId || null,
              companyId,
              tokenHash,
              tokenExpiresAt,
              status: "PENDING",
            },
          });

          // Fetch the assets for snapshotting
          const assignmentsWithAssets = await tx.assetAssignment.findMany({
            where: {
              id: { in: succeeded.map((s) => s.assignmentId).filter(Boolean) as string[] },
            },
            include: {
              asset: true,
            },
          });

          const itemData = assignmentsWithAssets.map((assignment) => ({
            batchId: batch.id,
            assignmentId: assignment.id,
            assetId: assignment.assetId,
            assetNameSnapshot: assignment.asset.name,
            assetCodeSnapshot: assignment.asset.assetCode,
            assetTagSnapshot: assignment.asset.assetTag,
            conditionSnapshot: assignment.physicalCondition || "GOOD",
            assignedDateSnapshot: assignment.assignedAt,
          }));

          await tx.employeeAssetAcknowledgementItem.createMany({
            data: itemData,
          });
        });

        combinedToken = rawToken;
      } catch (batchErr) {
        console.error("Failed to generate combined batch:", batchErr);
      }
    }

    return NextResponse.json(
      {
        succeeded: succeeded.length,
        failed: failed.length,
        results,
        // Return all raw tokens so the caller can display acknowledgement links
        tokens: succeeded.map((r) => r.rawAcknowledgementToken).filter(Boolean),
        combinedToken,
      },
      { status: failed.length === results.length ? 500 : 201 },
    );
  } catch (error: any) {
    console.error("Bulk Assign Assets Error:", error);
    if (error.name === "ZodError") {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json(
      { error: error.message || "Failed to bulk assign assets" },
      { status: 500 },
    );
  }
}
