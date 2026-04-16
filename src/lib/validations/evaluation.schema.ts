import { z } from "zod";

export const evaluationSchema = z.object({
  defenseId: z.string().cuid(),
  reportScore: z.number().min(0).max(20),
  technicalScore: z.number().min(0).max(20),
  oralScore: z.number().min(0).max(20),
  companyScore: z.number().min(0).max(20).optional(),
  feedback: z.string().max(2000).optional(),
  isAdvisory: z.boolean().default(false),
});

export type EvaluationInput = z.infer<typeof evaluationSchema>;

export const internshipSchema = z.object({
  topicId: z.string().cuid(),
  teacherId: z.string().cuid(),
  academicYear: z.string(),
  studentIds: z.array(z.string().cuid()).min(1).max(2),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export type InternshipInput = z.infer<typeof internshipSchema>;
