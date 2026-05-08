import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const results = await prisma.$queryRawUnsafe<any[]>(
      "SELECT * FROM upload WHERE id = ?",
      id
    );

    const upload = results[0];

    if (!upload) {
      return new NextResponse("File not found", { status: 404 });
    }

    return new NextResponse(upload.content, {
      headers: {
        "Content-Type": upload.fileType,
        "Content-Disposition": `inline; filename="${upload.fileName}"`,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("File serve error:", error);
    return new NextResponse("Internal server error", { status: 500 });
  }
}
