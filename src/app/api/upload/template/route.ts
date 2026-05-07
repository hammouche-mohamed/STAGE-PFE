import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

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

    const ext = file.name.split(".").pop() ?? "pdf";
    const fileName = `proposal-form-template.${ext}`;
    const uploadDir = join(process.cwd(), "public", "uploads", "templates");

    await mkdir(uploadDir, { recursive: true });
    const bytes = await file.arrayBuffer();
    await writeFile(join(uploadDir, fileName), Buffer.from(bytes));

    const url = `/uploads/templates/${fileName}`;

    // Persist URL in SystemSettings
    const { default: prisma } = await import("@/lib/prisma");
    await prisma.systemSettings.upsert({
      where: { key: "proposalFormTemplateUrl" },
      update: { value: url, updatedAt: new Date() },
      create: { id: crypto.randomUUID(), key: "proposalFormTemplateUrl", value: url, updatedAt: new Date() },
    });

    return NextResponse.json({ url });
  } catch (error) {
    console.error("Template upload error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
