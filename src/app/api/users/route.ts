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
      orderBy: { name: "asc" },
      take: limit,
      skip: skip,
    });

    // Manually fetch and stitch profiles to bypass missing schema relations
    const userIds = users.map(u => u.id);
    const [studentProfiles, teacherProfiles, companyProfiles, adminProfiles, allFilieres] = await Promise.all([
      prisma.studentProfile.findMany({ where: { userId: { in: userIds } } }),
      prisma.teacherProfile.findMany({ where: { userId: { in: userIds } } }),
      prisma.companyProfile.findMany({ where: { userId: { in: userIds } } }),
      prisma.adminProfile.findMany({ where: { userId: { in: userIds } } }),
      prisma.filiere.findMany()
    ]);

    // Stitch together
    const safeUsers = users.map(u => {
      const { password, ...safeUser } = u;
      
      const adminProf = adminProfiles.find(p => p.userId === u.id);
      const teacherProf = teacherProfiles.find(p => p.userId === u.id);
      const studentProf = studentProfiles.find(p => p.userId === u.id);
      
      // Manually attach filiere object if needed by the frontend
      const stitchedAdminProfile = adminProf ? {
        ...adminProf,
        filiere: allFilieres.find(f => f.id === adminProf.filiereId) || null
      } : null;

      const stitchedTeacherProfile = teacherProf ? {
        ...teacherProf,
        filiere: allFilieres.find(f => f.id === teacherProf.filiereId) || null
      } : null;

      const stitchedStudentProfile = studentProf ? {
        ...studentProf,
        filiere: allFilieres.find(f => f.id === studentProf.filiereId) || null
      } : null;

      return {
        ...safeUser,
        studentProfile: stitchedStudentProfile,
        teacherProfile: stitchedTeacherProfile,
        companyProfile: companyProfiles.find(p => p.userId === u.id) || null,
        adminProfile: stitchedAdminProfile,
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
    const hashedPassword = await bcrypt.hash(password || "ESST2026", 10);

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
