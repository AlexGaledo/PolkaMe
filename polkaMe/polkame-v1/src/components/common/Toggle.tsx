interface ToggleProps {
  enabled: boolean;
  onChange: (val: boolean) => void;
  label?: string;
  description?: string;
}

export default function Toggle({
  enabled,
  onChange,
  label,
  description,
}: ToggleProps) {
  return (
    <div className="flex items-center justify-between p-4">
      {(label || description) && (
        <div>
          {label && <p className="text-sm font-bold">{label}</p>}
          {description && (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {description}
            </p>
          )}
        </div>
      )}
      <label className="relative inline-flex cursor-pointer items-center">
        <input
          type="checkbox"
          role="switch"
          className="sr-only peer"
          checked={enabled}
          onChange={() => onChange(!enabled)}
          title={label || "Toggle"}
        />
        <div
          className={`
            w-12 h-6 rounded-full p-1 transition-all duration-300
            ${enabled ? "bg-primary shadow-md shadow-primary/30" : "bg-slate-300 dark:bg-primary/20"}
          `}
        >
          <div
            className={`
              w-4 h-4 bg-white rounded-full transition-all duration-300 ease-out
              ${enabled ? "translate-x-6 scale-110" : "translate-x-0 scale-100"}
            `}
          />
        </div>
      </label>
    </div>
  );
}
