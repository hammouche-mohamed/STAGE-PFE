import { NextRequest, NextResponse } from 'next/server';
import { DeadlineService } from '@/lib/services/deadline.service';
import { BinomeService } from '@/lib/services/binome.service';

// GET /api/cron/reminders
// Called daily by Vercel Cron (or an external scheduler).
// Protected by CRON_SECRET environment variable.
//
// Add to vercel.json:
// { "crons": [{ "path": "/api/cron/reminders", "schedule": "0 7 * * *" }] }
export async function GET(req: NextRequest) {
  // Verify cron secret to prevent unauthorised calls
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 1. Send deadline reminders (PFE midterm + all-types final)
    const reminderResult = await DeadlineService.sendUpcomingReminders();

    // 2. Expire stale binôme invitations
    const expiredCount = await BinomeService.expireOldInvitations();

    return NextResponse.json({
      ok: true,
      reminders: reminderResult,
      expiredInvitations: expiredCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Cron job failed';
    console.error('[CRON] reminders error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
