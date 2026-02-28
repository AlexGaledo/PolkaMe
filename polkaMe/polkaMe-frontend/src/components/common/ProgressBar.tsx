interface ProgressBarProps {
  value: number;       // 0–100
  className?: string;
  size?: "sm" | "md";
  showLabel?: boolean;
}

export default function ProgressBar({
  value,
  className = "",
  size = "md",
  showLabel = false,
}: ProgressBarProps) {
  const h = size === "sm" ? "h-2" : "h-3";
  return (
    <div className={`w-full ${className}`}>
      {showLabel && (
        <div className="flex justify-between text-xs mb-1">
          <span className="text-text-muted">Progress</span>
          <span className="font-bold text-primary">{value}%</span>
        </div>
      )}
      <div className={`w-full bg-slate-200 dark:bg-primary/10 ${h} rounded-full overflow-hidden`}>
        <div
          className={`bg-primary ${h} rounded-full transition-all duration-700 ease-out`}
          style={{ width: `${Math.min(value, 100)}%` }}
        />
      </div>
    </div>
  );
}
