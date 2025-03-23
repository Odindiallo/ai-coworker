import { forwardRef } from "react";
import { cn } from "../../lib/utils";

interface ProgressProps
  extends React.HTMLAttributes<HTMLDivElement> {
  value?: number;
  max?: number;
  label?: string;
  showValue?: boolean;
}

const Progress = forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value = 0, max = 100, label, showValue = false, ...props }, ref) => {
    // Calculate the percentage completion
    const percentage = max > 0 ? (value / max) * 100 : 0;
    
    return (
      <div
        className={cn("w-full space-y-2", className)}
        ref={ref}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={value}
        {...props}
      >
        {label && <div className="text-sm font-medium text-gray-700">{label}</div>}
        <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
          <div
            className="h-full rounded-full bg-primary-600 transition-all"
            style={{ width: `${Math.max(0, Math.min(percentage, 100))}%` }}
          />
        </div>
        {showValue && (
          <div className="text-xs text-gray-500 text-right">
            {Math.round(percentage)}%
          </div>
        )}
      </div>
    );
  }
);
Progress.displayName = "Progress";

export { Progress };