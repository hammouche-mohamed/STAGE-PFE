import { z } from "zod";

const RegistrationRole = z.enum(["STUDENT", "COMPANY"]);

export const registrationSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  role: RegistrationRole,
  motivation: z.string().optional(),
  
  // Student specific
  studentId: z.string().optional(),
  promotion: z.string().optional(),
  speciality: z.string().optional(),
  academicYear: z.string().optional(),

  // Company specific
  companyName: z.string().optional(),
  sector: z.string().optional(),
  wilaya: z.string().optional(),
}).refine((data) => {
  if (data.role === "STUDENT") {
    return !!data.studentId && !!data.promotion && !!data.speciality;
  }
  if (data.role === "COMPANY") {
    return !!data.companyName;
  }
  return true;
}, {
  message: "Please fill all required fields for your role",
  path: ["role"], // This is a bit generic but Zod will point to it
});

export type RegistrationInput = z.infer<typeof registrationSchema>;
