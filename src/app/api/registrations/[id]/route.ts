import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { AuditService } from '@/lib/services/audit.service';
import { NotificationService } from '@/lib/services/notification.service';
import { MailService } from '@/lib/services/mail.service';
import { randomUUID } from 'crypto';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await req.json();
    const { status, adminComment, updatedData, blockEmail } = body;

    if (!['APPROVED', 'REJECTED'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const request = await prisma.registrationRequest.findUnique({ where: { id } });

    if (!request) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    // If admin modified the data, update the request first
    if (updatedData) {
      await prisma.registrationRequest.update({
        where: { id },
        data: {
          ...updatedData,
        },
      });
      // Refresh request data for user creation
      Object.assign(request, updatedData);
    }

    if (status === 'REJECTED') {
      await prisma.registrationRequest.update({
        where: { id },
        data: { status: 'REJECTED', adminComment, reviewedAt: new Date() },
      });

      if (blockEmail) {
        await (prisma as any).blockedEmail.upsert({
          where: { email: request.email },
          update: { reason: adminComment },
          create: { email: request.email, reason: adminComment },
        });
      }

      await AuditService.log({
        userId: session.user.id,
        action: 'REGISTRATION_REJECTED',
        targetType: 'RegistrationRequest',
        targetId: request.name,
        details: { reason: adminComment, blocked: blockEmail },
      });

      try {
        await MailService.sendStatusUpdate(request.email, request.name, 'REJECTED', adminComment, updatedData, request);
      } catch (e) {
        console.error('Rejection mail failed:', e);
      }

      // Clear original submission notifications
      await NotificationService.clearRelated(id, 'REGISTRATION_REQUEST');

      return NextResponse.json({ message: 'Request rejected successfully' });
    }

    // ── APPROVED ──────────────────────────────────────────────────────────────
    const result = await prisma.$transaction(async (tx) => {
      // 1. Check if user already exists in User table
      const existingUser = await tx.user.findUnique({
        where: { email: request.email }
      });

      if (existingUser) {
        throw new Error(`USER_EXISTS:${request.email}`);
      }

      // 1.5 Check if student ID already exists
      if (request.role === 'STUDENT' && request.studentId) {
        const existingStudent = await tx.studentProfile.findUnique({
          where: { studentId: request.studentId }
        });
        if (existingStudent) {
          throw new Error(`STUDENT_ID_EXISTS:${request.studentId}`);
        }
      }

      // 1.7 Find the filiere by name if speciality is provided
      let filiereId = null;
      if (request.speciality) {
        const filiere = await tx.filiere.findFirst({
          where: { name: request.speciality }
        });
        if (filiere) {
          filiereId = filiere.id;
        }
      }

      // 2. Create User — include level from registration request
      const user = await tx.user.create({
        data: {
          id: randomUUID(),
          name: request.name,
          email: request.email,
          password: request.password || '',
          role: request.role as any,
          // Persist academic level on the User record for fast session lookup
          level: (request.level as any) ?? null,
          department: filiere ? filiere.name : null,
          isActive: true,
          mustChangePassword: false,
          updatedAt: new Date(),
        },
      });

      // 3. Create role-specific profile
      if (request.role === 'STUDENT') {
        await tx.studentProfile.create({
          data: {
            id: randomUUID(),
            userId: user.id,
            studentId: request.studentId || 'PENDING',
            promotion: request.promotion || 'N/A',
            speciality: request.speciality || 'N/A',
            academicYear: request.academicYear || 'N/A',
            filiereId: filiereId,
            // Denormalize level on StudentProfile for fast eligibility queries
            level: (request.level as any) ?? null,
          },
        });
      } else if (request.role === 'TEACHER') {
        await tx.teacherProfile.create({
          data: {
            id: randomUUID(),
            userId: user.id,
            speciality: request.speciality,
            grade: request.grade,
            filiereId: filiereId,
          },
        });
      } else if (request.role === 'COMPANY') {
        await tx.companyProfile.create({
          data: {
            id: randomUUID(),
            userId: user.id,
            companyName: request.companyName || request.name,
            sector: request.sector,
            wilaya: request.wilaya,
          },
        });
        
        // Point 7: Ensure company has a level record for consistency (even if just "N/A")
        await tx.user.update({
          where: { id: user.id },
          data: { level: 'L1' } // Or any default valid for the schema
        });
      }

      // 4. Link and mark request as APPROVED
      await tx.registrationRequest.update({
        where: { id },
        data: { status: 'APPROVED', userId: user.id, reviewedAt: new Date() },
      });

      return user;
    });

    // 5. Welcome notification
    await NotificationService.trigger({
      userId: result.id,
      type: 'REGISTRATION_APPROVED',
      title: 'Registration Approved',
      message:
        'Your account has been approved! You can now log in using your email and the password you set during registration.',
      link: '/login',
    });

    await AuditService.log({
      userId: session.user.id,
      action: 'REGISTRATION_APPROVED',
      targetType: 'User',
      targetId: result.name,
    });

    // 6. Send Approval Email with any modifications (Fire and forget for speed)
    MailService.sendStatusUpdate(request.email, request.name, 'APPROVED', adminComment, updatedData, { ...request, role: request.role })
      .catch(e => console.error('Approval mail failed:', e));

    // 6. Clear original submission notifications for all admins
    await NotificationService.clearRelated(id, 'REGISTRATION_REQUEST');

    return NextResponse.json({
      message: 'Registration approved and account created successfully',
    });
  } catch (error: any) {
    console.error('Registration review failed:', error);
    
    // NFR-SEC1: Hide raw prisma/system errors from user
    if (error.message?.startsWith('USER_EXISTS:')) {
      return NextResponse.json({ error: `A user with email ${error.message.split(':')[1]} already exists in the system.` }, { status: 409 });
    }
    if (error.message?.startsWith('STUDENT_ID_EXISTS:')) {
      return NextResponse.json({ error: `A student with ID ${error.message.split(':')[1]} already exists in the system.` }, { status: 409 });
    }

    // Generic friendly error for everything else
    return NextResponse.json({ 
      error: 'An unexpected error occurred while processing this registration. Please try again or contact support.' 
    }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const request = await prisma.registrationRequest.findUnique({ where: { id } });

    if (!request) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    await prisma.registrationRequest.delete({ where: { id } });

    await AuditService.log({
      userId: session.user.id,
      action: 'REGISTRATION_DELETED',
      targetType: 'RegistrationRequest',
      targetId: request.name,
      details: { email: request.email, status: request.status },
    });

    return NextResponse.json({ message: 'Request deleted successfully' });
  } catch (error: any) {
    console.error('Registration delete failed:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
