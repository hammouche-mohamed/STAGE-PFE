import { z } from 'zod';

export const internshipSchema = z.object({
  topicId: z.string().cuid(),
  teacherId: z.string().cuid(),
  academicYear: z.string(),
  studentIds: z.array(z.string().cuid()).min(1).max(2),
  // internshipType is inherited from the topic — optional override
  internshipType: z.enum(['PFE', 'NORMAL']).optional(),
});

export type InternshipInput = z.infer<typeof internshipSchema>;
