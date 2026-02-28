import type { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  hoverable?: boolean;
  padding?: "none" | "sm" | "md" | "lg";
}

const paddingMap = {
  none: "",
  sm: "p-4",
  md: "p-6",
  lg: "p-8",
};

export default function Card({
  children,
  className = "",
  hoverable = false,
  padding = "md",
}: CardProps) {
  return (
    <div
      className={`
        rounded-xl border
        bg-white/5 border-white/10
        dark:bg-primary/5 dark:border-primary/20
        ${hoverable ? "hover:border-primary/50 hover-lift hover-glow cursor-pointer" : "transition-all duration-300"}
        ${paddingMap[padding]}
        ${className}
      `}
    >
      {children}
    </div>
  );
}
