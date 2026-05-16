import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { randomUUID } from "crypto";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const type = formData.get("type") as string | null;
    const internshipId = formData.get("internshipId") as string | null;

    if (!file || !internshipId || !type) {
      return NextResponse.json(
        { error: "Missing required fields: file, internshipId, and type are all required." },
        { status: 400 },
      );
    }

    const internship = await prisma.internship.findUnique({
      where: { id: internshipId },
      include: { internshipstudent: { select: { studentId: true } } } as any,
    });
    if (!internship) {
      return NextResponse.json({ error: "Internship not found." }, { status: 404 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const upload = await prisma.upload.create({
      data: {
        fileName: file.name,
        fileType: file.type || "application/pdf",
        content: buffer,
      },
    });

    const publicUrl = `/api/uploads/${upload.id}`;


    return NextResponse.json({
      url: publicUrl,
      name: file.name,
      size: file.size,
    });
  } catch (error) {
    console.error("Document upload error:", error);
    return NextResponse.json(
      { error: "Upload failed. Please try again." },
      { status: 500 },
    );
  }
}
