import { NextResponse } from "next/server";
import { getSession, getAuthenticatedEmployee } from "@/lib/auth";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import fs from "fs/promises";
import path from "path";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: { filename: string } }
) {
  try {
    const session = await getSession();
    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const filename = path.basename(params.filename);

    // Privacy check: EMPLOYEE can only view visitor selfie photos for their own visits, never ID photos
    if (session.role === "EMPLOYEE") {
      const employee = await getAuthenticatedEmployee(session.userId);
      if (!employee) {
        return new NextResponse("Forbidden", { status: 403 });
      }
      const matchingSelfie = await db.visitRequest.findFirst({
        where: {
          hostId: employee.id,
          selfiePath: { endsWith: filename },
        },
        select: { id: true },
      });
      if (!matchingSelfie) {
        return new NextResponse("Forbidden", { status: 403 });
      }
    }

    // 1. Serve from PostgreSQL (primary, works seamlessly on Vercel serverless)
    const dbFile = await db.uploadedFile.findUnique({
      where: { filename },
    });

    if (dbFile) {
      return new NextResponse(new Uint8Array(dbFile.data), {
        headers: {
          "Content-Type": dbFile.mimeType,
          "Cache-Control": "private, max-age=86400",
        },
      });
    }

    // 2. Fallback to local uploads directory (for legacy/local files)
    const uploadDir = path.resolve(process.cwd(), env.UPLOAD_DIR);
    const filePath = path.join(uploadDir, filename);

    try {
      const fileBuffer = await fs.readFile(filePath);
      let contentType = "image/jpeg";
      if (filename.endsWith(".png")) contentType = "image/png";
      if (filename.endsWith(".webp")) contentType = "image/webp";

      return new NextResponse(fileBuffer, {
        headers: {
          "Content-Type": contentType,
          "Cache-Control": "private, max-age=86400",
        },
      });
    } catch {
      return new NextResponse("File Not Found", { status: 404 });
    }
  } catch (error) {
    console.error("File serve error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
