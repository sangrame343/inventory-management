import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { SettingsService } from "@/services/settings-service";
import { companySettingsSchema } from "@/lib/validations/settings";
import { z } from "zod";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.activeCompanyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const settings = await SettingsService.getSettings(session.user.activeCompanyId);
    return NextResponse.json(settings);
  } catch (error) {
    console.error("[SETTINGS_GET]", error);
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.activeCompanyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const validated = companySettingsSchema.parse(body);

    const settings = await SettingsService.updateSettings(session.user.activeCompanyId, validated);
    return NextResponse.json(settings);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error("[SETTINGS_PATCH]", error);
    return NextResponse.json({ error: error.message || "Failed to update settings" }, { status: 500 });
  }
}
