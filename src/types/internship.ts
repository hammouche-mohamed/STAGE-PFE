// ─── Internship type system ───────────────────────────────────────────────────

/** The two internship tracks supported by the system */
export type InternshipType = 'PFE' | 'NORMAL';

/** All recognised academic levels */
export type StudentLevel = 'L1' | 'L2' | 'L3' | 'M1' | 'M2';

/**
 * Levels restricted to NORMAL internships only.
 * L1/L2/M1 students cannot see, propose, or apply for PFE topics.
 */
export const NORMAL_ONLY_LEVELS: StudentLevel[] = ['L1', 'L2', 'M1'];

/**
 * Levels eligible for BOTH PFE and NORMAL internships.
 */
export const PFE_ELIGIBLE_LEVELS: StudentLevel[] = ['L3', 'M2'];

/**
 * Returns true if the student's level allows them to apply for the given type.
 * All levels can do NORMAL; only L3 and M2 can do PFE.
 */
export function isEligibleForType(
  level: StudentLevel | null | undefined,
  type: InternshipType,
): boolean {
  if (type === 'NORMAL') return true;
  if (!level) return false;
  return PFE_ELIGIBLE_LEVELS.includes(level);
}

// ─── Internship lifecycle ─────────────────────────────────────────────────────

/**
 * Full internship status flow (both PFE and NORMAL):
 * REQUESTED → DOCUMENT_SENT → IN_PROGRESS → [NEEDS_REVISION ↔ resubmit] → APPROVED → COMPLETED
 */
export type InternshipStatus =
  | 'REQUESTED'
  | 'DOCUMENT_SENT'
  | 'IN_PROGRESS'
  | 'NEEDS_REVISION'
  | 'APPROVED'
  | 'COMPLETED'
  | 'CANCELLED';

/** Human-readable labels for each status */
export const INTERNSHIP_STATUS_LABELS: Record<InternshipStatus, string> = {
  REQUESTED: 'Requested',
  DOCUMENT_SENT: 'Document Sent',
  IN_PROGRESS: 'In Progress',
  NEEDS_REVISION: 'Needs Revision',
  APPROVED: 'Approved',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

// ─── Deadline calculation ─────────────────────────────────────────────────────

/** Result of calculateDeadlines() */
export interface InternshipDeadlines {
  /** NULL for NORMAL internships — midterm is never required, never alerted */
  midtermDeadline: Date | null;
  /** Always set: finalDeadline = endDate − 7 days */
  finalDeadline: Date;
}
