import { NextRequest, NextResponse } from 'next/server';
import { DeadlineService } from '@/lib/services/deadline.service';
import { BinomeService } from '@/lib/services/binome.service';
import { NotificationService } from '@/lib/services/notification.service';

/**
 * GET /api/cron/reminders
 *
 * Called daily by Vercel Cron (or an external scheduler).
 * Protected by CRON_SECRET environment variable.
 *
 * vercel.json entry:
 * { "crons": [{ "path": "/api/cron/reminders", "schedule": "0 7 * * *" }] }
 *
 * Jobs executed (all non-fatal — failure of one does not block others):
 *  1. Send upcoming deadline reminders (NFR-P2 deadline tracking)
 *  2. Expire stale binôme invitations
 *  3. NFR-RDI2: Retry failed email notifications from the previous day
 */
export async function GET(req: NextRequest) {
  // NFR-M3: secret read from environment, never hardcoded
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const results: Record<string, unknown> = { timestamp: new Date().toISOString() };

  // 1. Deadline reminders
  try {
    results.reminders = await DeadlineService.sendUpcomingReminders();
  } catch (err) {
    results.remindersError = err instanceof Error ? err.message : 'Unknown error';
    console.error('[CRON] deadline reminders failed:', err);
  }

  // 2. Expire stale binôme invitations
  try {
    results.expiredInvitations = await BinomeService.expireOldInvitations();
  } catch (err) {
    results.expiredInvitationsError = err instanceof Error ? err.message : 'Unknown error';
    console.error('[CRON] binome expiry failed:', err);
  }

  // 3. NFR-RDI2: Retry failed email deliveries
  try {
    results.emailRetriesSucceeded = await NotificationService.retryFailedEmails(50);
  } catch (err) {
    results.emailRetryError = err instanceof Error ? err.message : 'Unknown error';
    console.error('[CRON] email retry failed:', err);
  }

  return NextResponse.json({ ok: true, ...results });
}
