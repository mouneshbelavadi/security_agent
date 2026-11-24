import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 4 * 1024 * 1024; // 4 MB (fits under Vercel's 4.5 MB serverless limit)

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No image file provided" }, { status: 400 });
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Only JPG, PNG, and WebP images are allowed." },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "Image file exceeds maximum allowed size of 4 MB." },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    let ext = ".jpg";
    if (file.type === "image/png") ext = ".png";
    if (file.type === "image/webp") ext = ".webp";

    const randomName = `${crypto.randomUUID()}${ext}`;

    // Store in PostgreSQL so uploads persist across Vercel serverless instances
    await db.uploadedFile.create({
      data: {
        filename: randomName,
        mimeType: file.type,
        data: buffer,
      },
    });

    // Also mirror to local disk during non-Vercel local runs
    if (process.env.VERCEL !== "1") {
      try {
        const uploadDir = path.resolve(process.cwd(), env.UPLOAD_DIR);
        await fs.mkdir(uploadDir, { recursive: true });
        await fs.writeFile(path.join(uploadDir, randomName), buffer);
      } catch {
        // Non-fatal if local filesystem is read-only
      }
    }

    return NextResponse.json({
      success: true,
      filename: randomName,
      path: `/api/uploads/${randomName}`,
    });
  } catch (error) {
    console.error("File upload error:", error);
    return NextResponse.json(
      { error: "Failed to save uploaded image" },
      { status: 500 }
    );
  }
}
