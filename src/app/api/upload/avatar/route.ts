import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Increase body size limit for file uploads
export const config = {
  api: {
    bodyParser: false, // Disabling bodyParser for manual handle (though Next 13+ App Router handle this differently)
  },
};

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      console.error("Upload error: No file provided");
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    console.log(`Uploading file: ${file.name}, type: ${file.type}, size: ${file.size}`);

    if (!file.type.startsWith("image/") && file.type !== "") {
      console.error(`Upload error: Invalid mime type: ${file.type}`);
      return NextResponse.json({ error: "Only image files are allowed" }, { status: 400 });
    }

    if (file.size > 16 * 1024 * 1024) {
      console.error(`Upload error: File too large: ${file.size}`);
      return NextResponse.json({ error: "File size must be under 16MB" }, { status: 400 });
    }

    const ext = file.name.split(".").pop() || "png";
    const filename = `avatar-${randomUUID()}.${ext}`;
    const uploadsDir = join(process.cwd(), "public", "uploads");

    try {
      await mkdir(uploadsDir, { recursive: true });
    } catch (err) {
      console.error("Upload error: Failed to create directory", err);
      return NextResponse.json({ error: "Storage error" }, { status: 500 });
    }

    try {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      await writeFile(join(uploadsDir, filename), buffer);
    } catch (err) {
      console.error("Upload error: Failed to write file", err);
      return NextResponse.json({ error: "Write failed" }, { status: 500 });
    }

    const publicUrl = `/uploads/${filename}`;

    // Save to user record
    try {
      const updatedUser = await prisma.user.update({
        where: { id: session.user.id },
        data: { 
          avatarUrl: publicUrl,
          updatedAt: new Date() 
        },
      });
      console.log(`User ${session.user.id} avatar updated to: ${publicUrl}`);
    } catch (err: any) {
      console.error("Upload error: Database update failed", err);
      return NextResponse.json({ 
        error: "Database update failed", 
        details: err.message 
      }, { status: 500 });
    }

    return NextResponse.json({ url: publicUrl });
  } catch (error: any) {
    console.error("Avatar upload catch block error:", error);
    return NextResponse.json(
      { error: "Upload failed", message: error.message },
      { status: 500 }
    );
  }
}
