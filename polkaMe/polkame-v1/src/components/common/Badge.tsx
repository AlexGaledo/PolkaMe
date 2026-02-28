import type { ReactNode } from "react";

type BadgeVariant = "success" | "warning" | "info" | "danger" | "primary" | "muted";

interface BadgeProps {
  variant?: BadgeVariant;
  children: ReactNode;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  success: "bg-emerald-500/10 text-emerald-500",
  warning: "bg-amber-100 dark:bg-amber-900/30 text-amber-600",
  info: "bg-blue-100 dark:bg-blue-900/30 text-blue-600",
  danger: "bg-red-500/10 text-red-500",
  primary: "bg-primary/10 text-primary border border-primary/20",
  muted: "bg-white/5 text-text-muted",
};

export default function Badge({
  variant = "primary",
  children,
  className = "",
}: BadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center gap-1
        px-2 py-0.5 rounded
        text-[10px] font-bold uppercase tracking-wider
        animate-scale-in
        ${variantClasses[variant]}
        ${className}
      `}
    >
      {children}
    </span>
  );
}
