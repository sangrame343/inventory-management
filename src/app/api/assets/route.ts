import { NextResponse } from "next/server";
import {
  Prisma,
  AssetStatus,
  HandoverType,
  PhysicalCondition,
  FunctionalStatus,
} from "@prisma/client";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const session = await auth();

    if (!session?.user?.activeCompanyId || !session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const companyId = session.user.activeCompanyId;
    const currentUserId = session.user.id;
    const body = await req.json();

    const {
      assetCode,
      assetTag,
      name,
      model,
      brand,
      serialNumber,
      specifications,
      accessoriesIncluded,
      estimatedReplacementValue,
      attachmentUrl,
      purchaseDate,
      cost,
      usefulLife,
      residualValue,
      status,
      condition,
      categoryId,
      departmentId,
      locationId,
      vendorId,
      warranty,
      warrantyExpiration,
      handover,
    } = body ?? {};

    if (!assetTag || !name || !categoryId) {
      return NextResponse.json(
        { error: "Asset tag, name, and category are required" },
        { status: 400 }
      );
    }

    const normalizedAccessories =
      Array.isArray(accessoriesIncluded)
        ? accessoriesIncluded.map((x) => String(x).trim()).filter(Boolean)
        : typeof accessoriesIncluded === "string" && accessoriesIncluded.trim()
        ? accessoriesIncluded
            .split(",")
            .map((x) => x.trim())
            .filter(Boolean)
        : [];

    const normalizedStatus =
      status && Object.values(AssetStatus).includes(status as AssetStatus)
        ? (status as AssetStatus)
        : (handover?.employeeUserId || handover?.employeeId)
        ? AssetStatus.ASSIGNED
        : AssetStatus.ACTIVE;

    const result = await db.$transaction(async (tx) => {
      const asset = await tx.asset.create({
        data: {
          company: {
            connect: { id: companyId },
          },
          category: {
            connect: { id: categoryId },
          },

          ...(departmentId
            ? {
                department: {
                  connect: { id: departmentId },
                },
              }
            : {}),

          ...(locationId
            ? {
                location: {
                  connect: { id: locationId },
                },
              }
            : {}),

          ...(vendorId
            ? {
                vendor: {
                  connect: { id: vendorId },
                },
              }
            : {}),

          assetCode: assetCode?.trim() || null,
          assetTag: String(assetTag).trim(),
          name: String(name).trim(),
          brand: brand?.trim() || null,
          model: model?.trim() || null,
          serialNumber: serialNumber?.trim() || null,

          specifications: specifications?.trim() || null,
          accessoriesIncluded: normalizedAccessories,
          estimatedReplacementValue:
            estimatedReplacementValue !== null &&
            estimatedReplacementValue !== undefined &&
            estimatedReplacementValue !== ""
              ? Number(estimatedReplacementValue)
              : null,
          attachmentUrl: attachmentUrl?.trim() || null,

          purchaseDate: purchaseDate ? new Date(purchaseDate) : null,
          cost: cost !== null && cost !== undefined && cost !== "" ? Number(cost) : null,
          usefulLife:
            usefulLife !== null && usefulLife !== undefined && usefulLife !== ""
              ? Number(usefulLife)
              : null,
          residualValue:
            residualValue !== null &&
            residualValue !== undefined &&
            residualValue !== ""
              ? Number(residualValue)
              : null,

          status: normalizedStatus,
          condition: condition?.trim() || null,
          warranty: warranty?.trim() || null,
          warrantyExpiration: warrantyExpiration ? new Date(warrantyExpiration) : null,
        },
      });

      let createdAssignment = null;

      if (handover?.employeeUserId || handover?.employeeId || handover?.departmentId) {
        const transactionId = `TXN-${Date.now()}`;

        // Enforce exactly one target in handover
        if (handover.employeeId && handover.departmentId) {
          throw new Error("Cannot assign to both Employee and Department in initial handover");
        }

        // Resolve userId from employeeId if not provided
        let effectiveUserId = handover.employeeUserId;
        if (!effectiveUserId && handover.employeeId) {
          const employee = await tx.employee.findUnique({
            where: { id: handover.employeeId },
            select: { userId: true },
          });
          effectiveUserId = employee?.userId || null;
        }

        createdAssignment = await tx.assetAssignment.create({
          data: {
            companyId,
            assetId: asset.id,
            userId: effectiveUserId || null,
            employeeId: handover.employeeId || null,
            departmentId: handover.departmentId || null,
            assignedById: currentUserId,
            managerUserId: handover.managerUserId || null,

            transactionId,
            assignedAt: handover.handoverDate
              ? new Date(handover.handoverDate)
              : new Date(),
            handoverDate: handover.handoverDate
              ? new Date(handover.handoverDate)
              : null,

            handoverType:
              handover.handoverType &&
              Object.values(HandoverType).includes(handover.handoverType as HandoverType)
                ? (handover.handoverType as HandoverType)
                : null,

            physicalCondition:
              handover.physicalCondition &&
              Object.values(PhysicalCondition).includes(
                handover.physicalCondition as PhysicalCondition
              )
                ? (handover.physicalCondition as PhysicalCondition)
                : null,

            functionalStatus:
              handover.functionalStatus &&
              Object.values(FunctionalStatus).includes(
                handover.functionalStatus as FunctionalStatus
              )
                ? (handover.functionalStatus as FunctionalStatus)
                : null,

            condition: handover.condition?.trim() || null,
            notes: handover.notes?.trim() || null,
            attachmentUrl: handover.attachmentUrl?.trim() || null,
            employeeSignatureName: handover.employeeSignatureName?.trim() || null,
            issuingOfficerName: handover.issuingOfficerName?.trim() || null,
            termsAccepted: Boolean(handover.termsAccepted),
          },
        });

        await tx.asset.update({
          where: { id: asset.id },
          data: { 
            status: AssetStatus.ASSIGNED,
            condition: handover.physicalCondition || undefined
          },
        });
      }

      await tx.activityLog.create({
        data: {
          companyId,
          userId: currentUserId,
          action: createdAssignment ? "CREATE_AND_ASSIGN_ASSET" : "CREATE_ASSET",
          entity: "Asset",
          entityId: asset.id,
          details: JSON.stringify({
            assetTag: asset.assetTag,
            assetCode: asset.assetCode,
            name: asset.name,
            assignedToUserId: createdAssignment?.userId ?? null,
          }),
        },
      });

      return { asset, assignment: createdAssignment };
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error: unknown) {
    console.error("CREATE_ASSET_ERROR", error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        return NextResponse.json(
          { error: "Asset tag, asset code, or transaction ID already exists" },
          { status: 409 }
        );
      }

      return NextResponse.json(
        {
          error: "Database error",
          code: error.code,
          meta: error.meta ?? null,
        },
        { status: 400 }
      );
    }

    if (error instanceof Prisma.PrismaClientValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(
      { error: "Failed to create asset" },
      { status: 500 }
    );
  }
}