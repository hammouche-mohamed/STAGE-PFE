"use client";

import React, { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className={`h-9 w-9 rounded-full bg-gray-100 dark:bg-gray-800 animate-pulse ${className}`} />
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={`h-9 w-9 rounded-full flex items-center justify-center transition-all duration-300 
        ${isDark 
          ? "bg-slate-800 text-amber-400 hover:bg-slate-700 shadow-[0_0_15px_rgba(251,191,36,0.1)]" 
          : "bg-gray-100 text-slate-600 hover:bg-gray-200 hover:text-indigo-600"
        } ${className}`}
      aria-label="Toggle Theme"
    >
      {isDark ? (
        <Sun className="h-[18px] w-[18px] transition-transform duration-500 hover:rotate-90" />
      ) : (
        <Moon className="h-[18px] w-[18px] transition-transform duration-500 hover:-rotate-12" />
      )}
    </button>
  );
}
