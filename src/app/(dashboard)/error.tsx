"use client";

import React, { useEffect } from "react";
import { AlertCircle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-6 bg-white border border-red-100 rounded-xl shadow-sm">
      <div className="h-16 w-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mb-6">
        <AlertCircle className="h-8 w-8" />
      </div>
      <h2 className="text-[19px] font-bold text-gray-900">Something went wrong</h2>
      <p className="text-[14px] text-gray-500 mt-2 max-w-sm mx-auto">
        We encountered an unexpected error. This has been logged and we'll look into it.
      </p>
      <div className="mt-8 flex gap-3">
        <Button onClick={() => reset()} variant="outline">
          <RotateCcw className="h-4 w-4 mr-2" /> Try again
        </Button>
        <Button onClick={() => window.location.href = "/"}>
          Return Home
        </Button>
      </div>
    </div>
  );
}
