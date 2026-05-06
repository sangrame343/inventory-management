import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { LocationService } from "@/services/location-service";
import { locationSchema } from "@/lib/validations/locations";
import { z } from "zod";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.activeCompanyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const location = await LocationService.getLocationById(id, session.user.activeCompanyId);
    if (!location) {
      return NextResponse.json({ error: "Location not found" }, { status: 404 });
    }

    const breadcrumbs = await LocationService.getBreadcrumbs(id, session.user.activeCompanyId);

    return NextResponse.json({ ...location, breadcrumbs });
  } catch (error) {
    console.error("[LOCATION_GET]", error);
    return NextResponse.json({ error: "Failed to fetch location" }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.activeCompanyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const validated = locationSchema.parse(body);

    const location = await LocationService.updateLocation(id, session.user.activeCompanyId, validated);
    return NextResponse.json(location);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error("[LOCATION_PATCH]", error);
    return NextResponse.json({ error: error.message || "Failed to update location" }, { status: 500 });
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

    const companyId = session.user.activeCompanyId;
    const existing = await LocationService.getLocationById(id, companyId);
    
    if (!existing) {
      return NextResponse.json({ error: "Location not found" }, { status: 404 });
    }

    let location;
    if (existing.isActive) {
      // Step 1: Soft-delete (Deactivate)
      location = await LocationService.deactivateLocation(id, companyId);
    } else {
      // Step 2: Hard-delete (Permanently Remove)
      location = await LocationService.hardDeleteLocation(id, companyId);
    }

    return NextResponse.json(location);
  } catch (error: any) {
    // Handle Prisma unique/foreign key constraint violations
    if (error.code === 'P2003') {
      return NextResponse.json(
        { error: "This location has complex historical dependencies (transfers or assignments) that prevent permanent deletion. Please keep it deactivated." },
        { status: 400 }
      );
    }
    console.error("[LOCATION_DELETE]", error);
    return NextResponse.json({ error: error.message || "Failed to process location deletion" }, { status: 500 });
  }
}
