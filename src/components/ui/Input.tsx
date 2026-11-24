import React from "react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string | null;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  tabular?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className = "",
      id,
      label,
      error,
      helperText,
      leftIcon,
      rightIcon,
      tabular = false,
      disabled,
      required,
      ...props
    },
    ref
  ) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);
    const errorId = inputId ? `${inputId}-error` : undefined;
    const helperId = inputId ? `${inputId}-helper` : undefined;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-base font-semibold text-ink mb-1.5"
          >
            {label}
            {required && <span className="text-danger ml-1" aria-hidden="true">*</span>}
          </label>
        )}

        <div className="relative">
          {leftIcon && (
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-ink-subtle">
              {leftIcon}
            </div>
          )}

          <input
            ref={ref}
            id={inputId}
            disabled={disabled}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? errorId : helperText ? helperId : undefined}
            className={`block w-full py-3 border rounded text-base text-ink placeholder-ink-subtle transition-colors duration-150 focus:border-accent disabled:bg-slate-100 disabled:cursor-not-allowed ${
              leftIcon ? "pl-11" : "pl-3.5"
            } ${rightIcon ? "pr-11" : "pr-3.5"} ${
              error ? "border-danger focus:border-danger" : "border-border"
            } ${tabular ? "tabular-nums font-mono" : ""} ${className}`}
            {...props}
          />

          {rightIcon && (
            <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-ink-subtle">
              {rightIcon}
            </div>
          )}
        </div>

        {error && (
          <p id={errorId} className="mt-1.5 text-sm font-medium text-danger" role="alert">
            {error}
          </p>
        )}

        {!error && helperText && (
          <p id={helperId} className="mt-1.5 text-sm text-ink-subtle">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
