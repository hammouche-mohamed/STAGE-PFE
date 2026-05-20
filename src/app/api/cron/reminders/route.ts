import { NextRequest, NextResponse } from 'next/server';
import { DeadlineService } from '@/lib/services/deadline.service';
import { BinomeService } from '@/lib/services/binome.service';
import { NotificationService } from '@/lib/services/notification.service';
import { MiniPresentationService } from '@/lib/services/miniPresentation.service';


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

  // Per-milestone 1d/4h/1h pre-deadline reminders + late-flip on missed
  // deadlines. Each branch is idempotent (timestamped on the row) so calling
  // the cron multiple times in the same window won't double-send.
  try {
    results.milestoneSweep = await MiniPresentationService.runDeadlineSweep();
  } catch (err) {
    results.milestoneSweepError = err instanceof Error ? err.message : 'Unknown error';
    console.error('[CRON] milestone sweep failed:', err);
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
