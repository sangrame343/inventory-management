import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashAcknowledgementToken } from "@/lib/crypto-utils";
import { StorageService } from "@/lib/storage-service";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import crypto from "crypto";

// Helper: Parse User Agent for Browser and Device
function parseUserAgent(ua: string) {
  let deviceType = "desktop";
  if (/tablet|ipad|playbook|silk/i.test(ua)) {
    deviceType = "tablet";
  } else if (/mobile|iphone|ipod|android|blackberry|iemobile|kindle/i.test(ua)) {
    deviceType = "mobile";
  }

  let browserName = "Other";
  if (/chrome|crios/i.test(ua) && !/edge|edg/i.test(ua) && !/opr|opios/i.test(ua)) {
    browserName = "Chrome";
  } else if (/safari/i.test(ua) && !/chrome|crios/i.test(ua)) {
    browserName = "Safari";
  } else if (/firefox|fxios/i.test(ua)) {
    browserName = "Firefox";
  } else if (/edge|edg/i.test(ua)) {
    browserName = "Edge";
  } else if (/opr|opios/i.test(ua)) {
    browserName = "Opera";
  } else if (/trident|msie/i.test(ua)) {
    browserName = "Internet Explorer";
  }

  return { deviceType, browserName };
}

// Helper: Draw fields in PDF
const drawField = (page: any, label: string, value: string, x: number, y: number, font: any, boldFont: any) => {
  page.drawText(label, { x, y, size: 8.5, font: boldFont, color: rgb(0.35, 0.4, 0.45) });
  page.drawText(value || "—", { x: x + 100, y, size: 9, font, color: rgb(0.08, 0.1, 0.12) });
};

