import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { domainSchemas } from "@/lib/validations/settings";
import { z } from "zod";
import { db } from "@/lib/db";
import { SettingsService } from "@/services/settings-service";
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

export async function GET(
  req: Request,
  { params }: { params: Promise<{ domain: string }> }
) {
  try {
    const { domain: domainParam } = await params;
    const session = await auth();
    if (!session?.user?.activeCompanyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const domain = domainParam as Domain;
    const model = domainToModel[domain];

    if (!model) {
      return NextResponse.json({ error: "Invalid domain" }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const isActiveStr = searchParams.get("isActive");
    const isActive = isActiveStr === "true" ? true : isActiveStr === "false" ? false : undefined;

    let items;
    const companyId = session.user.activeCompanyId;

    switch (domain) {
      case 'departments': items = await SettingsService.getDepartments(companyId, isActive); break;
      case 'asset-categories': items = await SettingsService.getAssetCategories(companyId, isActive); break;
      case 'vendors': items = await SettingsService.getVendors(companyId, isActive); break;
      case 'inventory-categories': items = await SettingsService.getInventoryCategories(companyId, isActive); break;
      case 'units-of-measure': items = await SettingsService.getUnitsOfMeasure(companyId, isActive); break;
      case 'inventory-locations': items = await SettingsService.getInventoryLocations(companyId, isActive); break;
      default: throw new Error(`Domain ${domain} not supported for fetch.`);
    }

    return NextResponse.json(items);
  } catch (error) {
    console.error(`[SETTINGS_DOMAIN_GET]`, error);
    return NextResponse.json({ error: "Failed to fetch items" }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ domain: string }> }
) {
  try {
    const { domain: domainParam } = await params;
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
    const validated = schema.parse(body);

    // Normalize data: convert empty strings to null for all optional/nullable fields
    const normalizedData: any = { companyId };
    
    for (const [key, value] of Object.entries(validated as Record<string, unknown>)) {
      normalizedData[key] = value === "" ? null : value;
    }

    let item;
    switch (model) {
      case 'department': item = await db.department.create({ data: normalizedData }); break;
      case 'assetCategory': item = await db.assetCategory.create({ data: normalizedData }); break;
      case 'vendor': item = await db.vendor.create({ data: normalizedData }); break;
      case 'inventoryCategory': item = await db.inventoryCategory.create({ data: normalizedData }); break;
      case 'unitOfMeasure': item = await db.unitOfMeasure.create({ data: normalizedData }); break;
      case 'inventoryLocation': item = await db.inventoryLocation.create({ data: normalizedData }); break;
      default: throw new Error(`Model ${model} not supported for creation.`);
    }

    revalidateTag(`${domainParam}-${companyId}`, 'max');
    return NextResponse.json(item, { status: 201 });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    
    if (error.code === 'P2002') {
      const field = error.meta?.target?.[0] || 'name';
      return NextResponse.json({ error: `An item with this ${field} already exists in your company.` }, { status: 409 });
    }

    console.error(`[SETTINGS_DOMAIN_POST]`, error);
    require('fs').writeFileSync('api_error.log', error?.stack || String(error));
    return NextResponse.json({ error: error?.message || "Failed to create item" }, { status: 500 });
  }
}


// DELETE for soft-deactivation (deactivate)
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ domain: string }> } // id is not part of this path
) {
  return NextResponse.json({ error: "Use /[domain]/[id] for specific items" }, { status: 405 });
}
