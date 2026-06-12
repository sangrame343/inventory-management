import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { StorageService } from "@/lib/storage-service";

export async function GET(request: NextRequest) {
  return handlePurge(request);
}

export async function POST(request: NextRequest) {
  return handlePurge(request);
}

async function handlePurge(request: NextRequest) {
  try {
    // Basic authorization check for cron job
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret) {
      const authHeader = request.headers.get("authorization");
      const xSecret = request.headers.get("x-cron-secret");
      const urlSecret = request.nextUrl.searchParams.get("secret");

      const isAuthorized =
        authHeader === `Bearer ${cronSecret}` ||
        xSecret === cronSecret ||
        urlSecret === cronSecret;

      if (!isAuthorized) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const now = new Date();

    // 1. Transition archives to deleted status after 60 days
    const archiveCutoff = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    const archivesToTransition = await db.assetAcknowledgement.findMany({
      where: {
        status: "ARCHIVED",
        archivedAt: {
          lte: archiveCutoff,
        },
      },
    });

    for (const archive of archivesToTransition) {
      await db.assetAcknowledgement.update({
        where: { id: archive.id },
        data: {
          status: "DELETED",
          deletedAt: now,
          archivedAt: null,
        },
      });
    }

    // 2. Permanently purge deleted items after 30 days
    const deleteCutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const itemsToPurge = await db.assetAcknowledgement.findMany({
      where: {
        status: "DELETED",
        deletedAt: {
          lte: deleteCutoff,
        },
      },
    });

    let purgedCount = 0;
    for (const item of itemsToPurge) {
      // Delete signature PNG
      if (item.signaturePath) {
        try {
          await StorageService.deleteFile("asset-signatures", item.signaturePath);
        } catch (err) {
          console.error(`Failed to delete signature path ${item.signaturePath} for ack ${item.id}:`, err);
        }
      }

      // Delete receipt PDF
      if (item.pdfReceiptPath) {
        try {
          await StorageService.deleteFile("asset-receipts", item.pdfReceiptPath);
        } catch (err) {
          console.error(`Failed to delete receipt path ${item.pdfReceiptPath} for ack ${item.id}:`, err);
        }
      }

      // Delete the DB record
      await db.assetAcknowledgement.delete({
        where: { id: item.id },
      });
      purgedCount++;
    }

    return NextResponse.json({
      success: true,
      transitioned: archivesToTransition.length,
      purged: purgedCount,
    });
  } catch (error: any) {
    console.error("Purge cron error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to run purge cycle" },
      { status: 500 }
    );
  }
}
