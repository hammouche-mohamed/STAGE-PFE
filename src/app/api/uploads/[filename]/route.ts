import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";

export async function GET(
  req: NextRequest, 
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;
    
    // For security, prevent arbitrary file read
    if (!filename || filename.includes("..") || filename.includes("/")) {
      return NextResponse.json({ error: "Invalid filename" }, { status: 400 });
    }

    const uploadsDir = join(process.cwd(), "public", "uploads");
    const filePath = join(uploadsDir, filename);

    const fileBuffer = await readFile(filePath);
    
    // Determine content type safely
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    let contentType = "application/octet-stream";
    if (ext === "png") contentType = "image/png";
    if (ext === "jpg" || ext === "jpeg") contentType = "image/jpeg";
    if (ext === "gif") contentType = "image/gif";
    if (ext === "svg") contentType = "image/svg+xml";
    if (ext === "webp") contentType = "image/webp";

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable"
      }
    });

  } catch (error) {
    console.error("Error serving uploaded file:", error);
    // Explicitly return 404 block so we don't accidentally fall back to HTML React rendering
    return new NextResponse(null, { status: 404 });
  }
}
