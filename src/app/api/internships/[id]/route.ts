import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id } = await params;
    const internship = await prisma.internship.findUnique({
      where: { id },
      include: {
        topic: {
          select: {
            title: true,
            description: true,
            companyName: true,
            proposedBy: { select: { name: true } }
          }
        },
        teacher: {
          select: {
            name: true,
            email: true
          }
        },
        students: {
          include: {
            student: {
              select: {
                name: true,
                email: true,
              }
            }
          }
        }
      }
    });

    if (!internship) {
      return NextResponse.json({ error: 'Internship not found' }, { status: 404 });
    }

    return NextResponse.json({ data: internship });
  } catch (error) {
    console.error('Fetch internship detail failed:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
