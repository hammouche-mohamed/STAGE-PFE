import { z } from "zod";

export const topicSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters"),
  description: z.string().min(20, "Description must be at least 20 characters"),
  requiredSkills: z.string().optional(),
  type: z.enum(["STUDENT_PROPOSED", "COMPANY_PROPOSED"]),
  maxStudents: z.number().min(1).max(2).default(1),
  academicYear: z.string(),
  
  // For student proposed
  assignedTeacherId: z.string().optional(),
  partnerId: z.string().optional(), // Second student ID for binôme
  
  // For company proposed
  companyName: z.string().optional(),
});

export type TopicInput = z.infer<typeof topicSchema>;
