import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const upload = await prisma.upload.findUnique({
      where: { id },
    });

    if (!upload) {
      return new NextResponse("Not Found", { status: 404 });
    }

    return new NextResponse(upload.content, {
      headers: {
        "Content-Type": upload.fileType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("Upload retrieval failed:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
