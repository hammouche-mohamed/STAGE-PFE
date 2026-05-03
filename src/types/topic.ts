import type { InternshipType } from './internship';

// ─── Topic origin paths ───────────────────────────────────────────────────────

/**
 * PATH A: Company-proposed topic (company submits through portal, admin validates).
 * PATH B: Student-proposed topic (student found company independently).
 */
export type TopicOrigin = 'COMPANY_PROPOSED' | 'STUDENT_PROPOSED';

// ─── Student proposal (PATH B) input ─────────────────────────────────────────

/** Full data submitted when a student proposes their own topic (PATH B) */
export interface StudentProposedTopicInput {
  title: string;
  description: string;
  requiredSkills?: string;
  internshipType: InternshipType;
  // Company information provided by the student
  companyName: string;
  companySector?: string;
  companyAddress?: string;
  companyCity?: string;
  contactPerson: string;
  contactEmail: string;
  contactPhone?: string;
  /** URL of the uploaded supporting document (company acceptance letter, etc.) */
  supportingDocUrl?: string;
}

// ─── Company topic (PATH A) additions ────────────────────────────────────────

/** Additional field on the existing company topic form */
export interface CompanyTopicTypeAddition {
  internshipType: InternshipType;
}

// ─── Topic status badge colours ───────────────────────────────────────────────

/** Badge variant used by <InternshipTypeBadge /> */
export type TypeBadgeVariant = 'pfe' | 'normal';

export function getTypeBadgeVariant(type: InternshipType | null | undefined): TypeBadgeVariant {
  return type === 'PFE' ? 'pfe' : 'normal';
}
