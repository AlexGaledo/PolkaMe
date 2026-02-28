interface IconProps {
  name: string;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
}

const sizeMap = {
  sm: "text-sm",
  md: "text-2xl",
  lg: "text-3xl",
  xl: "text-5xl",
};

export default function Icon({ name, className = "", size = "md" }: IconProps) {
  return (
    <span className={`material-symbols-outlined ${sizeMap[size]} ${className}`}>
      {name}
    </span>
  );
}
