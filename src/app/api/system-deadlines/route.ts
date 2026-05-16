import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { randomUUID } from 'crypto';
import { z } from 'zod';

const deadlineSchema = z.object({
  label: z.string().min(3, 'Label must be at least 3 characters'),
  dueDate: z.string().datetime({ message: 'dueDate must be an ISO datetime string' }),
  isActive: z.boolean().default(true),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const deadlines = await prisma.systemDeadline.findMany({
      where: { isActive: true },
      orderBy: { dueDate: 'asc' },
    });

    return NextResponse.json({ data: deadlines });
  } catch {
    return NextResponse.json({ error: 'Fetch failed' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { label, dueDate, isActive } = deadlineSchema.parse(body);

    const deadline = await prisma.systemDeadline.create({
      data: {
        id: randomUUID(),
        label,
        dueDate: new Date(dueDate),
        isActive,
      },
    });

    return NextResponse.json({ data: deadline }, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
