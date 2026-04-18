import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const type = formData.get("type") as string;
    const internshipId = formData.get("internshipId") as string;

    if (!file || !internshipId) {
      return NextResponse.json({ error: "Missing file or internshipId" }, { status: 400 });
    }

    if (file.size > 16 * 1024 * 1024) {
      return NextResponse.json({ error: "File size must be under 16MB" }, { status: 400 });
    }

    const ext = file.name.split(".").pop() || "pdf";
    const filename = `doc-${randomUUID()}.${ext}`;
    const uploadsDir = join(process.cwd(), "public", "uploads", "documents");

    await mkdir(uploadsDir, { recursive: true });

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    await writeFile(join(uploadsDir, filename), buffer);

    const publicUrl = `/uploads/documents/${filename}`;

    return NextResponse.json({ 
      url: publicUrl,
      name: file.name,
      size: file.size,
    });
  } catch (error: any) {
    console.error("Document upload error:", error);
    return NextResponse.json(
      { error: "Upload failed", message: error.message },
      { status: 500 }
    );
  }
}
