import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

const MAX_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED = ["application/pdf", "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
    if (file.size > MAX_SIZE) return NextResponse.json({ error: "File exceeds 10 MB limit" }, { status: 400 });
    if (!ALLOWED.includes(file.type)) {
      return NextResponse.json({ error: "Only PDF or DOCX allowed" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Store in DB
    const { default: prisma } = await import("@/lib/prisma");
    const fileId = (await import("crypto")).randomUUID();
    
    await prisma.$executeRawUnsafe(
      "INSERT INTO upload (id, fileName, fileType, content) VALUES (?, ?, ?, ?)",
      fileId,
      file.name,
      file.type,
      buffer
    );

    const url = `/api/files/${fileId}`;

    // Update SystemSettings
    const settingsId = (await import("crypto")).randomUUID();
    await prisma.systemSettings.upsert({
      where: { key: "proposalFormTemplateUrl" },
      update: { value: url, updatedAt: new Date() },
      create: { id: settingsId, key: "proposalFormTemplateUrl", value: url, updatedAt: new Date() },
    });

    return NextResponse.json({ url });
  } catch (error) {
    console.error("Template upload error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
