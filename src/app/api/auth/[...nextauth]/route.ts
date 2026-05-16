import { NextRequest, NextResponse } from 'next/server';
import { handlers } from '@/lib/auth';
import { isRateLimited, getClientIp } from '@/lib/utils/rateLimiter';

export const GET = handlers.GET;


export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  if (isRateLimited(`auth:login:${ip}`, 10, 60_000)) {
    return NextResponse.json(
      { error: 'Too many login attempts. Please wait a moment and try again.' },
      { status: 429 },
    );
  }
  return handlers.POST(req);
}
