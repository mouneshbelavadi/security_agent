import React from "react";

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string | null;
  helperText?: string;
  options?: SelectOption[];
  placeholder?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      className = "",
      id,
      label,
      error,
      helperText,
      options = [],
      placeholder,
      disabled,
      required,
      children,
      ...props
    },
    ref
  ) => {
    const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);
    const errorId = selectId ? `${selectId}-error` : undefined;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={selectId}
            className="block text-base font-semibold text-ink mb-1.5"
          >
            {label}
            {required && <span className="text-danger ml-1" aria-hidden="true">*</span>}
          </label>
        )}

        <select
          ref={ref}
          id={selectId}
          disabled={disabled}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          className={`block w-full px-3.5 py-3 border rounded text-base text-ink bg-surface transition-colors duration-150 focus:border-accent disabled:bg-slate-100 disabled:cursor-not-allowed ${
            error ? "border-danger focus:border-danger" : "border-border"
          } ${className}`}
          {...props}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
          {children}
        </select>

        {error && (
          <p id={errorId} className="mt-1.5 text-sm font-medium text-danger" role="alert">
            {error}
          </p>
        )}

        {!error && helperText && (
          <p className="mt-1.5 text-sm text-ink-subtle">{helperText}</p>
        )}
      </div>
    );
  }
);

Select.displayName = "Select";
