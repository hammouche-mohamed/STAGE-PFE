import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

const EXT_CONTENT_TYPE: Record<string, string> = {
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  svg: "image/svg+xml",
  webp: "image/webp",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  txt: "text/plain",
  zip: "application/zip",
};

function contentTypeFor(name: string | undefined, fallback: string): string {
  const ext = (name?.split(".").pop() || "").toLowerCase();
  return EXT_CONTENT_TYPE[ext] || fallback;
}

// RFC 5987 — safely encode a filename for the Content-Disposition header.
function contentDisposition(name: string | undefined, asAttachment: boolean): string {
  const disposition = asAttachment ? "attachment" : "inline";
  if (!name) return disposition;
  const ascii = name.replace(/[^\x20-\x7E]/g, "_").replace(/"/g, "'");
  const utf8 = encodeURIComponent(name);
  return `${disposition}; filename="${ascii}"; filename*=UTF-8''${utf8}`;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const asAttachment = searchParams.get("download") === "1";
    const overrideName = searchParams.get("name") || undefined;

    const upload = await prisma.upload.findUnique({ where: { id } });

    if (upload) {
      // Prisma `Bytes` come back as a Node Buffer. Returning the Buffer
      // directly can yield an EMPTY response body on some runtimes (the
      // "blank page" symptom), so normalise to a fresh Uint8Array.
      const buf = Buffer.isBuffer(upload.content)
        ? upload.content
        : Buffer.from(upload.content as unknown as ArrayBuffer);
      const body = new Uint8Array(buf);

      const fileName = overrideName || upload.fileName || `file-${id}`;
      const type =
        upload.fileType && upload.fileType.trim()
          ? upload.fileType
          : contentTypeFor(fileName, "application/pdf");

      return new NextResponse(body, {
        headers: {
          "Content-Type": type,
          "Content-Length": String(body.byteLength),
          "Content-Disposition": contentDisposition(fileName, asAttachment),
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      });
    }

    // Legacy fallback: files written to the public/uploads directory.
    try {
      const { readFile } = await import("fs/promises");
      const { join } = await import("path");

      const filePath = join(process.cwd(), "public", "uploads", id);
      const fileBuffer = await readFile(filePath);
      const body = new Uint8Array(fileBuffer);
      const fileName = overrideName || id;

      return new NextResponse(body, {
        headers: {
          "Content-Type": contentTypeFor(id, "application/octet-stream"),
          "Content-Length": String(body.byteLength),
          "Content-Disposition": contentDisposition(fileName, asAttachment),
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      });
    } catch {
      return new NextResponse("File not found", { status: 404 });
    }
  } catch (error) {
    console.error("Upload retrieval failed:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
