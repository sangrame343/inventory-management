import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { LocationService } from "@/services/location-service";
import { locationSchema } from "@/lib/validations/locations";
import { z } from "zod";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.activeCompanyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const tree = searchParams.get("tree") === "true";
    const isActiveStr = searchParams.get("isActive");
    const isActive = isActiveStr === "true" ? true : isActiveStr === "false" ? false : undefined;

    if (tree) {
      const locations = await LocationService.getLocationTree(session.user.activeCompanyId);
      return NextResponse.json(locations);
    }

    const locations = await LocationService.getLocations(session.user.activeCompanyId, isActive);
    return NextResponse.json(locations);
  } catch (error) {
    console.error("[LOCATIONS_GET]", error);
    return NextResponse.json({ error: "Failed to fetch locations" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.activeCompanyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const validated = locationSchema.parse(body);

    const location = await LocationService.createLocation(
      {
        ...validated,
        companyId: session.user.activeCompanyId,
      },
      session.user.activeCompanyId
    );

    return NextResponse.json(location, { status: 201 });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }

    // Handle Prisma unique constraint violations
    if (error.code === "P2002") {
      const field = error.meta?.target?.[0] || "field";
      return NextResponse.json(
        { error: `A location with this ${field} already exists.` },
        { status: 409 }
      );
    }

    console.error("[LOCATIONS_POST]", error);
    return NextResponse.json({ error: error.message || "Failed to create location" }, { status: 500 });
  }
}
