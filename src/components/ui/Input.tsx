import React, { useState } from "react";
import { Eye, EyeOff, LucideIcon } from "lucide-react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: LucideIcon;
  containerClassName?: string;
}

export interface SidebarProps {
  role: "STUDENT" | "TEACHER" | "COMPANY" | "ADMIN";
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, icon: Icon, className = "", containerClassName = "", type, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === "password";
    const inputType = isPassword ? (showPassword ? "text" : "password") : type;

    return (
      <div className={`w-full ${containerClassName}`}>
        {label && (
          <label className="admin-form-label" htmlFor={props.id}>
            {label}
          </label>
        )}
        <div className="relative">
          {Icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <Icon className="h-4 w-4" />
            </div>
          )}
          <input
            ref={ref}
            type={inputType}
            className={`admin-input ${Icon ? "pl-10" : ""} ${isPassword ? "pr-10" : ""} ${error ? "border-red-500 focus:ring-red-500/20 focus:border-red-500" : ""} ${className}`}
            onClick={(e) => {
              if (type === "date" || type === "time" || type === "datetime-local") {
                try {
                  (e.target as HTMLInputElement).showPicker?.();
                } catch (err) {
                  // Fallback for browsers that don't support showPicker on click yet
                }
              }
            }}
            {...props}
          />
          {isPassword && (
            <button
              type="button"
              onClick={() => setShowPassword((current) => !current)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              tabIndex={-1}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          )}
        </div>
        {error && <p className="admin-error">{error}</p>}
        {helperText && !error && (
          <p className="mt-1 text-[11px] text-gray-400">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
