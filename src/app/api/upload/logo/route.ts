import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { randomUUID } from "crypto";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Only image files are allowed" }, { status: 400 });
    }

    if (file.size > 4 * 1024 * 1024) {
      return NextResponse.json({ error: "File size must be under 4MB" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const fileId = randomUUID();
    await prisma.$executeRawUnsafe(
      "INSERT INTO upload (id, fileName, fileType, content) VALUES (?, ?, ?, ?)",
      fileId,
      file.name,
      file.type,
      buffer
    );

    const publicUrl = `/api/files/${fileId}`;

    await prisma.systemSettings.upsert({
      where: { key: "universityLogo" },
      update: { value: publicUrl, updatedAt: new Date() },
      create: {
        id: randomUUID(),
        key: "universityLogo",
        value: publicUrl,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({ url: publicUrl });
  } catch (error: any) {
    console.error("Logo upload error:", error);
    return NextResponse.json(
      { error: "Upload failed", message: error.message },
      { status: 500 }
    );
  }
}