// Helper: Generate Combined PDF Receipt via pdf-lib
async function generateCombinedPDFReceipt(data: {
  companyName: string;
  employeeName: string;
  departmentName: string | null;
  locationName: string | null;
  signerName: string;
  signatureBuffer: Buffer;
  ipAddress: string;
  userAgent: string;
  browserName: string;
  deviceType: string;
  timestamp: Date;
  items: Array<{
    assetNameSnapshot: string;
    assetCodeSnapshot: string | null;
    assetTagSnapshot: string;
    conditionSnapshot: string | null;
    assignedDateSnapshot: Date;
    serialNumber: string;
    locationName: string;
  }>;
}) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Decorative Border
  page.drawRectangle({
    x: 20,
    y: 20,
    width: 555,
    height: 802,
    borderWidth: 1,
    borderColor: rgb(0.85, 0.88, 0.9),
    color: rgb(1, 1, 1),
  });

  // Top header banner background
  page.drawRectangle({
    x: 21,
    y: 740,
    width: 553,
    height: 80,
    color: rgb(0.08, 0.12, 0.18),
  });

  // Use Department Name as the main header title, fallback to General Handover
  const headerTitle = (data.departmentName || "General Handover").toUpperCase();
  page.drawText(headerTitle, {
    x: 45,
    y: 785,
    size: 18,
    font: boldFont,
    color: rgb(1, 1, 1),
  });

  page.drawText(`OFFICIAL COMBINED ASSET HANDOVER & SIGN-OFF RECEIPT • ${(data.departmentName || "General").toUpperCase()}`, {
    x: 45,
    y: 760,
    size: 9,
    font: font,
    color: rgb(0.7, 0.75, 0.8),
  });

  // Section 1: Assignee Details
  page.drawText("ASSIGNEE DETAILS", {
    x: 50,
    y: 710,
    size: 10,
    font: boldFont,
    color: rgb(0.08, 0.12, 0.18),
  });
  page.drawLine({
    start: { x: 50, y: 702 },
    end: { x: 545, y: 702 },
    thickness: 0.8,
    color: rgb(0.9, 0.92, 0.94),
  });

  drawField(page, "Assignee Name:", data.employeeName, 50, 685, font, boldFont);
  drawField(page, "Department:", data.departmentName || "General", 300, 685, font, boldFont);
  drawField(page, "Location:", data.locationName || "General Office", 50, 665, font, boldFont);
  drawField(page, "Date Generated:", data.timestamp.toLocaleDateString("en-IN", { dateStyle: "long", timeZone: "Asia/Kolkata" }), 300, 665, font, boldFont);

  // Section 2: Combined Assets Table
  page.drawText("ASSIGNED ASSETS BATCH", {
    x: 50,
    y: 630,
    size: 10,
    font: boldFont,
    color: rgb(0.08, 0.12, 0.18),
  });
  page.drawLine({
    start: { x: 50, y: 622 },
    end: { x: 545, y: 622 },
    thickness: 0.8,
    color: rgb(0.9, 0.92, 0.94),
  });

  // Table Headers
  const tableY = 605;
  page.drawText("Asset Name", { x: 45, y: tableY, size: 8.5, font: boldFont, color: rgb(0.35, 0.4, 0.45) });
  page.drawText("Asset Tag", { x: 220, y: tableY, size: 8.5, font: boldFont, color: rgb(0.35, 0.4, 0.45) });
  page.drawText("Serial Number", { x: 305, y: tableY, size: 8.5, font: boldFont, color: rgb(0.35, 0.4, 0.45) });
  page.drawText("Location", { x: 400, y: tableY, size: 8.5, font: boldFont, color: rgb(0.35, 0.4, 0.45) });
  page.drawText("Assigned Date", { x: 490, y: tableY, size: 8.5, font: boldFont, color: rgb(0.35, 0.4, 0.45) });

  page.drawLine({
    start: { x: 45, y: tableY - 6 },
    end: { x: 545, y: tableY - 6 },
    thickness: 0.5,
    color: rgb(0.85, 0.88, 0.9),
  });

  // Draw rows
  let rowY = tableY - 20;
  data.items.forEach((item) => {
    // Truncate long asset names if needed to prevent overlap
    const displayName = item.assetNameSnapshot.length > 30 
      ? item.assetNameSnapshot.substring(0, 27) + "..." 
      : item.assetNameSnapshot;

    page.drawText(displayName, { x: 45, y: rowY, size: 7.5, font, color: rgb(0.08, 0.1, 0.12) });
    page.drawText(item.assetTagSnapshot, { x: 220, y: rowY, size: 7.5, font, color: rgb(0.08, 0.1, 0.12) });
    page.drawText(item.serialNumber || "—", { x: 305, y: rowY, size: 7.5, font, color: rgb(0.08, 0.1, 0.12) });
    
    const displayLoc = item.locationName.length > 18
      ? item.locationName.substring(0, 15) + "..."
      : item.locationName;
    page.drawText(displayLoc, { x: 400, y: rowY, size: 7.5, font, color: rgb(0.08, 0.1, 0.12) });
    
    page.drawText(new Date(item.assignedDateSnapshot).toLocaleDateString(), { x: 490, y: rowY, size: 7.5, font, color: rgb(0.08, 0.1, 0.12) });
    rowY -= 15;
  });

  // Compliance Section (adjust y positions dynamically based on items size)
  const complianceY = Math.min(rowY - 15, 430);
  page.drawText("COMPLIANCE & LIABILITY AGREEMENT", {
    x: 50,
    y: complianceY,
    size: 10,
    font: boldFont,
    color: rgb(0.08, 0.12, 0.18),
  });
  page.drawLine({
    start: { x: 50, y: complianceY - 8 },
    end: { x: 545, y: complianceY - 8 },
    thickness: 0.8,
    color: rgb(0.9, 0.92, 0.94),
  });

  const statementLines = [
    "By signing below, I confirm that I have received the assets listed above in good condition and accept",
    "full responsibility for their safe use, security, and return as per company policies. I acknowledge",
    "that any damage or loss due to negligence may make me liable for repair or replacement cost.",
  ];
  statementLines.forEach((line, index) => {
    page.drawText(line, {
      x: 50,
      y: complianceY - 24 - index * 14,
      size: 9,
      font,
      color: rgb(0.3, 0.35, 0.4),
    });
  });

  // Section 5: Sign-off
  const signoffY = complianceY - 80;
  page.drawText("AUTHORIZATION SIGN-OFF", {
    x: 50,
    y: signoffY,
    size: 10,
    font: boldFont,
    color: rgb(0.08, 0.12, 0.18),
  });
  page.drawLine({
    start: { x: 50, y: signoffY - 8 },
    end: { x: 545, y: signoffY - 8 },
    thickness: 0.8,
    color: rgb(0.9, 0.92, 0.94),
  });

  drawField(page, "Authorized Signer:", data.signerName, 50, signoffY - 25, font, boldFont);
  drawField(page, "Sign-off Timestamp:", data.timestamp.toLocaleString("en-IN", { dateStyle: "long", timeStyle: "medium", timeZone: "Asia/Kolkata" }), 50, signoffY - 45, font, boldFont);

  try {
    const signatureImage = await pdfDoc.embedPng(data.signatureBuffer);
    page.drawImage(signatureImage, {
      x: 180,
      y: signoffY - 105,
      width: 130,
      height: 40,
    });
    page.drawLine({
      start: { x: 180, y: signoffY - 110 },
      end: { x: 380, y: signoffY - 110 },
      thickness: 0.5,
      color: rgb(0.6, 0.6, 0.6),
    });
    page.drawText("(Digital Signature)", { x: 180, y: signoffY - 122, size: 7, font, color: rgb(0.5, 0.5, 0.5) });
  } catch (err) {
    console.error("Error embedding signature in PDF:", err);
    page.drawText("[Signed Digitally]", { x: 180, y: signoffY - 85, size: 9, font });
  }

  // Footer: Audit trail
  page.drawRectangle({
    x: 45,
    y: 45,
    width: 505,
    height: 90,
    color: rgb(0.97, 0.98, 0.99),
    borderWidth: 0.5,
    borderColor: rgb(0.9, 0.92, 0.94),
  });

  page.drawText("SECURE AUDIT TRANSACTION LOG", {
    x: 55,
    y: 120,
    size: 8,
    font: boldFont,
    color: rgb(0.4, 0.45, 0.5),
  });

  page.drawText(`IP Address: ${data.ipAddress}`, { x: 55, y: 102, size: 8, font, color: rgb(0.4, 0.45, 0.5) });
  page.drawText(`Web Browser: ${data.browserName} • Device: ${data.deviceType}`, { x: 55, y: 88, size: 8, font, color: rgb(0.4, 0.45, 0.5) });
  
  const uaLines = data.userAgent.match(/.{1,85}/g) || [];
  page.drawText(`User Agent:`, { x: 55, y: 74, size: 8, font: boldFont, color: rgb(0.4, 0.45, 0.5) });
  uaLines.slice(0, 2).forEach((line, index) => {
    page.drawText(line, { x: 120, y: 74 - index * 10, size: 7.5, font, color: rgb(0.5, 0.55, 0.6) });
  });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

