import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || (session.user.role !== "ADMIN" && session.user.role !== "STUDENT")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const role = searchParams.get("role");
  const isAvailableOnly = searchParams.get("available") === "true";

  try {
    const users = await prisma.user.findMany({
      where: {
        ...(role && { role: role as any }),
        ...(isAvailableOnly && role === "TEACHER" && {
          teacherProfile: { isAvailable: true }
        }),
      },
      include: {
        teacherProfile: true,
        studentProfile: true,
        companyProfile: true,
      },
      orderBy: { name: "asc" }
    });

    // Strip sensitive info like passwords
    const safeUsers = users.map(({ password, ...u }) => u);

    return NextResponse.json({ data: safeUsers });
  } catch (error) {
    return NextResponse.json({ error: "Fetch users failed" }, { status: 500 });
  }
}
