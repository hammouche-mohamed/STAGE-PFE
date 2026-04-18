import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
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

    if (file.size > 16 * 1024 * 1024) {
      return NextResponse.json({ error: "File size must be under 16MB" }, { status: 400 });
    }

    const ext = file.name.split(".").pop() || "png";
    const filename = `avatar-${randomUUID()}.${ext}`;
    const uploadsDir = join(process.cwd(), "public", "uploads");

    await mkdir(uploadsDir, { recursive: true });

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    await writeFile(join(uploadsDir, filename), buffer);

    const publicUrl = `/uploads/${filename}`;

    // Save to user record
    await prisma.user.update({
      where: { id: session.user.id },
      data: { avatarUrl: publicUrl, updatedAt: new Date() },
    });

    return NextResponse.json({ url: publicUrl });
  } catch (error: any) {
    console.error("Avatar upload error:", error);
    return NextResponse.json(
      { error: "Upload failed", message: error.message },
      { status: 500 }
    );
  }
}
