"use client";

import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, isPast } from "date-fns";
import { Bell, Plus, Trash2, Calendar, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { toast } from "sonner";

interface SystemDeadline {
  id: string;
  label: string;
  dueDate: string;
  isActive: boolean;
  createdAt: string;
}

const deadlineSchema = z.object({
  label: z.string().min(3, "Label must be at least 3 characters"),
  dueDate: z.string().min(1, "Due date is required"),
  isActive: z.boolean(),
});

type DeadlineForm = z.infer<typeof deadlineSchema>;

export default function SystemDeadlinesPage() {
  const [deadlines, setDeadlines] = useState<SystemDeadline[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<DeadlineForm>({
    resolver: zodResolver(deadlineSchema) as any,
    defaultValues: { label: "", dueDate: "", isActive: true },
  });

  const fetchDeadlines = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/system-deadlines");
      const data = await res.json();
      setDeadlines(data.data || []);
    } catch {
      toast.error("Failed to load deadlines");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchDeadlines(); }, []);

  const onSubmit = async (data: DeadlineForm) => {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/system-deadlines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          dueDate: new Date(data.dueDate).toISOString(),
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      toast.success("Deadline announcement created.");
      reset();
      setShowForm(false);
      fetchDeadlines();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[17px] font-semibold text-gray-900 flex items-center gap-2">
            <Bell className="h-5 w-5 text-indigo-600" />
            System Deadlines
          </h1>
          <p className="text-[13px] text-gray-500 mt-0.5">
            Announce university-wide deadlines visible to all users.
          </p>
        </div>
        <Button size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4 mr-1.5" />
          New Deadline
        </Button>
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="bg-white border border-indigo-200 rounded-lg p-6 shadow-sm space-y-4">
          <h2 className="text-[13px] font-semibold text-gray-800">
            Create Deadline Announcement
          </h2>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="Label *"
              placeholder="e.g. Final Report Submission Deadline"
              {...register("label")}
              error={errors.label?.message}
            />
            <Input
              label="Due Date *"
              type="datetime-local"
              {...register("dueDate")}
              error={errors.dueDate?.message}
            />
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                {...register("isActive")}
                className="accent-indigo-600"
              />
              <label htmlFor="isActive" className="text-[13px] text-gray-600">
                Active (visible to all users)
              </label>
            </div>
            <div className="flex gap-3">
              <Button type="submit" size="sm" isLoading={isSubmitting}>
                Create Announcement
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => { setShowForm(false); reset(); }}
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Deadlines List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="text-center py-10 text-gray-400 text-[13px]">Loading…</div>
        ) : deadlines.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-lg p-10 text-center text-[13px] text-gray-400">
            No active system deadlines. Create one above.
          </div>
        ) : (
          deadlines.map((d) => {
            const due = new Date(d.dueDate);
            const overdue = isPast(due);
            return (
              <div
                key={d.id}
                className={`bg-white border rounded-lg px-5 py-4 shadow-sm flex items-center justify-between ${
                  overdue ? "border-red-200 opacity-60" : "border-gray-200"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`mt-0.5 h-7 w-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                      overdue ? "bg-red-100" : "bg-indigo-100"
                    }`}
                  >
                    <Calendar
                      className={`h-4 w-4 ${overdue ? "text-red-600" : "text-indigo-600"}`}
                    />
                  </div>
                  <div>
                    <p className="text-[14px] font-semibold text-gray-900">{d.label}</p>
                    <p
                      className={`text-[12px] mt-0.5 ${
                        overdue ? "text-red-500 font-medium" : "text-gray-500"
                      }`}
                    >
                      {overdue ? "⚠ Overdue — " : "Due: "}
                      {format(due, "EEEE, MMMM d, yyyy · HH:mm")}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[11px] px-2 py-0.5 rounded font-semibold uppercase ${
                      d.isActive
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {d.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
