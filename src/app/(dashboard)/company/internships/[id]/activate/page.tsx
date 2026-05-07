"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { toast } from "sonner";
import { Calendar, User, Mail, CheckCircle } from "lucide-react";
import { useTranslation } from "@/lib/i18n/LanguageContext";

const activateSchema = z.object({
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  technicalSupervisorName: z.string().min(2, "Supervisor name is required"),
  technicalSupervisorEmail: z.string().email("Invalid supervisor email"),
});

type ActivateFormData = z.infer<typeof activateSchema>;

export default function ActivateInternshipPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = React.use(params);
  const router = useRouter();
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ActivateFormData>({
    resolver: zodResolver(activateSchema),
  });

  const onSubmit = async (data: ActivateFormData) => {
    const start = new Date(data.startDate);
    const end = new Date(data.endDate);

    if (end <= start) {
      toast.error("End date must be after start date");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`/api/internships/${resolvedParams.id}/activate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startDate: start.toISOString(),
          endDate: end.toISOString(),
          technicalSupervisorName: data.technicalSupervisorName,
          technicalSupervisorEmail: data.technicalSupervisorEmail,
        }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Activation failed");

      toast.success("Internship activated! Deadlines have been automatically calculated.");
      router.push("/company/internships");
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Activation failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-[17px] font-semibold text-gray-900 flex items-center gap-2">
          <Calendar className="h-5 w-5 text-indigo-600" />
          {t("status.IN_PROGRESS")}
        </h1>
        <p className="text-[13px] text-gray-500 mt-1">
          Provide the official start/end dates and your technical supervisor's information.
          Deadlines will be automatically calculated based on the internship type.
        </p>
      </div>

      <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 text-[12px] text-indigo-800">
        <strong>PFE internships:</strong> A mid-term report deadline will be set at the halfway
        point. <strong>Normal internships:</strong> The mid-term report is optional — no
        deadline will be set for it.
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm space-y-5"
      >
        {/* Dates */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Start Date *"
            type="date"
            {...register("startDate")}
            error={errors.startDate?.message}
          />
          <Input
            label="End Date *"
            type="date"
            {...register("endDate")}
            error={errors.endDate?.message}
          />
        </div>

        {/* Technical supervisor */}
        <div className="border-t border-gray-100 pt-4">
          <h3 className="text-[12px] font-semibold text-gray-700 uppercase tracking-wider mb-4 flex items-center gap-2">
            <User className="h-4 w-4 text-gray-400" />
            Technical Supervisor at Your Company
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Full Name *"
              placeholder="e.g. Karim Hamidi"
              {...register("technicalSupervisorName")}
              error={errors.technicalSupervisorName?.message}
            />
            <Input
              label="Email *"
              type="email"
              placeholder="supervisor@company.dz"
              {...register("technicalSupervisorEmail")}
              error={errors.technicalSupervisorEmail?.message}
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <button
            type="button"
            onClick={() => router.back()}
            className="text-[13px] text-gray-500 hover:text-gray-700"
          >
            {t("common.cancel")}
          </button>
          <Button type="submit" isLoading={isLoading}>
            <CheckCircle className="h-4 w-4 mr-1.5" />
            {t("common.confirm")}
          </Button>
        </div>
      </form>
    </div>
  );
}
