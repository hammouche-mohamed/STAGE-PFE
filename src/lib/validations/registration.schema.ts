import { z } from 'zod';

const RegistrationRole = z.enum(['STUDENT', 'COMPANY', 'TEACHER']);

// Academic levels for the dual-track eligibility system
const StudentLevel = z.enum(['L1', 'L2', 'L3', 'M1', 'M2']);

export const registrationSchema = z
  .object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Invalid email address'),
    role: RegistrationRole,
    password: z.string().min(12, 'Password must be at least 12 characters'),
    confirmPassword: z.string().min(12, 'Confirmation must be at least 12 characters'),
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
      if (data.role === 'STUDENT') {
        return !!data.studentId && !!data.speciality && !!data.level;
      }
      if (data.role === 'COMPANY') return !!data.companyName;
      if (data.role === 'TEACHER') return !!data.speciality;
      return true;
    },
    {
      message: 'Please fill all required fields for your role',
      path: ['role'],
    },
  )
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type RegistrationInput = z.infer<typeof registrationSchema>;
