import prisma from "../prisma";
import { randomUUID } from "crypto";
import { NotificationService } from "./notification.service";
import { AuditService } from "./audit.service";

/**
 * Archive retention policy.
 *
 * - The Archives interface keeps the 3 most recently archived years.
 * - Archiving a new year pushes the oldest (now 4th) into a 3-day deletion
 *   countdown. During those 3 days the Super Admin is warned daily (in-app
 *   + email) and can still download that year's data from Archives.
 * - After 3 days a cron purges the year's topics, internships and — via DB
 *   cascade — their applications, documents, messages and validations. This
 *   is irreversible. Audit logs are compliance records and are deliberately
 *   EXCLUDED from the purge: they are retained indefinitely.
 *
 * State is stored in SystemSettings JSON (no schema change):
 *   - "archivedYears"        : string[]  (most-recent-first, max 3 visible)
 *   - "pendingYearDeletions" : { year, scheduledDeleteAt }[]
 */

export const RETENTION_VISIBLE_YEARS = 3;
export const DELETION_GRACE_DAYS = 3;

const KEY_ARCHIVED = "archivedYears";
const KEY_PENDING = "pendingYearDeletions";

export interface PendingDeletion {
  year: string;
  scheduledDeleteAt: string; // ISO
}

async function readJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const row = await prisma.systemSettings.findUnique({ where: { key } });
    if (!row?.value) return fallback;
    return JSON.parse(row.value) as T;
  } catch {
    return fallback;
  }
}

async function writeJson(key: string, value: unknown): Promise<void> {
  const now = new Date();
  await prisma.systemSettings.upsert({
    where: { key },
    update: { value: JSON.stringify(value), updatedAt: now },
    create: { id: randomUUID(), key, value: JSON.stringify(value), updatedAt: now },
  });
}

export async function getArchivedYears(): Promise<string[]> {
  return readJson<string[]>(KEY_ARCHIVED, []);
}

export async function getPendingDeletions(): Promise<PendingDeletion[]> {
  return readJson<PendingDeletion[]>(KEY_PENDING, []);
}

export async function setPendingDeletions(list: PendingDeletion[]): Promise<void> {
  await writeJson(KEY_PENDING, list);
}

/**
 * Predict (without writing) which year would be pushed into the deletion
 * countdown if `newYear` were archived now. Returns null if nothing is
 * evicted. Used by the Settings confirm dialog to warn the Super Admin
 * BEFORE they archive.
 */
export async function previewEviction(newYear: string): Promise<string | null> {
  const current = await getArchivedYears();
  const list = [newYear, ...current.filter((y) => y !== newYear)];
  if (list.length <= RETENTION_VISIBLE_YEARS) return null;
  return list[RETENTION_VISIBLE_YEARS] ?? null;
}

/**
 * Record `newYear` as archived and apply the retention policy. Returns the
 * year (if any) that was pushed into the 3-day deletion countdown, plus the
 * scheduled deletion timestamp.
 */