// GET Route: Lookup batch details by token
export async function GET(
  request: NextRequest,
  props: { params: Promise<{ token: string }> }
) {
  try {
    const params = await props.params;
    const token = params.token;
    if (!token) {
      return NextResponse.json({ error: "Invalid or expired acknowledgement link" }, { status: 400 });
    }

    const tokenHash = hashAcknowledgementToken(token);

    const batch = await db.employeeAssetAcknowledgementBatch.findUnique({
      where: { tokenHash },
      include: {
        company: {
          select: {
            name: true,
            logoUrl: true,
          },
        },
        employee: {
          select: {
            fullName: true,
            department: { select: { name: true } },
            location: { select: { name: true } },
          },
        },
        items: true,
      },
    });

    if (!batch) {
      return NextResponse.json({ error: "Invalid or expired acknowledgement link" }, { status: 404 });
    }

    if (batch.status === "ACKNOWLEDGED") {
      return NextResponse.json({ error: "This batch has already been acknowledged." }, { status: 400 });
    }

    if (batch.status === "EXPIRED" || batch.tokenExpiresAt < new Date()) {
      if (batch.status !== "EXPIRED") {
        await db.employeeAssetAcknowledgementBatch.update({
          where: { id: batch.id },
          data: { status: "EXPIRED" },
        });
      }
      return NextResponse.json({ error: "Invalid or expired acknowledgement link" }, { status: 400 });
    }

    // Resolve live serial numbers and locations dynamically
    const itemsWithDetails = await Promise.all(
      batch.items.map(async (item) => {
        const assignment = await db.assetAssignment.findUnique({
          where: { id: item.assignmentId },
          include: {
            asset: true,
            location: { select: { name: true } },
          },
        });
        return {
          assetName: item.assetNameSnapshot,
          assetCode: item.assetCodeSnapshot,
          assetTag: item.assetTagSnapshot,
          condition: item.conditionSnapshot,
          assignedDate: item.assignedDateSnapshot,
          serialNumber: assignment?.asset?.serialNumber || "—",
          locationName: assignment?.location?.name || batch.employee.location?.name || "—",
        };
      })
    );

    return NextResponse.json({
      companyName: batch.company.name,
      companyLogoUrl: batch.company.logoUrl,
      employeeName: batch.employee.fullName,
      departmentName: batch.employee.department?.name || null,
      locationName: batch.employee.location?.name || null,
      status: batch.status,
      items: itemsWithDetails,
    });
  } catch (error) {
    console.error("Error in GET API:", error);
    return NextResponse.json({ error: "An unexpected error occurred." }, { status: 500 });
  }
}

