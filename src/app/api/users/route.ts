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
  const filiereId = searchParams.get("filiereId");
  const search = searchParams.get("search");
  const status = searchParams.get("status");
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "50", 10)));
  const skip = (page - 1) * limit;

  try {
    const isAllFilieres = !filiereId || (typeof filiereId === 'string' && filiereId.toLowerCase() === "all");
    const targetFiliereId = session.user.isSuperAdmin ? (isAllFilieres ? null : filiereId) : session.user.filiereId;

    let allowedUserIds: string[] | null = null;
    
    // If searching by studentId, get userIds from StudentProfile first
    let searchUserIds: string[] | null = null;
    if (search) {
      const matchingProfiles = await prisma.studentProfile.findMany({
        where: { studentId: { contains: search } },
        select: { userId: true }
      });
      if (matchingProfiles.length > 0) {
        searchUserIds = matchingProfiles.map(p => p.userId);
      }
    }

    if (targetFiliereId) {
      const [students, teachers, admins] = await Promise.all([
        prisma.studentProfile.findMany({ where: { filiereId: targetFiliereId }, select: { userId: true } }),
        prisma.teacherProfile.findMany({ where: { filiereId: targetFiliereId }, select: { userId: true } }),
        session.user.isSuperAdmin 
          ? prisma.adminProfile.findMany({ where: { filiereId: targetFiliereId }, select: { userId: true } })
          : Promise.resolve([])
      ]);
      
      allowedUserIds = [
        ...students.map(s => s.userId),
        ...teachers.map(t => t.userId),
        ...admins.map(a => a.userId)
      ];
    } else if (!session.user.isSuperAdmin) {
      // If it's a normal admin without a filiere, they are unassigned and should see no one
      allowedUserIds = ["UNASSIGNED_ADMIN_BLOCK"];
    }

    // NFR-P2: nest profiles directly via Prisma `include` so this is a
    // single round-trip instead of the previous 6 (users + 4 profile tables
    // + a global filiere dump).
    const users = await prisma.user.findMany({
      where: {
        ...(role && { role: role as any }),
        ...(status === "active" ? { isActive: true } : status === "inactive" ? { isActive: false } : {}),
        // If Dept Admin, hide all other Admins
        ...(!session.user.isSuperAdmin && {
          NOT: { role: "ADMIN" }
        }),
        ...(allowedUserIds ? { id: { in: allowedUserIds } } : {}),
        ...(search ? {
          OR: [
            { name: { contains: search } },
            { email: { contains: search } },
            ...(searchUserIds ? [{ id: { in: searchUserIds } }] : [])
          ]
        } : {})
      },
      include: {
        studentprofile: { include: { filiere: { select: { id: true, name: true, code: true } } } },
        teacherprofile: { include: { filiere: { select: { id: true, name: true, code: true } } } },
        companyprofile: true,
        adminprofile: { include: { filiere: { select: { id: true, name: true, code: true } } } },
      },
      orderBy: { name: "asc" },
      take: limit,
      skip: skip,
    });

    // Map schema field names (lowercase) to the camelCase shape the UI expects.
    const safeUsers = users.map((u) => {
      const { password, studentprofile, teacherprofile, companyprofile, adminprofile, ...rest } = u as any;
      return {
        ...rest,
        studentProfile: studentprofile ?? null,
        teacherProfile: teacherprofile ?? null,
        companyProfile: companyprofile ?? null,
        adminProfile: adminprofile ?? null,
      };
    });

    // Filter available teachers if requested
    const finalUsers = isAvailableOnly && role === "TEACHER" 
      ? safeUsers.filter(u => u.teacherProfile?.isAvailable)
      : safeUsers;

    return NextResponse.json({ 
      data: finalUsers,
      pagination: {
        page,
        limit,
        // total is not accurately known without a separate count query, 
        // but for now we return the length of results
        count: finalUsers.length 
      }
    });
  } catch (error: any) {
    console.error("Fetch users failed:", error);
    return NextResponse.json({ error: "An unexpected error occurred while fetching users." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { name, email, password, role, isSuperAdmin, filiereId } = body;

    // Only Super Admins can create other Admins
    if (role === "ADMIN" && !session.user.isSuperAdmin) {
      return NextResponse.json({ error: "Only Super Admins can create other Admins" }, { status: 403 });
    }

    if (password && (password.length < 12 || !/[0-9]/.test(password))) {
      return NextResponse.json({ error: "Password must be at least 12 characters and include at least one number." }, { status: 400 });
    }

    const { default: bcrypt } = await import('bcryptjs');
    const hashedPassword = await bcrypt.hash(password || "ESST2026", 12);

    // Use a transaction to ensure both user and profile are created or neither
    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          role,
          isActive: true,
          mustChangePassword: true,
        },
      });

      if (role === "ADMIN") {
        await tx.adminProfile.create({
          data: {
            userId: newUser.id,
            isSuperAdmin: !!isSuperAdmin,
            filiereId: filiereId || null
          }
        });
      }

      return newUser;
    });

    if (role === "ADMIN") {
      try {
        const { MailService } = await import('@/lib/services/mail.service');
        await MailService.sendAdminInvitation(email, name, password || "ESST2026", !!isSuperAdmin);
      } catch (emailError) {
        console.error("Failed to send admin invitation email:", emailError);
      }
    }

    return NextResponse.json({ data: user });
  } catch (error: any) {
    // Mask raw Prisma errors for security and better UX
    if (error.code === 'P2002') {
      return NextResponse.json({ error: "Email already exists in the system." }, { status: 400 });
    }
    
    console.error("User Creation Error:", error);
    return NextResponse.json({ 
      error: "An unexpected error occurred during account creation. Please try again or contact support." 
    }, { status: 500 });
  }
}
