import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Executes a simple, highly optimized read query to keep the connection alive
    // This counts as a read (not a write), avoiding ISR/Write limits.
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: 'alive' });
  } catch (error) {
    return NextResponse.json({ error: 'Ping failed' }, { status: 500 });
  }
}
