"use client";

import React, { useState } from "react";
import { signIn } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { toast } from "sonner";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ShieldCheck, ArrowLeft } from "lucide-react";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginInput = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  const { register, handleSubmit, formState: { errors } } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });
  const [authError, setAuthError] = useState<string | null>(null);

  const onSubmit = async (data: LoginInput) => {
    setIsLoading(true);
    setAuthError(null);
    try {
      const result = await signIn("credentials", {
        ...data,
        redirect: false,
      });

      if (result?.error) {
        setAuthError("Invalid email or password. Please verify your credentials and try again.");
        return;
      }

      toast.success("Logged in successfully");
      router.refresh(); // Middleware will redirect based on role
    } catch (error: any) {
      toast.error("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-[400px]">
        {/* Branding header */}
        <div className="text-center mb-8">
          <div className="h-12 w-12 bg-indigo-600 rounded-md mx-auto mb-4 flex items-center justify-center shadow-sm">
            <ShieldCheck className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-[17px] font-semibold text-gray-900 uppercase tracking-tight">ESST</h1>
          <p className="text-[11px] text-gray-400 uppercase tracking-widest font-medium mt-1">PFE Management System</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-md p-8 shadow-sm">
          <h2 className="text-[15px] font-medium text-gray-900 mb-6">Account Login</h2>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border-l-2 border-red-600 text-[11px] text-red-700 font-medium rounded-r">
              Session error: {error}
            </div>
          )}

          {authError && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-[13px] text-red-700 font-medium rounded-lg flex items-center gap-3 animate-in fade-in slide-in-from-top-1">
              <div className="h-2 w-2 bg-red-500 rounded-full animate-pulse flex-shrink-0" />
              {authError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <Input
              label="University Email"
              type="email"
              placeholder="e.g. salim@example.com"
              {...register("email")}
              error={errors.email?.message}
            />

            <div className="space-y-1">
              <div className="flex justify-between">
                <label className="admin-form-label" htmlFor="password">Password</label>
                <Link href="/forgot-password" title="Recover account" className="text-[11px] text-indigo-600 hover:text-indigo-700">
                  Forgot?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                {...register("password")}
                error={errors.password?.message}
              />
            </div>

            <Button type="submit" className="w-full" isLoading={isLoading} size="lg">
              Sign In
            </Button>

            <Link
              href="/"
              className="flex items-center justify-center gap-2 w-full py-2 text-[13px] text-gray-500 hover:text-indigo-600 font-medium transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Welcome Page
            </Link>
          </form>

          <div className="mt-8 pt-6 border-t border-gray-100 text-center">
            <p className="text-[13px] text-gray-500">
              Don't have an account?{" "}
              <Link href="/register" className="text-indigo-600 font-medium hover:text-indigo-700">
                Register request
              </Link>
            </p>
          </div>
        </div>

        <p className="text-center text-[10px] text-gray-400 mt-8 uppercase tracking-[0.2em] font-medium">
          Official University Administrative Portal
        </p>
      </div>
    </div>
  );
}
