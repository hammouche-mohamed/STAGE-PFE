import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // 1. Try to find in Database (New Production Way for Vercel)
    const upload = await prisma.upload.findUnique({
      where: { id },
    });

    if (upload) {
      return new NextResponse(upload.content as any, {
        headers: {
          "Content-Type": upload.fileType,
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      });
    }

    // 2. Fallback to Filesystem (Legacy way, works locally)
    try {
      const { readFile } = await import("fs/promises");
      const { join } = await import("path");
      
      const uploadsDir = join(process.cwd(), "public", "uploads");
      const filePath = join(uploadsDir, id);
      const fileBuffer = await readFile(filePath);
      
      const ext = id.split('.').pop()?.toLowerCase() || '';
      let contentType = "application/octet-stream";
      if (ext === "png") contentType = "image/png";
      if (ext === "jpg" || ext === "jpeg") contentType = "image/jpeg";
      if (ext === "gif") contentType = "image/gif";
      if (ext === "svg") contentType = "image/svg+xml";
      if (ext === "webp") contentType = "image/webp";

      return new NextResponse(fileBuffer as any, {
        headers: {
          "Content-Type": contentType,
          "Cache-Control": "public, max-age=31536000, immutable"
        }
      });
    } catch (fsErr) {
      // If neither DB nor FS works, return 404
      return new NextResponse("Not Found", { status: 404 });
    }
  } catch (error) {
    console.error("Upload retrieval failed:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
