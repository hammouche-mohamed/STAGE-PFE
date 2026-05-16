import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export const config = {
  api: {
    bodyParser: false,
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


    if (!file.type.startsWith("image/") && file.type !== "") {
      console.error(`Upload error: Invalid mime type: ${file.type}`);
      return NextResponse.json({ error: "Only image files are allowed" }, { status: 400 });
    }

    if (file.size > 16 * 1024 * 1024) {
      console.error(`Upload error: File too large: ${file.size}`);
      return NextResponse.json({ error: "File size must be under 16MB" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    try {
      const upload = await prisma.upload.create({
        data: {
          fileName: file.name,
          fileType: file.type || "image/png",
          content: buffer,
        },
      });

      const publicUrl = `/api/uploads/${upload.id}`;

      await prisma.user.update({
        where: { id: session.user.id },
        data: {
          avatarUrl: publicUrl,
          updatedAt: new Date()
        },
      });

      return NextResponse.json({ url: publicUrl });
    } catch (err: any) {
      console.error("Upload error: Database storage failed", err);
      return NextResponse.json({
        error: "Storage failed",
        details: err.message
      }, { status: 500 });
    }
  } catch (error: any) {
    console.error("Avatar upload catch block error:", error);
    return NextResponse.json(
      { error: "Upload failed", message: error.message },
      { status: 500 }
    );
  }
}
