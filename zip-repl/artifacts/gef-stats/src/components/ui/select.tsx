import * as React from "react"

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  options: { label: string; value: string | number }[];
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, options, ...props }, ref) => {
    const hasBlankOption = options.some(o => o.value === "" || o.value === 0);
    return (
      <select
        ref={ref}
        className={`flex h-10 w-full items-center justify-between rounded-md border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
        {...props}
      >
        {!hasBlankOption && <option value="" disabled>Select an option</option>}
        {options.map((opt, idx) => (
          <option key={`${opt.value}-${idx}`} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    )
  }
)
Select.displayName = "Select"

export { Select }