// POST Route: Submit signatures and generate combined PDF receipt
export async function POST(
  request: NextRequest,
  props: { params: Promise<{ token: string }> }
) {
  const params = await props.params;
  const token = params.token;
  if (!token) {
    return NextResponse.json({ error: "Invalid or expired acknowledgement link" }, { status: 400 });
  }

  const tokenHash = hashAcknowledgementToken(token);

  // Fetch current batch
  const batch = await db.employeeAssetAcknowledgementBatch.findUnique({
    where: { tokenHash },
    include: {
      company: {
        select: {
          name: true,
          logoUrl: true,
        },
      },
      employee: {
        select: {
          fullName: true,
          department: { select: { name: true } },
          location: { select: { name: true } },
        },
      },
      items: true,
    },
  });

  if (!batch) {
    return NextResponse.json({ error: "Invalid or expired acknowledgement link" }, { status: 404 });
  }

  if (batch.status !== "PENDING") {
    return NextResponse.json({ error: "This batch has already been acknowledged or is expired." }, { status: 400 });
  }

  if (batch.tokenExpiresAt < new Date()) {
    await db.employeeAssetAcknowledgementBatch.update({
      where: { id: batch.id },
      data: { status: "EXPIRED" },
    });
    return NextResponse.json({ error: "Invalid or expired acknowledgement link" }, { status: 400 });
  }

  if (batch.items.length === 0) {
    return NextResponse.json({ error: "Handover batch has no assets to acknowledge." }, { status: 400 });
  }

  let body;
  try {
    body = await request.json();
  } catch (err) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { signerName, termsAccepted, signatureDataUrl } = body;
  if (!signerName || !termsAccepted || !signatureDataUrl) {
    return NextResponse.json({ error: "All signature fields and terms acceptance are required." }, { status: 400 });
  }

  // Parse signature base64
  const base64Data = signatureDataUrl.replace(/^data:image\/png;base64,/, "");
  let signatureBuffer: Buffer;
  try {
    signatureBuffer = Buffer.from(base64Data, "base64");
  } catch (e) {
    return NextResponse.json({ error: "Invalid signature format" }, { status: 400 });
  }

  // Parse user agent and metadata
  const userAgentString = request.headers.get("user-agent") || "Unknown User Agent";
  const ipAddress = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "127.0.0.1";
  const { deviceType, browserName } = parseUserAgent(userAgentString);
  const now = new Date();

  // Define bucket paths
  const sigPath = `signatures/${batch.companyId}/employee_batch_${batch.id}.png`;
  const pdfPath = `receipts/${batch.companyId}/employee_batch_${batch.id}.pdf`;

  let uploadedSig = false;
  let uploadedPdf = false;

  try {
    // Resolve live serial numbers and locations dynamically for PDF generator
    const itemsWithDetails = await Promise.all(
      batch.items.map(async (item) => {
        const assignment = await db.assetAssignment.findUnique({
          where: { id: item.assignmentId },
          include: {
            asset: true,
            location: { select: { name: true } },
          },
        });
        return {
          assetNameSnapshot: item.assetNameSnapshot,
          assetCodeSnapshot: item.assetCodeSnapshot,
          assetTagSnapshot: item.assetTagSnapshot,
          conditionSnapshot: item.conditionSnapshot,
          assignedDateSnapshot: item.assignedDateSnapshot,
          serialNumber: assignment?.asset?.serialNumber || "—",
          locationName: assignment?.location?.name || batch.employee.location?.name || "—",
        };
      })
    );

    // Generate Combined PDF Receipt
    const pdfBuffer = await generateCombinedPDFReceipt({
      companyName: batch.company.name,
      employeeName: batch.employee.fullName,
      departmentName: batch.employee.department?.name || null,
      locationName: batch.employee.location?.name || null,
      signerName,
      signatureBuffer,
      ipAddress,
      userAgent: userAgentString,
      browserName,
      deviceType,
      timestamp: now,
      items: itemsWithDetails,
    });

    // File Upload Step
    await StorageService.uploadFile("asset-signatures", sigPath, signatureBuffer, "image/png");
    uploadedSig = true;

    await StorageService.uploadFile("asset-receipts", pdfPath, pdfBuffer, "application/pdf");
    uploadedPdf = true;

    // Database updates transactionally
    await db.$transaction(async (tx) => {
      // 1. Update batch status
      await tx.employeeAssetAcknowledgementBatch.update({
        where: { id: batch.id },
        data: {
          status: "ACKNOWLEDGED",
          usedAt: now,
          signaturePath: sigPath,
          pdfReceiptPath: pdfPath,
          ipAddress,
          userAgent: userAgentString,
          browserName,
          deviceType,
          termsAccepted: true,
          acknowledgedByName: signerName,
          tokenHash: `used_batch_${batch.id}_${crypto.randomBytes(8).toString("hex")}`,
        },
      });

      // 2. Upsert/Update the corresponding AssetAcknowledgement record for each item
      for (const item of batch.items) {
        // Query assignment details to snapshot properly if creating a new one
        const assignment = await tx.assetAssignment.findUnique({
          where: { id: item.assignmentId },
          include: { asset: true },
        });

        if (assignment) {
          const updateData = {
            status: "ACKNOWLEDGED" as const,
            usedAt: now,
            signaturePath: sigPath,
            pdfReceiptPath: pdfPath,
            ipAddress,
            userAgent: userAgentString,
            browserName,
            deviceType,
            termsAccepted: true,
            acknowledgedByName: signerName,
            tokenHash: `batch_${batch.id}_${item.id}_${crypto.randomBytes(4).toString("hex")}`,
            assetNameSnapshot: item.assetNameSnapshot,
            assetCodeSnapshot: item.assetCodeSnapshot,
            assetTagSnapshot: item.assetTagSnapshot,
            conditionSnapshot: item.conditionSnapshot,
            assigneeNameSnapshot: batch.employee.fullName,
            assignedDateSnapshot: item.assignedDateSnapshot,
          };

          await tx.assetAcknowledgement.upsert({
            where: { assignmentId: item.assignmentId },
            update: updateData,
            create: {
              assignmentId: item.assignmentId,
              companyId: batch.companyId,
              ...updateData,
            },
          });

          // Update AssetAssignment termsAccepted
          await tx.assetAssignment.update({
            where: { id: item.assignmentId },
            data: {
              termsAccepted: true,
              employeeSignatureName: signerName,
            },
          });
        }
      }

      // Log the batch activity
      await tx.activityLog.create({
        data: {
          companyId: batch.companyId,
          userId: null,
          action: "ACKNOWLEDGE_EMPLOYEE_BATCH",
          entity: "EmployeeAssetAcknowledgementBatch",
          entityId: batch.id,
          details: JSON.stringify({
            signerName,
            itemCount: batch.items.length,
          }),
        },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Batch acknowledgement rollback processing:", error);

    if (uploadedSig) {
      await StorageService.deleteFile("asset-signatures", sigPath);
    }
    if (uploadedPdf) {
      await StorageService.deleteFile("asset-receipts", pdfPath);
    }

    return NextResponse.json({ error: error.message || "Failed to submit sign-off." }, { status: 500 });
  }
}
