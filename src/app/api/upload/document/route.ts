import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";
import prisma from "@/lib/prisma";

// NFR-S5: Allowlist of accepted MIME types
const ALLOWED_MIME = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/png",
  "image/jpeg",
  "application/zip",
  "text/plain",
]);

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const type = formData.get("type") as string | null;
    const internshipId = formData.get("internshipId") as string | null;

    // NFR-S5: Validate all required fields
    if (!file || !internshipId || !type) {
      return NextResponse.json(
        { error: "Missing required fields: file, internshipId, and type are all required." },
        { status: 400 },
      );
    }

    if (file.size > 16 * 1024 * 1024) {
      return NextResponse.json({ error: "File size must be under 16 MB." }, { status: 400 });
    }

    // NFR-S5: Reject disallowed MIME types
    if (!ALLOWED_MIME.has(file.type)) {
      return NextResponse.json(
        { error: "File type not allowed. Accepted: PDF, Word, PNG, JPEG, ZIP, TXT." },
        { status: 415 },
      );
    }

    // Verify the internship exists and the user belongs to it
    const internship = await prisma.internship.findUnique({
      where: { id: internshipId },
      include: { students: { select: { studentId: true } } },
    });
    if (!internship) {
      return NextResponse.json({ error: "Internship not found." }, { status: 404 });
    }

    const ext = file.name.split(".").pop() || "pdf";
    const filename = `doc-${randomUUID()}.${ext}`;
    const uploadsDir = join(process.cwd(), "public", "uploads", "documents");

    await mkdir(uploadsDir, { recursive: true });

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(join(uploadsDir, filename), buffer);

    const publicUrl = `/uploads/documents/${filename}`;

    // NFR-RDI1: persist the document record to the database
    const document = await prisma.document.create({
      data: {
        id: randomUUID(),
        internshipId,
        uploadedById: session.user.id,
        type: type as never,
        fileName: file.name,
        fileUrl: publicUrl,
        fileSize: file.size,
        status: "UPLOADED",
        uploadedAt: new Date(),
      },
    });

    return NextResponse.json({
      data: document,
      url: publicUrl,
      name: file.name,
      size: file.size,
    });
  } catch (error) {
    console.error("Document upload error:", error);
    // NFR-U2: never expose internal error details to the client
    return NextResponse.json(
      { error: "Upload failed. Please try again." },
      { status: 500 },
    );
  }
}
