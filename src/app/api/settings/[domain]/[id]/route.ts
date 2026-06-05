import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { SettingsService } from "@/services/settings-service";
import { domainSchemas } from "@/lib/validations/settings";
import { z } from "zod";
import { db } from "@/lib/db";
import { revalidateTag } from "next/cache";

const domainToModel = {
  "asset-categories": "assetCategory",
  "departments": "department",
  "vendors": "vendor",
  "inventory-categories": "inventoryCategory",
  "units-of-measure": "unitOfMeasure",
  "inventory-locations": "inventoryLocation",
} as const;

type Domain = keyof typeof domainToModel;

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ domain: string; id: string }> }
) {
  const { domain: domainParam, id } = await params;
  try {
    const session = await auth();
    const companyId = session?.user?.activeCompanyId;
    if (!companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const domain = domainParam as Domain;
    const model = domainToModel[domain];
    const schema = domainSchemas[domainParam];

    if (!model || !schema) {
      return NextResponse.json({ error: "Invalid domain" }, { status: 400 });
    }

    const body = await req.json();
    const validated = schema.parse(body) as any;

    const updateData = {
      ...validated,
    };

    let item;
    switch (model) {
      case 'department': 
        item = await db.department.update({ where: { id, companyId }, data: updateData });
        break;
      case 'assetCategory': 
        item = await db.assetCategory.update({ where: { id, companyId }, data: updateData });
        break;
      case 'vendor': 
        item = await db.vendor.update({ where: { id, companyId }, data: updateData });
        break;
      case 'inventoryCategory': 
        item = await db.inventoryCategory.update({ where: { id, companyId }, data: updateData });
        break;
      case 'unitOfMeasure': 
        item = await db.unitOfMeasure.update({ where: { id, companyId }, data: updateData });
        break;
      case 'inventoryLocation': 
        item = await db.inventoryLocation.update({ where: { id, companyId }, data: updateData });
        break;
      default:
        throw new Error(`Model ${model} not supported for update.`);
    }

    revalidateTag(`${domainParam}-${companyId}`, 'max');
    return NextResponse.json(item);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    
    if (error.code === 'P2002') {
      const field = error.meta?.target?.[0] || 'name';
      return NextResponse.json({ error: `An item with this ${field} already exists in your company.` }, { status: 409 });
    }

    console.error(`[SETTINGS_DOMAIN_PATCH: ${domainParam}/${id}]`, error);
    return NextResponse.json({ error: error.message || "Failed to update item" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ domain: string; id: string }> }
) {
  const { domain: domainParam, id } = await params;
  try {
    const session = await auth();
    const companyId = session?.user?.activeCompanyId;
    if (!companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const domain = domainParam as Domain;
    const model = domainToModel[domain];

    if (!model) {
      return NextResponse.json({ error: "Invalid domain" }, { status: 400 });
    }

    const item = await SettingsService.processMasterItemDeletion(model, id, companyId);
    revalidateTag(`${domainParam}-${companyId}`, 'max');
    return NextResponse.json(item);
  } catch (error: any) {
    // Handle Prisma unique/foreign key constraint violations
    if (error.code === 'P2003') {
      return NextResponse.json(
        { error: "This item has complex historical dependencies (audit logs or assignments) that prevent permanent deletion. Please keep it deactivated." },
        { status: 400 }
      );
    }
    
    // Map usage validation errors (thrown by service) to 400
    const isValidationError = error.message?.includes("Usage Blocked") || error.message?.includes("Deletion Blocked");
    
    console.error(`[SETTINGS_DOMAIN_DELETE: ${domainParam}/${id}]`, error);
    return NextResponse.json(
      { error: error.message || "Failed to process item deletion" }, 
      { status: isValidationError ? 400 : 500 }
    );
  }
}

