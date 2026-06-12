import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { checkPermission } from "@/lib/permissions";
import { StorageService } from "@/lib/storage-service";
import { Role } from "@prisma/client";

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ assignmentId: string }> }
) {
  try {
    const params = await props.params;
    const assignmentId = params.assignmentId;
    const session = await auth();
    if (!session?.user?.activeCompanyId || !session.user.id) {
      return new Response("Unauthorized", { status: 401 });
    }

    const companyId = session.user.activeCompanyId;
    const role = session.user.role as Role;

    // Verify admin read permissions
    const permission = checkPermission(role, "ASSET", "ASSIGN");
    if (permission === "DENY") {
      return new Response("Forbidden", { status: 403 });
    }

    const ack = await db.assetAcknowledgement.findUnique({
      where: { assignmentId },
    });

    if (!ack || !ack.pdfReceiptPath) {
      return new Response("Acknowledgement PDF receipt not found", { status: 404 });
    }

    // Generate signed URL
    const signedUrl = await StorageService.getSignedUrl(
      "asset-receipts",
      ack.pdfReceiptPath,
      60 // Valid for 60 seconds
    );

    // Redirect the browser directly to the download link
    return NextResponse.redirect(new URL(signedUrl, request.url));
  } catch (error: any) {
    console.error("Receipt download route error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
