import { z } from 'zod';

const RegistrationRole = z.enum(['STUDENT', 'COMPANY', 'TEACHER']);

// Academic levels for the dual-track eligibility system
const StudentLevel = z.string();

export const registrationSchema = z
  .object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Invalid email address'),
    role: RegistrationRole,
    password: z.string()
      .min(12, 'Password must be at least 12 characters and a number')
      .regex(/[0-9]/, 'Password must be at least 12 characters and a number'),
    confirmPassword: z.string(),

    motivation: z.string().optional(),

    // Student specific
    studentId: z.string().optional(),
    promotion: z.string().optional(),
    speciality: z.string().optional(),
    academicYear: z.string().optional(),
    // Level determines internship type eligibility (L1/L2/M1 → NORMAL only)
    level: StudentLevel.optional(),

    // Company specific
    companyName: z.string().optional(),
    sector: z.string().optional(),
    wilaya: z.string().optional(),

    // Teacher specific
    grade: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.role === 'STUDENT') return !!data.studentId;
      return true;
    },
    {
      message: 'Student ID is required',
      path: ['studentId'],
    },
  )
  .refine(
    (data) => {
      if (data.role === 'STUDENT') return !!data.level;
      return true;
    },
    {
      message: 'Please select an academic level',
      path: ['level'],
    },
  )
  .refine(
    (data) => {
      if (data.role === 'STUDENT' || data.role === 'TEACHER') return !!data.speciality;
      return true;
    },
    {
      message: 'Please select a speciality',
      path: ['speciality'],
    },
  )
  .refine(
    (data) => {
      if (data.role === 'COMPANY') return !!data.companyName;
      return true;
    },
    {
      message: 'Company name is required',
      path: ['companyName'],
    },
  )
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type RegistrationInput = z.infer<typeof registrationSchema>;
