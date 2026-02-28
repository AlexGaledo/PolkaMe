import type { ReactNode, ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger";
type Size = "sm" | "md" | "lg" | "xl";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: string;            // Material Symbols icon name
  iconRight?: string;
  children: ReactNode;
  fullWidth?: boolean;
}

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-primary text-white hover:bg-primary/90 shadow-lg shadow-primary/20",
  secondary:
    "bg-white/5 border border-white/10 text-white hover:bg-white/10",
  outline:
    "bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20",
  ghost:
    "text-slate-300 hover:text-primary hover:bg-primary/5",
  danger:
    "bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20",
};

const sizeClasses: Record<Size, string> = {
  sm: "h-9 px-4 text-xs",
  md: "h-11 px-6 text-sm",
  lg: "h-14 px-8 text-lg",
  xl: "h-16 px-12 text-xl",
};

export default function Button({
  variant = "primary",
  size = "md",
  icon,
  iconRight,
  children,
  fullWidth,
  className = "",
  ...rest
}: ButtonProps) {
  return (
    <button
      className={`
        inline-flex items-center justify-center gap-2
        font-bold rounded-xl
        transition-all duration-200 ease-out
        hover:scale-[1.03] active:scale-[0.97]
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${fullWidth ? "w-full" : ""}
        ${className}
      `}
      {...rest}
    >
      {icon && <span className="material-symbols-outlined">{icon}</span>}
      {children}
      {iconRight && (
        <span className="material-symbols-outlined text-sm">{iconRight}</span>
      )}
    </button>
  );
}
