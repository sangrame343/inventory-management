import { NextRequest } from "next/server";
import fs from "fs";
import path from "path";
import { auth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  // 1. Authenticate user (admins only or active user session)
  const session = await auth();
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const bucket = searchParams.get("bucket");
  const filePath = searchParams.get("path");

  if (!bucket || !filePath) {
    return new Response("Missing parameters", { status: 400 });
  }

  // Prevent path traversal attacks
  if (filePath.includes("..") || bucket.includes("..")) {
    return new Response("Forbidden", { status: 403 });
  }

  const localFile = path.join(process.cwd(), "public", "uploads", bucket, filePath);

  if (!fs.existsSync(localFile)) {
    return new Response("File Not Found", { status: 404 });
  }

  const fileBuffer = fs.readFileSync(localFile);
  const contentType = filePath.endsWith(".pdf") ? "application/pdf" : "image/png";

  return new Response(fileBuffer, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `inline; filename="${path.basename(filePath)}"`,
    },
  });
}
