import { NextRequest } from "next/server";
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

// Helper: Draw fields in PDF in columns
const drawField = (page: any, label: string, value: string, x: number, y: number, font: any, boldFont: any) => {
  page.drawText(label, { x, y, size: 8.5, font: boldFont, color: rgb(0.35, 0.4, 0.45) });
  page.drawText(value || "—", { x: x + 100, y, size: 9, font, color: rgb(0.08, 0.1, 0.12) });
};

// Helper: Generate PDF Receipt via pdf-lib
async function generatePDFReceipt(data: {
  companyName: string;
  assetName: string;
  assetCode: string | null;
  assetTag: string;
  brand: string | null;
  model: string | null;
  serialNumber: string | null;
  handoverType: string | null;
  functionalStatus: string | null;
  notes: string | null;
  condition: string | null;
  assignedDate: Date;
  assigneeName: string;
  departmentName: string | null;
  locationName: string | null;
  signerName: string;
  signatureBuffer: Buffer;
  ipAddress: string;
  userAgent: string;
  browserName: string;
  deviceType: string;
  timestamp: Date;
}) {
  const pdfDoc = await PDFDocument.create();
  // Standard A4 size: 595 x 842 points
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

  // Dynamic Header Title: Prioritize Department Name over Company Name (ABPL)
  const headerTitle = (data.departmentName || data.companyName || "Asset Management").toUpperCase();
  page.drawText(headerTitle, {
    x: 45,
    y: 785,
    size: 18,
    font: boldFont,
    color: rgb(1, 1, 1),
  });

  page.drawText(`OFFICIAL ASSET HANDOVER & SIGN-OFF RECEIPT • ${(data.departmentName || "General").toUpperCase()}`, {
    x: 45,
    y: 760,
    size: 10,
    font: font,
    color: rgb(0.7, 0.75, 0.8),
  });

  // Section 1: Assignee Information
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

  const displayAssignee = data.assigneeName.length > 30
    ? data.assigneeName.substring(0, 27) + "..."
    : data.assigneeName;
  drawField(page, "Assignee Name:", displayAssignee, 50, 685, font, boldFont);
  drawField(page, "Department:", data.departmentName || "General", 300, 685, font, boldFont);
  drawField(page, "Assigned Location:", data.locationName || "General Office", 50, 665, font, boldFont);
  drawField(page, "Date Assigned:", data.assignedDate.toLocaleDateString(undefined, { dateStyle: "long" }), 300, 665, font, boldFont);

  // Section 2: Asset Details
  page.drawText("ASSET DETAILS", {
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

  const displayName = data.assetName.length > 30
    ? data.assetName.substring(0, 27) + "..."
    : data.assetName;
  drawField(page, "Asset Name:", displayName, 50, 605, font, boldFont);
  drawField(page, "Asset Tag ID:", data.assetTag, 300, 605, font, boldFont);
  drawField(page, "Asset Code:", data.assetCode || "—", 50, 585, font, boldFont);
  drawField(page, "Brand Name:", data.brand || "—", 300, 585, font, boldFont);
  drawField(page, "Model Number:", data.model || "—", 50, 565, font, boldFont);
  drawField(page, "Serial Number:", data.serialNumber || "—", 300, 565, font, boldFont);

  // Section 3: Handover Details
  page.drawText("HANDOVER & METADATA", {
    x: 50,
    y: 530,
    size: 10,
    font: boldFont,
    color: rgb(0.08, 0.12, 0.18),
  });
  page.drawLine({
    start: { x: 50, y: 522 },
    end: { x: 545, y: 522 },
    thickness: 0.8,
    color: rgb(0.9, 0.92, 0.94),
  });

  drawField(page, "Handover Type:", data.handoverType || "—", 50, 505, font, boldFont);
  drawField(page, "Functional Status:", data.functionalStatus || "—", 300, 505, font, boldFont);
  drawField(page, "Handover Condition:", data.condition || "GOOD", 50, 485, font, boldFont);

  if (data.notes) {
    page.drawText("Handover Notes:", { x: 50, y: 465, size: 8.5, font: boldFont, color: rgb(0.35, 0.4, 0.45) });
    const notesLines = data.notes.match(/.{1,80}/g) || [];
    notesLines.slice(0, 2).forEach((line, idx) => {
      page.drawText(line, { x: 150, y: 465 - idx * 12, size: 8.5, font, color: rgb(0.08, 0.1, 0.12) });
    });
  }

  // Section 4: Compliance & Liability
  page.drawText("COMPLIANCE & LIABILITY AGREEMENT", {
    x: 50,
    y: 410,
    size: 10,
    font: boldFont,
    color: rgb(0.08, 0.12, 0.18),
  });
  page.drawLine({
    start: { x: 50, y: 402 },
    end: { x: 545, y: 402 },
    thickness: 0.8,
    color: rgb(0.9, 0.92, 0.94),
  });

  const statementLines = [
    "By signing below, I confirm that I have received the above asset in good condition and accept",
    "full responsibility for its safe use, security, and return as per company policies. I acknowledge",
    "that any damage or loss due to negligence may make me liable for repair or replacement cost.",
  ];
  statementLines.forEach((line, index) => {
    page.drawText(line, {
      x: 50,
      y: 385 - index * 14,
      size: 9,
      font,
      color: rgb(0.3, 0.35, 0.4),
    });
  });

  // Section 5: Sign-off
  page.drawText("AUTHORIZATION SIGN-OFF", {
    x: 50,
    y: 315,
    size: 10,
    font: boldFont,
    color: rgb(0.08, 0.12, 0.18),
  });
  page.drawLine({
    start: { x: 50, y: 307 },
    end: { x: 545, y: 307 },
    thickness: 0.8,
    color: rgb(0.9, 0.92, 0.94),
  });

  drawField(page, "Authorized Signer:", data.signerName, 50, 290, font, boldFont);
  drawField(page, "Sign-off Timestamp:", data.timestamp.toLocaleString(undefined, { dateStyle: "long", timeStyle: "medium" }), 50, 270, font, boldFont);

  try {
    const signatureImage = await pdfDoc.embedPng(data.signatureBuffer);
    page.drawImage(signatureImage, {
      x: 180,
      y: 200,
      width: 130,
      height: 40,
    });
    page.drawLine({
      start: { x: 180, y: 195 },
      end: { x: 380, y: 195 },
      thickness: 0.5,
      color: rgb(0.6, 0.6, 0.6),
    });
    page.drawText("(Digital Signature)", { x: 180, y: 182, size: 7, font, color: rgb(0.5, 0.5, 0.5) });
  } catch (err) {
    console.error("Error embedding signature in PDF:", err);
    page.drawText("[Signed Digitally]", { x: 180, y: 220, size: 9, font });
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

// GET Handler
export async function GET(
  request: NextRequest,
  props: { params: Promise<{ token: string }> }
) {
  try {
    const params = await props.params;
    const token = params.token;
    if (!token) {
      return Response.json(
        { error: "Invalid or expired acknowledgement link" },
        { status: 400 }
      );
    }

    const tokenHash = hashAcknowledgementToken(token);

    const ack = await db.assetAcknowledgement.findUnique({
      where: { tokenHash },
      include: {
        company: {
          select: {
            name: true,
            logoUrl: true,
          },
        },
        assignment: {
          include: {
            asset: true,
            location: { select: { name: true } },
            department: { select: { name: true } },
            employee: {
              include: {
                department: { select: { name: true } },
              },
            },
          },
        },
      },
    });

    if (!ack) {
      return Response.json(
        { error: "Invalid or expired acknowledgement link" },
        { status: 404 }
      );
    }

    if (ack.status === "ACKNOWLEDGED") {
      return Response.json(
        { error: "This asset has already been acknowledged." },
        { status: 400 }
      );
    }

    if (ack.status === "EXPIRED" || (ack.tokenExpiresAt && ack.tokenExpiresAt < new Date())) {
      if (ack.status !== "EXPIRED") {
        await db.assetAcknowledgement.update({
          where: { id: ack.id },
          data: { status: "EXPIRED" },
        });
      }
      return Response.json(
        { error: "Invalid or expired acknowledgement link" },
        { status: 400 }
      );
    }

    // Resolve department dynamically
    let departmentName = ack.assignment.department?.name || null;
    if (!departmentName && ack.assignment.employee?.department) {
      departmentName = ack.assignment.employee.department.name;
    }

    const locationName = ack.assignment.location?.name || null;

    return Response.json({
      companyName: ack.company.name,
      companyLogoUrl: ack.company.logoUrl,
      assetName: ack.assetNameSnapshot,
      assetCode: ack.assetCodeSnapshot,
      assetTag: ack.assetTagSnapshot,
      condition: ack.conditionSnapshot,
      assignedDate: ack.assignedDateSnapshot,
      assigneeName: ack.assigneeNameSnapshot,
      status: ack.status,
      departmentName,
      locationName,
    });
  } catch (error) {
    console.error("Error in GET API:", error);
    return Response.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}

// POST Handler
export async function POST(
  request: NextRequest,
  props: { params: Promise<{ token: string }> }
) {
  const params = await props.params;
  const token = params.token;
  if (!token) {
    return Response.json(
      { error: "Invalid or expired acknowledgement link" },
      { status: 400 }
    );
  }

  const tokenHash = hashAcknowledgementToken(token);

  // Fetch current acknowledgement entry
  const ack = await db.assetAcknowledgement.findUnique({
    where: { tokenHash },
    include: {
      company: {
        select: {
          name: true,
          logoUrl: true,
        },
      },
      assignment: {
        include: {
          asset: true,
          location: { select: { name: true } },
          department: { select: { name: true } },
          employee: {
            include: {
              department: { select: { name: true } },
            },
          },
        },
      },
    },
  });

  if (!ack) {
    return Response.json(
      { error: "Invalid or expired acknowledgement link" },
      { status: 404 }
    );
  }

  if (ack.status !== "PENDING") {
    return Response.json(
      { error: "This receipt has already been acknowledged or is expired." },
      { status: 400 }
    );
  }

  if (ack.tokenExpiresAt && ack.tokenExpiresAt < new Date()) {
    await db.assetAcknowledgement.update({
      where: { id: ack.id },
      data: { status: "EXPIRED" },
    });
    return Response.json(
      { error: "Invalid or expired acknowledgement link" },
      { status: 400 }
    );
  }

  // Validate request body
  let body;
  try {
    body = await request.json();
  } catch (err) {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { signerName, termsAccepted, signatureDataUrl } = body;
  if (!signerName || !termsAccepted || !signatureDataUrl) {
    return Response.json(
      { error: "All signature fields and terms acceptance are required." },
      { status: 400 }
    );
  }

  // Parse signature base64
  const base64Data = signatureDataUrl.replace(/^data:image\/png;base64,/, "");
  let signatureBuffer: Buffer;
  try {
    signatureBuffer = Buffer.from(base64Data, "base64");
  } catch (e) {
    return Response.json({ error: "Invalid signature format" }, { status: 400 });
  }

  // Parse user agent and metadata
  const userAgentString = request.headers.get("user-agent") || "Unknown User Agent";
  const ipAddress = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "127.0.0.1";
  const { deviceType, browserName } = parseUserAgent(userAgentString);
  const now = new Date();

  // Resolve department dynamically
  let departmentName = ack.assignment.department?.name || null;
  if (!departmentName && ack.assignment.employee?.department) {
    departmentName = ack.assignment.employee.department.name;
  }

  const locationName = ack.assignment.location?.name || null;

  // Define bucket paths
  const sigPath = `signatures/${ack.companyId}/${ack.assignmentId}.png`;
  const pdfPath = `receipts/${ack.companyId}/${ack.assignmentId}.pdf`;

  let uploadedSig = false;
  let uploadedPdf = false;

  try {
    // Generate PDF Receipt
    const pdfBuffer = await generatePDFReceipt({
      companyName: ack.company.name,
      assetName: ack.assetNameSnapshot,
      assetCode: ack.assetCodeSnapshot,
      assetTag: ack.assetTagSnapshot,
      brand: ack.assignment.asset.brand,
      model: ack.assignment.asset.model,
      serialNumber: ack.assignment.asset.serialNumber,
      handoverType: ack.assignment.handoverType,
      functionalStatus: ack.assignment.functionalStatus,
      notes: ack.assignment.notes,
      condition: ack.conditionSnapshot,
      assignedDate: ack.assignedDateSnapshot,
      assigneeName: ack.assigneeNameSnapshot,
      departmentName,
      locationName,
      signerName,
      signatureBuffer,
      ipAddress,
      userAgent: userAgentString,
      browserName,
      deviceType,
      timestamp: now,
    });

    // File Upload Step
    await StorageService.uploadFile("asset-signatures", sigPath, signatureBuffer, "image/png");
    uploadedSig = true;

    await StorageService.uploadFile("asset-receipts", pdfPath, pdfBuffer, "application/pdf");
    uploadedPdf = true;

    const updateData: any = {
      status: "ACKNOWLEDGED",
      usedAt: now,
      signaturePath: sigPath,
      pdfReceiptPath: pdfPath,
      ipAddress,
      userAgent: userAgentString,
      browserName,
      deviceType,
      termsAccepted: true,
      tokenHash: `used_${ack.id}_${crypto.randomBytes(8).toString("hex")}`,
    };

    if (ack.assignment.employeeId) {
      updateData.acknowledgedByName = signerName;
    } else if (ack.assignment.departmentId) {
      updateData.representativeName = signerName;
    }

    // Update Database Transactionally
    await db.$transaction(async (tx) => {
      // Complete acknowledgement
      await tx.assetAcknowledgement.update({
        where: { id: ack.id },
        data: updateData,
      });

      // Update termsAccepted and signature/clearance properties on AssetAssignment
      await tx.assetAssignment.update({
        where: { id: ack.assignmentId },
        data: {
          termsAccepted: true,
          employeeSignatureName: signerName,
        },
      });

      // Log activity
      await tx.activityLog.create({
        data: {
          companyId: ack.companyId,
          userId: null, // Public signed action
          action: "ACKNOWLEDGE_ASSET",
          entity: "AssetAcknowledgement",
          entityId: ack.id,
          details: JSON.stringify({
            assignmentId: ack.assignmentId,
            signerName,
            ipAddress,
            deviceType,
          }),
        },
      });
    });

    return Response.json({ success: true });
  } catch (error: any) {
    console.error("Acknowledgement processing failure, executing rollback:", error);

    // Rollback uploaded files if DB commit failed
    if (uploadedSig) {
      await StorageService.deleteFile("asset-signatures", sigPath);
    }
    if (uploadedPdf) {
      await StorageService.deleteFile("asset-receipts", pdfPath);
    }

    return Response.json(
      { error: error.message || "Failed to process acknowledgement receipt." },
      { status: 500 }
    );
  }
}
