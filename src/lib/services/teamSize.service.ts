import prisma from "../prisma";

/**
 * Team-size policy.
 *
 * Teams are built freely (no cap when inviting/joining). The real limit is
 * enforced when a team APPLIES to a topic and when the internship is created,
 * based on that topic:
 *
 *  - PFE, company-proposed   → min(company's maxStudents, Super-Admin PFE limit)
 *  - PFE, student/teacher    → Super-Admin PFE limit
 *  - NORMAL, company-proposed→ company's maxStudents
 *  - NORMAL, student-proposed→ unlimited (the external company signs off)
 *
 * The Super-Admin PFE limit is stored in the existing `MAX_TEAM_SIZE`
 * system setting (no schema change).
 */

const DEFAULT_PFE_LIMIT = 2;

export async function getPfeTeamLimit(): Promise<number> {
  try {
    const row = await prisma.systemSettings.findUnique({
      where: { key: "MAX_TEAM_SIZE" },
    });
    const n = row?.value ? parseInt(row.value, 10) : NaN;
    return Number.isFinite(n) && n > 0 ? n : DEFAULT_PFE_LIMIT;
  } catch {
    return DEFAULT_PFE_LIMIT;
  }
}

interface TopicLike {
  type?: string | null; // topic_type: COMPANY_PROPOSED | STUDENT_PROPOSED
  internshipType?: string | null; // internship_type: PFE | NORMAL
  maxStudents?: number | null;
}

/**
 * Effective max team size for this topic. `null` means unlimited.
 */
export function effectiveTeamCap(
  topic: TopicLike,
  pfeLimit: number,
): number | null {
  const isPFE = topic.internshipType === "PFE";
  const isCompany = topic.type === "COMPANY_PROPOSED";
  const companyMax =
    topic.maxStudents && topic.maxStudents > 0 ? topic.maxStudents : null;

  if (isPFE) {
    // PFE ceiling always applies. If the company also set a max, the
    // smaller of the two wins (Super-Admin can tighten, never loosen).
    if (isCompany && companyMax) return Math.min(companyMax, pfeLimit);
    return pfeLimit;
  }

  if (isCompany) {
    // NORMAL company internship — company decides the size.
    return companyMax ?? 1;
  }

  // NORMAL, student-proposed → unlimited.
  return null;
}

/**
 * Convenience: resolve the cap for a topic in one call.
 */
export async function resolveTeamCap(topic: TopicLike): Promise<number | null> {
  return effectiveTeamCap(topic, await getPfeTeamLimit());
}
