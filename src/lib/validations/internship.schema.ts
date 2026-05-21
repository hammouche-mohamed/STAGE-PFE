import { z } from 'zod';

// IDs in this app are produced by `randomUUID()` (UUID v4), not cuid. Using
// `.cuid()` here silently rejected every real id and surfaced the generic
// "Please check your input and try again" error on every "Create Internship"
// click. Accept UUIDs and fall back to a plain non-empty string for safety
// in case any non-standard id format ever sneaks in.
const idSchema = z.string().min(1);

export const internshipSchema = z.object({
  topicId: idSchema,
  /** Required for PFE, optional for NORMAL. The route handler enforces the
   *  per-type rule because Zod can't see the topic.internshipType here. */
  teacherId: idSchema.nullable().optional(),
  academicYear: z.string(),
  studentIds: z.array(idSchema).min(1).max(2),
  // internshipType is inherited from the topic — optional override
  internshipType: z.enum(['PFE', 'NORMAL']).optional(),
});

export type InternshipInput = z.infer<typeof internshipSchema>;
