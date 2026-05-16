import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: 'alive' });
  } catch (error) {
    return NextResponse.json({ error: 'Ping failed' }, { status: 500 });
  }
}
