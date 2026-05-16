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
  // Granting / refusing dashboard access is SuperAdmin-only.
  if (!session || session.user.role !== 'ADMIN' || !session.user.isSuperAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
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

      await NotificationService.clearRelated(id, 'REGISTRATION_REQUEST');

      return NextResponse.json({ message: 'Request rejected successfully' });
    }

    const result = await prisma.$transaction(async (tx) => {
      const existingUser = await tx.user.findUnique({
        where: { email: request.email }
      });

      if (existingUser) {
        throw new Error(`USER_EXISTS:${request.email}`);
      }

      if (request.role === 'STUDENT' && request.studentId) {
        const existingStudent = await tx.studentProfile.findUnique({
          where: { studentId: request.studentId }
        });
        if (existingStudent) {
          throw new Error(`STUDENT_ID_EXISTS:${request.studentId}`);
        }
      }

      let filiereId = null;
      let filiereObj = null;
      if (request.speciality) {
        filiereObj = await tx.filiere.findFirst({
          where: { name: request.speciality }
        });
        if (filiereObj) {
          filiereId = filiereObj.id;
        }
      }

      const user = await tx.user.create({
        data: {
          id: randomUUID(),
          name: request.name,
          email: request.email,
          password: request.password || '',
          role: request.role as any,
          level: request.role === 'STUDENT' ? (request.level as any || null) : null,
          department: filiereObj ? filiereObj.name : null,
          isActive: true,
          mustChangePassword: false,
          updatedAt: new Date(),
        },
      });

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
      }

      await tx.registrationRequest.update({
        where: { id },
        data: { status: 'APPROVED', userId: user.id, reviewedAt: new Date() },
      });

      return user;
    });

    await NotificationService.trigger({
      userId: result.id,
      type: 'REGISTRATION_APPROVED',
      title: 'Registration Approved',
      message:
        'Your account has been approved! You can now log in using your email and the password you set during registration.',
      link: '/login',
      skipEmail: true,
    });

    await AuditService.log({
      userId: session.user.id,
      action: 'REGISTRATION_APPROVED',
      targetType: 'User',
      targetId: result.name,
    });

    MailService.sendStatusUpdate(request.email, request.name, 'APPROVED', adminComment, updatedData, { ...request, role: request.role })
      .catch(e => console.error('Approval mail failed:', e));

    await NotificationService.clearRelated(id, 'REGISTRATION_REQUEST');

    return NextResponse.json({
      message: 'Registration approved and account created successfully',
    });
  } catch (error: any) {
    console.error('Registration review failed:', error);

    if (error.message?.startsWith('USER_EXISTS:')) {
      return NextResponse.json({ error: `A user with email ${error.message.split(':')[1]} already exists in the system.` }, { status: 409 });
    }
    if (error.message?.startsWith('STUDENT_ID_EXISTS:')) {
      return NextResponse.json({ error: `A student with ID ${error.message.split(':')[1]} already exists in the system.` }, { status: 409 });
    }

    return NextResponse.json({
      error: 'An unexpected error occurred while processing this registration. Please try again or contact support.'
    }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session || session.user.role !== 'ADMIN' || !session.user.isSuperAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
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
