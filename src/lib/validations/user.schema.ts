import { z } from "zod";

export const userCreateSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  role: z.enum(["TEACHER", "ADMIN"]),
  // Teacher profile fields
  grade: z.string().optional(),
  speciality: z.string().optional(),
  maxStudents: z.number().min(1).max(20).optional(),
  // Admin flags
  isSuperAdmin: z.boolean().optional(),
});

export type UserCreateInput = z.infer<typeof userCreateSchema>;

export const userUpdateSchema = z.object({
  name: z.string().min(2).optional(),
  isActive: z.boolean().optional(),
  grade: z.string().optional(),
  speciality: z.string().optional(),
  maxStudents: z.number().min(1).max(20).optional(),
});

export type UserUpdateInput = z.infer<typeof userUpdateSchema>;
