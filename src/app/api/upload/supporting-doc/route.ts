
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_SIZE = 10 * 1024 * 1024; // Increased to 10 MB to be safe
const ALLOWED = [
  "application/pdf", 
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg", 
  "image/png"
];

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      console.error("[UPLOAD_DOC] Unauthorized access attempt");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      console.error("[UPLOAD_DOC] No file provided in form data");
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }


    if (file.size > MAX_SIZE) {
      console.error(`[UPLOAD_DOC] File too large: ${file.size} > ${MAX_SIZE}`);
      return NextResponse.json({ error: "File exceeds 10 MB limit" }, { status: 400 });
    }

    if (!ALLOWED.includes(file.type)) {
      console.error(`[UPLOAD_DOC] Invalid file type: ${file.type}`);
      return NextResponse.json({ error: "Invalid file type. Allowed: PDF, DOC, DOCX, JPG, PNG" }, { status: 400 });
    }

    const ext = file.name.split(".").pop() ?? "bin";
    const fileName = `${randomUUID()}.${ext}`;
    const uploadDir = join(process.cwd(), "public", "uploads", "supporting-docs");

    try {
      await mkdir(uploadDir, { recursive: true });
    } catch (err: any) {
      console.error("[UPLOAD_DOC] Directory creation failed:", err);
      return NextResponse.json({ error: "Storage configuration error", details: err.message }, { status: 500 });
    }

    try {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const filePath = join(uploadDir, fileName);
      await writeFile(filePath, buffer);
    } catch (err: any) {
      console.error("[UPLOAD_DOC] File write failed:", err);
      return NextResponse.json({ error: "Failed to save file on server", details: err.message }, { status: 500 });
    }

    const url = `/uploads/supporting-docs/${fileName}`;
    return NextResponse.json({ url });
  } catch (error: any) {
    console.error("[UPLOAD_DOC] Catch block error:", error);
    return NextResponse.json({ 
      error: "Upload failed", 
      details: error.message 
    }, { status: 500 });
  }
}