export async function recordArchivedYear(newYear: string): Promise<{
  evictedYear: string | null;
  scheduledDeleteAt: string | null;
}> {
  const current = await getArchivedYears();
  const list = [newYear, ...current.filter((y) => y !== newYear)];

  const evicted: string[] = [];
  while (list.length > RETENTION_VISIBLE_YEARS) {
    const y = list.pop();
    if (y) evicted.push(y);
  }

  await writeJson(KEY_ARCHIVED, list);

  if (evicted.length === 0) {
    return { evictedYear: null, scheduledDeleteAt: null };
  }

  const scheduledDeleteAt = new Date(
    Date.now() + DELETION_GRACE_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();

  const pending = await getPendingDeletions();
  for (const year of evicted) {
    if (!pending.some((p) => p.year === year)) {
      pending.push({ year, scheduledDeleteAt });
    }
  }
  await setPendingDeletions(pending);

  // Only one year is ever evicted per archive in practice.
  return { evictedYear: evicted[0], scheduledDeleteAt };
}

/** Academic-year (Sept → Aug) date window, used to scope audit logs. */
export function academicYearWindow(year: string): { start: Date; end: Date } {
  const [startStr, endStr] = year.split("-");
  const startY = parseInt(startStr, 10);
  const endY = parseInt(endStr, 10);
  // Sept 1 of start year → Sept 1 of end year.
  return {
    start: new Date(Date.UTC(startY, 8, 1, 0, 0, 0)),
    end: new Date(Date.UTC(endY, 8, 1, 0, 0, 0)),
  };
}

/** Super Admin user ids — recipients of deletion warnings. */
export async function getSuperAdminIds(): Promise<string[]> {
  const admins = await prisma.user.findMany({
    where: { role: "ADMIN", adminprofile: { isSuperAdmin: true } } as any,
    select: { id: true },
  });
  return admins.map((a) => a.id);
}

function daysBetween(from: Date, to: Date): number {
  return Math.max(0, Math.ceil((to.getTime() - from.getTime()) / 86_400_000));
}

/**
 * Permanently purge a year's operational data. Irreversible.
 *
 * Thanks to `onDelete: Cascade` on the schema, deleting the year's
 * internships and topics cascades to their InternshipStudent, Document,
 * Message, MiniPresentation, StudentApplication, TeacherApplication and
 * Validation rows.
 *
 * Audit logs are intentionally NOT deleted — they are compliance records
 * kept indefinitely so the full history remains in the archive.
 */
export async function purgeYear(year: string): Promise<{
  topics: number;
  internships: number;
  auditLogs: number;
}> {
  const [internshipsRes, topicsRes] = await prisma.$transaction([
    (prisma as any).internship.deleteMany({ where: { academicYear: year } }),
    (prisma as any).topic.deleteMany({ where: { academicYear: year } }),
  ]);

  return {
    internships: internshipsRes.count ?? 0,
    topics: topicsRes.count ?? 0,
    auditLogs: 0, // audit logs are retained forever, never purged
  };
}

/**
 * Daily cron job: for each year in the deletion countdown either purge it
 * (grace elapsed) or send the Super Admin(s) a fresh warning. Returns a
 * summary for the cron response.
 */
export async function processPendingDeletions(): Promise<{
  purged: { year: string; counts: any }[];
  warned: { year: string; daysLeft: number }[];
}> {
  const pending = await getPendingDeletions();
  if (pending.length === 0) return { purged: [], warned: [] };

  const now = new Date();
  const superAdmins = await getSuperAdminIds();
  const remaining: PendingDeletion[] = [];
  const purged: { year: string; counts: any }[] = [];
  const warned: { year: string; daysLeft: number }[] = [];

  for (const p of pending) {
    const due = new Date(p.scheduledDeleteAt);

    if (now >= due) {
      // Grace elapsed → permanent purge.
      let counts: any = null;
      try {
        counts = await purgeYear(p.year);
        await AuditService.log({
          userId: superAdmins[0] ?? "system",
          action: "YEAR_PURGED",
          targetType: "AcademicYear",
          targetId: p.year,
          details: { year: p.year, ...counts },
        }).catch(() => null);
        await Promise.all(
          superAdmins.map((uid) =>
            NotificationService.trigger({
              userId: uid,
              type: "DEADLINE_OVERDUE",
              title: `Archive of ${p.year} permanently deleted`,
              message:
                `The 3-day grace period ended. All data for ${p.year} ` +
                `(${counts.topics} topics, ${counts.internships} internships) ` +
                `has been permanently deleted and can no longer be recovered.`,
              relatedType: "AcademicYear",
              relatedId: p.year,
            }).catch(() => null),
          ),
        );
        purged.push({ year: p.year, counts });
      } catch (e) {
        console.error(`[purge] failed for ${p.year}:`, e);
        remaining.push(p); // retry next run
      }
    } else {
      // Still in grace → daily reminder.
      const daysLeft = daysBetween(now, due);
      await Promise.all(
        superAdmins.map((uid) =>
          NotificationService.trigger({
            userId: uid,
            type: "DEADLINE_APPROACHING",
            title: `${p.year} archive deletes in ${daysLeft} day(s)`,
            message:
              `The archived data for ${p.year} will be PERMANENTLY DELETED on ` +
              `${due.toLocaleDateString()}. Download it now from Archives — ` +
              `after that it cannot be recovered.`,
            relatedType: "AcademicYear",
            relatedId: p.year,
            link: `/admin/archives?year=${p.year}`,
          }).catch(() => null),
        ),
      );
      warned.push({ year: p.year, daysLeft });
      remaining.push(p);
    }
  }

  await setPendingDeletions(remaining);
  return { purged, warned };
}
