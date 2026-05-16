import { NextRequest, NextResponse } from 'next/server';
import { DeadlineService } from '@/lib/services/deadline.service';
import { BinomeService } from '@/lib/services/binome.service';
import { NotificationService } from '@/lib/services/notification.service';


export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const results: Record<string, unknown> = { timestamp: new Date().toISOString() };

  try {
    results.reminders = await DeadlineService.sendUpcomingReminders();
  } catch (err) {
    results.remindersError = err instanceof Error ? err.message : 'Unknown error';
    console.error('[CRON] deadline reminders failed:', err);
  }

  try {
    results.expiredInvitations = await BinomeService.expireOldInvitations();
  } catch (err) {
    results.expiredInvitationsError = err instanceof Error ? err.message : 'Unknown error';
    console.error('[CRON] binome expiry failed:', err);
  }

  try {
    results.emailRetriesSucceeded = await NotificationService.retryFailedEmails(50);
  } catch (err) {
    results.emailRetryError = err instanceof Error ? err.message : 'Unknown error';
    console.error('[CRON] email retry failed:', err);
  }

  return NextResponse.json({ ok: true, ...results });
}
