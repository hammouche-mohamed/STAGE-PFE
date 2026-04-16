"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { registrationSchema, RegistrationInput } from "@/lib/validations/registration.schema";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { toast } from "sonner";
import Link from "next/link";

export default function RegisterPage() {
  const [isLoading, setIsLoading] = useState(false);
  const { register, handleSubmit, watch, formState: { errors } } = useForm<RegistrationInput>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      role: "STUDENT",
    }
  });

  const selectedRole = watch("role");

  const onSubmit = async (data: RegistrationInput) => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/registrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || "Submission failed");
      }

      toast.success(result.message);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-[800px] bg-white border border-gray-200 rounded-md shadow-sm overflow-hidden">
        {/* Header */}
        <div className="px-8 py-6 border-b border-gray-100">
          <h1 className="text-[17px] font-semibold text-gray-900">Registration Request</h1>
          <p className="text-[13px] text-gray-500 mt-1">
            Submit your laboratory/company details to join the PFE Internship Management System at ESST Alger.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-8 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Input
              label="Full Name"
              placeholder="e.g. Salim Amghar"
              {...register("name")}
              error={errors.name?.message}
            />
            <Input
              label="Email Address"
              type="email"
              placeholder="e.g. salim@example.com"
              {...register("email")}
              error={errors.email?.message}
            />

            <div className="w-full">
              <label className="admin-form-label">Account Role</label>
              <select
                {...register("role")}
                className="admin-input"
              >
                <option value="STUDENT">Student</option>
                <option value="COMPANY">Company Supervisor</option>
              </select>
            </div>

            {/* Role Specific Fields */}
            {selectedRole === "STUDENT" ? (
              <>
                <Input
                  label="Student ID (Matricule)"
                  placeholder="e.g. 21213500..."
                  {...register("studentId")}
                  error={errors.studentId?.message}
                />
                <Input
                  label="Promotion/Level"
                  placeholder="e.g. M2 Génie Logiciel"
                  {...register("promotion")}
                  error={errors.promotion?.message}
                />
                <Input
                  label="Speciality"
                  placeholder="e.g. Computer Science"
                  {...register("speciality")}
                  error={errors.speciality?.message}
                />
                <Input
                  label="Academic Year"
                  placeholder="2024-2025"
                  {...register("academicYear")}
                  error={errors.academicYear?.message}
                />
              </>
            ) : (
              <>
                <Input
                  label="Company Name"
                  placeholder="e.g. Sonatrach"
                  {...register("companyName")}
                  error={errors.companyName?.message}
                />
                <Input
                  label="Industry Sector"
                  placeholder="e.g. Energy, IT, Telecom"
                  {...register("sector")}
                  error={errors.sector?.message}
                />
                <Input
                  label="Wilaya"
                  placeholder="e.g. Algiers"
                  {...register("wilaya")}
                  error={errors.wilaya?.message}
                />
              </>
            )}
          </div>

          <div className="w-full">
            <label className="admin-form-label">Motivation / Extra Info</label>
            <textarea
              {...register("motivation")}
              rows={3}
              className="admin-input h-auto py-2"
              placeholder="Describe your project or reason for joining..."
            />
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-gray-100">
            <Link href="/login" className="text-[13px] text-indigo-600 hover:text-indigo-700 font-medium">
              Already have an account? Login here
            </Link>
            <Button type="submit" isLoading={isLoading}>
              Submit Registration Request
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
